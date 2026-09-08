// Quiz Service — 問題の準備・出題選択・回答記録を担当する
// 処理フロー（CLAUDE.md セクション3・24）：
//   Generator → Validator → PASSのみDB保存 → ユーザーへ表示
// FAILの問題は破棄する。ユーザーに表示してはいけない。

import { randomUUID } from "node:crypto";
import { desc, eq, inArray, sql } from "drizzle-orm";

import type { Question, QuizMode } from "../types/question";
import { db } from "../db";
import { answerHistory, questions, studySessions, type QuestionRow } from "../db/schema";
import {
  getQuestionById,
  getRecentQuestions,
  getRecentTargetVocabulary,
  insertQuestions,
} from "../db/queries/questions";
import { getDueVocabulary, getWeakVocabulary, listVocabulary } from "../db/queries/vocabulary";
import { generateQuestions } from "./ai/questionGenerator";
import { validateQuestion } from "./ai/questionValidator";
import { processQuizVocabulary } from "./vocabularyService";

// ---------------------------------------------------------------------------
// Row → Question 変換
// ---------------------------------------------------------------------------

export function rowToQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    sentence: row.sentence,
    choices: row.choices,
    correctChoice: row.correctChoice,
    translationJP: row.translationJP,
    explanationJP: row.explanationJP,
    choiceExplanations: row.choiceExplanations,
    vocabulary: row.vocabulary,
    grammar: row.grammar,
    collocations: row.collocations ?? undefined,
    level: "A2",
    difficulty: row.difficulty,
    category: row.category,
    targetVocabulary: row.targetVocabulary,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Generatorへ渡す重複防止コンテキスト（CLAUDE.md セクション9）
// ---------------------------------------------------------------------------

function buildGenerationContext(nowIso: string) {
  const recent = getRecentQuestions(50);
  const weakVocab = getWeakVocabulary(30).map((v) => v.vietnamese);
  const dueVocab = getDueVocabulary(nowIso, 30).map((v) => v.vietnamese);
  const mastered = listVocabulary("mastered").map((v) => v.vietnamese);

  return {
    previousQuestions: recent.map((q) => q.sentence),
    recentlyUsedVocabulary: getRecentTargetVocabulary(30),
    recentlyUsedGrammar: [
      ...new Set(recent.flatMap((q) => q.grammar.map((g) => g.pattern))),
    ].slice(0, 20),
    recentlyUsedTopics: [...new Set(recent.map((q) => q.category))].slice(0, 15),
    weakVocabulary: weakVocab,
    weakGrammar: [],
    masteredVocabulary: mastered,
    dueVocabulary: dueVocab,
  };
}

// ---------------------------------------------------------------------------
// 問題プールの補充：Generator → Validator → PASSのみ保存
// ---------------------------------------------------------------------------

async function replenishQuestionPool(
  mode: QuizMode,
  needed: number,
  nowIso: string,
): Promise<void> {
  if (needed <= 0) return;

  const allowSameTarget = mode === "review" || mode === "weakPoints";
  // FAIL分を見込んで少し多めに生成を試みる（最大2ラウンド）
  let remaining = needed;
  for (let round = 0; round < 2 && remaining > 0; round++) {
    const context = buildGenerationContext(nowIso);
    const generated = await generateQuestions({
      mode,
      count: remaining + 2,
      context,
    });
    if (generated.length === 0) break;

    const previousForDup = getRecentQuestions(200).map((q) => ({
      id: q.id,
      sentence: q.sentence,
      targetVocabulary: q.targetVocabulary,
    }));

    const passedRows = [];
    for (const candidate of generated) {
      const result = await validateQuestion({
        question: candidate,
        previousQuestions: previousForDup,
        allowSameTargetVocabulary: allowSameTarget,
      });
      // ValidatorがFAILを返した問題は破棄する（validator.md セクション29・30）
      if (result.status !== "PASS") continue;

      const id = randomUUID();
      passedRows.push({
        ...candidate,
        collocations: candidate.collocations ?? null,
        id,
        createdAt: nowIso,
      });
      previousForDup.push({
        id,
        sentence: candidate.sentence,
        targetVocabulary: candidate.targetVocabulary,
      });
      remaining--;
      if (remaining <= 0) break;
    }
    insertQuestions(passedRows);
  }
}

// ---------------------------------------------------------------------------
// 出題選択（CLAUDE.md セクション6・11）
// ---------------------------------------------------------------------------

type QuestionStats = {
  answerCount: number;
  correctCount: number;
  lastAnsweredAt: string | null;
};

function getAnswerStats(): Map<string, QuestionStats> {
  const rows = db
    .select({
      questionId: answerHistory.questionId,
      answerCount: sql<number>`count(*)`,
      correctCount: sql<number>`sum(case when ${answerHistory.isCorrect} then 1 else 0 end)`,
      lastAnsweredAt: sql<string>`max(${answerHistory.answeredAt})`,
    })
    .from(answerHistory)
    .groupBy(answerHistory.questionId)
    .all();

  const map = new Map<string, QuestionStats>();
  for (const row of rows) {
    map.set(row.questionId, {
      answerCount: row.answerCount,
      correctCount: row.correctCount,
      lastAnsweredAt: row.lastAnsweredAt,
    });
  }
  return map;
}

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function prepareQuiz(
  mode: QuizMode,
  count: number,
): Promise<Question[]> {
  const nowIso = new Date().toISOString();
  const stats = getAnswerStats();
  const all = db.select().from(questions).all();

  // New Modeで未出題問題が足りない場合、生成パイプラインで補充する
  const unansweredCount = all.filter((q) => !stats.has(q.id)).length;
  if (unansweredCount < count) {
    await replenishQuestionPool(mode, count - unansweredCount, nowIso);
  }

  const pool = db.select().from(questions).all();
  const freshStats = getAnswerStats();

  const unanswered = shuffle(pool.filter((q) => !freshStats.has(q.id)));
  const answered = shuffle(pool.filter((q) => freshStats.has(q.id)))
    // 最後に解いてから時間が経っている順
    .sort((a, b) =>
      (freshStats.get(a.id)?.lastAnsweredAt ?? "").localeCompare(
        freshStats.get(b.id)?.lastAnsweredAt ?? "",
      ),
    );

  const weakSet = new Set(
    getWeakVocabulary(100).map((v) => v.normalizedVietnamese),
  );
  const dueSet = new Set(
    getDueVocabulary(nowIso, 100).map((v) => v.normalizedVietnamese),
  );
  const isReviewTarget = (q: QuestionRow) => {
    const key = q.targetVocabulary.trim().toLocaleLowerCase("vi");
    return weakSet.has(key) || dueSet.has(key);
  };

  let selected: QuestionRow[];
  switch (mode) {
    case "new":
      // 未学習の問題を優先（CLAUDE.md セクション6）
      selected = [...unanswered, ...answered].slice(0, count);
      break;
    case "review":
    case "weakPoints": {
      // 間違えた語彙・あやふやな語彙・復習期限の語彙を優先（セクション6・11）
      const reviewTargets = [...unanswered, ...answered].filter(isReviewTarget);
      const others = [...unanswered, ...answered].filter(
        (q) => !isReviewTarget(q),
      );
      selected = [...reviewTargets, ...others].slice(0, count);
      break;
    }
    case "random":
    default: {
      // 新規と復習を混ぜる（目安 60% 新規 / 40% 復習 — generator.md セクション15）
      const reviewTargets = shuffle(
        [...unanswered, ...answered].filter(isReviewTarget),
      );
      const reviewCount = Math.min(
        reviewTargets.length,
        Math.floor(count * 0.4),
      );
      const reviewPicks = reviewTargets.slice(0, reviewCount);
      const pickedIds = new Set(reviewPicks.map((q) => q.id));
      const rest = [...unanswered, ...answered].filter(
        (q) => !pickedIds.has(q.id),
      );
      selected = shuffle([...reviewPicks, ...rest.slice(0, count - reviewCount)]);
      break;
    }
  }

  return selected.map(rowToQuestion);
}

// ---------------------------------------------------------------------------
// 回答の記録（CLAUDE.md セクション17・20）
// ---------------------------------------------------------------------------

export type RecordAnswerResult = {
  answerId: number;
  isCorrect: boolean;
  correctChoice: Question["correctChoice"];
};

export function recordAnswer(params: {
  questionId: string;
  selectedChoice: Question["correctChoice"];
  responseTimeSeconds: number;
}): RecordAnswerResult | undefined {
  const row = getQuestionById(params.questionId);
  if (!row) return undefined;

  const question = rowToQuestion(row);
  const isCorrect = question.correctChoice === params.selectedChoice;
  const nowIso = new Date().toISOString();

  const inserted = db
    .insert(answerHistory)
    .values({
      sessionId: null,
      questionId: question.id,
      selectedAnswer: params.selectedChoice,
      correctAnswer: question.correctChoice,
      isCorrect,
      responseTimeSeconds: params.responseTimeSeconds,
      answeredAt: nowIso,
    })
    .run();

  // 語彙の保存・status/SRS更新・混同記録（CLAUDE.md セクション17）
  const selectedChoiceText = question.choices.find(
    (c) => c.id === params.selectedChoice,
  )?.text;
  processQuizVocabulary({
    question,
    isCorrect,
    selectedChoiceText,
    nowIso,
  });

  return {
    answerId: Number(inserted.lastInsertRowid),
    isCorrect,
    correctChoice: question.correctChoice,
  };
}

// ---------------------------------------------------------------------------
// セッションの確定（CLAUDE.md セクション19）
// ---------------------------------------------------------------------------

export function finishQuizSession(params: {
  startedAtIso: string;
  answerIds: number[];
  studiedVocabulary: string[];
  wrongVocabulary: string[];
}): string {
  const nowIso = new Date().toISOString();
  const sessionId = randomUUID();

  const answers =
    params.answerIds.length > 0
      ? db
          .select()
          .from(answerHistory)
          .where(inArray(answerHistory.id, params.answerIds))
          .all()
      : [];

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const wrongCount = answers.length - correctCount;
  const studyTimeSeconds = Math.max(
    1,
    Math.round(
      (new Date(nowIso).getTime() - new Date(params.startedAtIso).getTime()) /
        1000,
    ),
  );

  db.insert(studySessions)
    .values({
      id: sessionId,
      startedAt: params.startedAtIso,
      finishedAt: nowIso,
      questionCount: answers.length,
      correctCount,
      wrongCount,
      accuracy: answers.length > 0 ? correctCount / answers.length : 0,
      studiedVocabulary: [...new Set(params.studiedVocabulary)],
      wrongVocabulary: [...new Set(params.wrongVocabulary)],
      studyTimeSeconds,
    })
    .run();

  if (params.answerIds.length > 0) {
    db.update(answerHistory)
      .set({ sessionId })
      .where(inArray(answerHistory.id, params.answerIds))
      .run();
  }

  return sessionId;
}

// 履歴ページ用
export function getSessionWithAnswers(sessionId: string) {
  const session = db
    .select()
    .from(studySessions)
    .where(eq(studySessions.id, sessionId))
    .get();
  if (!session) return undefined;
  const answers = db
    .select()
    .from(answerHistory)
    .where(eq(answerHistory.sessionId, sessionId))
    .orderBy(desc(answerHistory.answeredAt))
    .all();
  return { session, answers };
}
