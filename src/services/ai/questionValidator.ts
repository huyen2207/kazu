// Question Validator — prompts/question-validator.md の仕様に従う
// PASSした問題のみDBへ保存する。FAILは破棄してGeneratorへ戻す（CLAUDE.md セクション3・24）。
// ANTHROPIC_API_KEY があればClaude APIで内容検証、なければ決定論的な構造検証を行う。

import fs from "node:fs";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import type { ValidationIssue, ValidationResult } from "../../types/question";
import { checkDuplicate } from "../../lib/duplicateDetector";
import type { GeneratedQuestion } from "./questionGenerator";
import { isAiEnabled } from "./questionGenerator";

export type ValidatorInput = {
  question: GeneratedQuestion;
  previousQuestions: {
    id: string;
    sentence: string;
    targetVocabulary: string;
  }[];
  // Review Modeでは同じtargetVocabularyの再利用を許可（validator.md セクション19）
  allowSameTargetVocabulary?: boolean;
};

export async function validateQuestion(
  input: ValidatorInput,
): Promise<ValidationResult> {
  // 構造チェックはAI有無に関わらず必ず行う
  const structural = validateStructure(input);
  if (structural.status === "FAIL") return structural;

  if (isAiEnabled()) {
    try {
      return await validateWithClaude(input);
    } catch (error) {
      console.error(
        "[questionValidator] Claude API呼び出しに失敗。構造検証結果を使用します。",
        error,
      );
      return structural;
    }
  }
  return structural;
}

// ---------------------------------------------------------------------------
// 決定論的な構造検証（Mock時のメイン検証）
// ---------------------------------------------------------------------------

function validateStructure(input: ValidatorInput): ValidationResult {
  const { question } = input;
  const issues: ValidationIssue[] = [];

  const checks = {
    naturalVietnamese: true,
    singleCorrectAnswer: true,
    appropriateLevel: true,
    goodDistractors: true,
    enoughContext: true,
    translationCorrect: true,
    explanationCorrect: true,
    vocabularyCorrect: true,
    grammarCorrect: true,
    duplicate: false,
  };

  const fail = (
    severity: ValidationIssue["severity"],
    type: string,
    messageJP: string,
    check?: keyof typeof checks,
  ) => {
    issues.push({ severity, type, messageJP });
    if (check && check !== "duplicate") checks[check] = false;
    if (check === "duplicate") checks.duplicate = true;
  };

  // 選択肢の構造
  const choiceIds = question.choices.map((c) => c.id).sort().join("");
  if (question.choices.length !== 4 || choiceIds !== "ABCD") {
    fail("critical", "invalid_choices", "選択肢はA/B/C/Dの4つ必要です。");
  }
  const texts = question.choices.map((c) => c.text.trim());
  if (new Set(texts.map((t) => t.toLocaleLowerCase("vi"))).size !== 4) {
    fail(
      "critical",
      "duplicate_choices",
      "選択肢に重複があります。",
      "singleCorrectAnswer",
    );
  }

  // 正解の整合性
  const correct = question.choices.find((c) => c.id === question.correctChoice);
  if (!correct) {
    fail("critical", "invalid_correct_choice", "correctChoiceが選択肢に存在しません。");
  } else if (
    correct.text.trim().toLocaleLowerCase("vi") !==
    question.targetVocabulary.trim().toLocaleLowerCase("vi")
  ) {
    fail(
      "critical",
      "target_mismatch",
      "targetVocabularyが正解の選択肢と一致していません。",
      "explanationCorrect",
    );
  }

  // 空欄の存在（文脈チェックの最低条件）
  if (!/_{2,}/.test(question.sentence)) {
    fail("critical", "no_blank", "問題文に空欄（______）がありません。", "enoughContext");
  }
  // 文脈の最低限の長さ（validator.md セクション6：文脈不足）
  if (question.sentence.replace(/_{2,}/g, "").trim().split(/\s+/).length < 6) {
    fail("major", "short_context", "文脈が不足しています。文を長くしてください。", "enoughContext");
  }

  // 解説の存在
  if (!question.translationJP.trim()) {
    fail("critical", "missing_translation", "日本語訳がありません。", "translationCorrect");
  }
  if (!question.explanationJP.trim()) {
    fail("critical", "missing_explanation", "解説がありません。", "explanationCorrect");
  }
  const explained = new Set(
    question.choiceExplanations
      .filter((e) => e.explanationJP.trim())
      .map((e) => e.choice),
  );
  if (explained.size !== 4) {
    fail(
      "major",
      "missing_choice_explanations",
      "A/B/C/Dすべての選択肢に解説が必要です。",
      "explanationCorrect",
    );
  }

  // 語彙抽出（generator.md セクション19：2～5個程度）
  if (question.vocabulary.length < 1) {
    fail("major", "missing_vocabulary", "重要語彙がありません。", "vocabularyCorrect");
  }

  // レベル
  if (question.level !== "A2") {
    fail("major", "invalid_level", "levelはA2である必要があります。", "appropriateLevel");
  }

  // 重複チェック（validator.md セクション16～19）
  const dup = checkDuplicate(
    {
      sentence: question.sentence,
      targetVocabulary: question.targetVocabulary,
    },
    input.previousQuestions,
    { allowSameTarget: input.allowSameTargetVocabulary },
  );
  if (dup.isDuplicate) {
    fail(
      "critical",
      dup.reason ?? "near_duplicate",
      dup.reason === "exact_match"
        ? "過去の問題と同一です。"
        : "過去の問題とほぼ同じ内容（準重複）です。",
      "duplicate",
    );
  }

  const hasCritical = issues.some((i) => i.severity === "critical");
  const hasMajor = issues.some((i) => i.severity === "major");
  const score = computeScore(checks, issues);

  return {
    // PASS条件：90点以上 かつ critical=0 かつ major=0（validator.md セクション24）
    status: !hasCritical && !hasMajor && score >= 90 ? "PASS" : "FAIL",
    score,
    issues,
    checks,
  };
}

// validator.md セクション25の配点に基づく減点方式
function computeScore(
  checks: ValidationResult["checks"],
  issues: ValidationIssue[],
): number {
  let score = 100;
  if (!checks.singleCorrectAnswer) score -= 25;
  if (!checks.naturalVietnamese) score -= 20;
  if (!checks.appropriateLevel) score -= 15;
  if (!checks.goodDistractors) score -= 10;
  if (!checks.enoughContext) score -= 10;
  if (!checks.explanationCorrect || !checks.translationCorrect) score -= 10;
  if (!checks.vocabularyCorrect || !checks.grammarCorrect) score -= 5;
  if (checks.duplicate) score -= 5;
  // criticalは追加減点（使用不可レベルへ）
  score -= issues.filter((i) => i.severity === "critical").length * 15;
  return Math.max(0, score);
}

// ---------------------------------------------------------------------------
// Claude APIによる内容検証
// ---------------------------------------------------------------------------

const client = new Anthropic();

async function validateWithClaude(
  input: ValidatorInput,
): Promise<ValidationResult> {
  const systemPrompt = fs.readFileSync(
    path.join(process.cwd(), "prompts", "question-validator.md"),
    "utf-8",
  );

  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: [
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: JSON.stringify(
          {
            question: input.question,
            previousQuestions: input.previousQuestions
              .slice(0, 30)
              .map((q) => q.sentence),
            reviewMode: input.allowSameTargetVocabulary ?? false,
          },
          null,
          2,
        ),
      },
    ],
  });
  const response = await stream.finalMessage();

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  const result = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as ValidationResult;

  // 迷った場合はFAIL（validator.md セクション30）
  if (result.status !== "PASS" && result.status !== "FAIL") {
    return { ...result, status: "FAIL" };
  }
  return result;
}
