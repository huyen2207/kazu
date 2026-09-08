// Question Generator — prompts/question-generator.md の仕様に従う
// ANTHROPIC_API_KEY があればClaude API、なければMock問題バンクから生成する。
// 生成結果は必ずValidatorを通してから保存すること（CLAUDE.md セクション3・24）。

import fs from "node:fs";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import type { GenerationContext, Question, QuizMode } from "../../types/question";
import { normalizeVietnamese } from "../../lib/vocabularyNormalizer";
import { MOCK_QUESTION_BANK, type MockQuestion } from "./mockQuestionBank";

export type GeneratedQuestion = Omit<Question, "id" | "createdAt">;

export type GeneratorInput = {
  mode: QuizMode;
  count: number;
  context: GenerationContext & { dueVocabulary?: string[] };
};

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function generateQuestions(
  input: GeneratorInput,
): Promise<GeneratedQuestion[]> {
  if (isAiEnabled()) {
    try {
      return await generateWithClaude(input);
    } catch (error) {
      console.error(
        "[questionGenerator] Claude API呼び出しに失敗。Mockにフォールバックします。",
        error,
      );
      return generateFromMockBank(input);
    }
  }
  return generateFromMockBank(input);
}

// ---------------------------------------------------------------------------
// Mock：問題バンクから未出題の問題を選ぶ
// ---------------------------------------------------------------------------

function generateFromMockBank(input: GeneratorInput): GeneratedQuestion[] {
  const { mode, count, context } = input;

  // 空欄プレースホルダを統一した比較キーで、出題済みの文を除外する
  const sentenceKey = (s: string) =>
    normalizeVietnamese(s.replace(/_{2,}/g, "___"));
  const usedSentences = new Set(
    context.previousQuestions.map((s) => sentenceKey(s)),
  );
  const unused = MOCK_QUESTION_BANK.filter(
    (q) => !usedSentences.has(sentenceKey(q.sentence)),
  );

  const weakSet = new Set(
    [...context.weakVocabulary, ...(context.dueVocabulary ?? [])].map((w) =>
      w.toLocaleLowerCase("vi"),
    ),
  );
  const masteredSet = new Set(
    context.masteredVocabulary.map((w) => w.toLocaleLowerCase("vi")),
  );
  const recentSet = new Set(
    context.recentlyUsedVocabulary.map((w) => w.toLocaleLowerCase("vi")),
  );

  const isWeak = (q: MockQuestion) =>
    weakSet.has(q.targetVocabulary.toLocaleLowerCase("vi"));
  const isRecent = (q: MockQuestion) =>
    recentSet.has(q.targetVocabulary.toLocaleLowerCase("vi"));
  const isMastered = (q: MockQuestion) =>
    masteredSet.has(q.targetVocabulary.toLocaleLowerCase("vi"));

  let prioritized: MockQuestion[];
  switch (mode) {
    case "review":
    case "weakPoints": {
      // 弱点語彙を狙う問題を優先（generator.md セクション14）
      const weak = shuffle(unused.filter(isWeak));
      const rest = shuffle(unused.filter((q) => !isWeak(q)));
      prioritized = [...weak, ...rest];
      break;
    }
    case "new": {
      // 最近使った語彙・mastered語彙は後回し（generator.md セクション13）
      const fresh = shuffle(
        unused.filter((q) => !isRecent(q) && !isMastered(q)),
      );
      const rest = shuffle(unused.filter((q) => isRecent(q) || isMastered(q)));
      prioritized = [...fresh, ...rest];
      break;
    }
    case "random":
    default: {
      // 目安：60%新規・40%復習系（generator.md セクション15）
      const weak = shuffle(unused.filter(isWeak));
      const fresh = shuffle(unused.filter((q) => !isWeak(q)));
      const reviewCount = Math.min(weak.length, Math.ceil(count * 0.4));
      prioritized = [
        ...weak.slice(0, reviewCount),
        ...fresh,
        ...weak.slice(reviewCount),
      ];
      break;
    }
  }

  return prioritized.slice(0, count);
}

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ---------------------------------------------------------------------------
// Claude API：prompts/question-generator.md をシステムプロンプトとして使用
// ---------------------------------------------------------------------------

const client = new Anthropic();

function readPrompt(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), "prompts", name), "utf-8");
}

async function generateWithClaude(
  input: GeneratorInput,
): Promise<GeneratedQuestion[]> {
  const systemPrompt = readPrompt("question-generator.md");

  const userPayload = {
    mode: input.mode,
    count: input.count,
    previousQuestions: input.context.previousQuestions.slice(0, 50),
    recentlyUsedVocabulary: input.context.recentlyUsedVocabulary,
    recentlyUsedGrammar: input.context.recentlyUsedGrammar,
    recentlyUsedTopics: input.context.recentlyUsedTopics,
    weakVocabulary: input.context.weakVocabulary,
    weakGrammar: input.context.weakGrammar,
    masteredVocabulary: input.context.masteredVocabulary,
    dueVocabulary: input.context.dueVocabulary ?? [],
  };

  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 64000,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `次の条件で問題を${input.count}問生成してください。OUTPUT SCHEMAに従い、JSONのみを返してください。\n\n${JSON.stringify(userPayload, null, 2)}`,
      },
    ],
  });
  const response = await stream.finalMessage();

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed = JSON.parse(extractJson(text)) as {
    questions: GeneratedQuestion[];
  };

  return parsed.questions.slice(0, input.count);
}

// モデルがコードフェンス付きで返した場合にも対応する
function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw new Error("GeneratorのレスポンスからJSONを抽出できませんでした");
}
