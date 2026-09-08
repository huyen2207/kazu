// 回答イベント → 語彙状態の決定論的な更新
// prompts/vocabulary-manager.md セクション9～14・18参照
//
// Quiz回答・Flash Card評価を受け取り、カウント・status・masteryScore・
// 次回復習日・優先度をまとめて更新する純粋関数。DB書き込みはservices側で行う。

import type { VocabularyStatus } from "../types/vocabulary";
import {
  applyMasteryEvent,
  meetsMasteredCondition,
  type MasteryEvent,
} from "./masteryScore";
import { calculateReviewPriority, getNextReviewAt, isSameDay } from "./srs";

export type VocabularyProgressState = {
  status: VocabularyStatus;
  masteryScore: number;

  quizCorrectCount: number;
  quizWrongCount: number;
  flashcardCorrectCount: number;
  flashcardWrongCount: number;

  consecutiveCorrect: number;
  consecutiveWrong: number;

  level: "A1" | "A2";

  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;

  /** 正しく復習できた異なる日の数（mastered判定用） */
  distinctCorrectReviewDays: number;
  /** 今日すでに復習した回数（同日ボーナス減衰用） */
  sameDayReviewCount: number;
};

export type ProgressEvent =
  | { type: "quiz"; isCorrect: boolean }
  | { type: "flashcard"; rating: "forgotten" | "unsure" | "remembered" };

export type VocabularyProgressUpdate = {
  status: VocabularyStatus;
  masteryScore: number;
  quizCorrectCount: number;
  quizWrongCount: number;
  flashcardCorrectCount: number;
  flashcardWrongCount: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  lastReviewedAt: string;
  nextReviewAt: string;
  reviewPriority: number;
};

function toMasteryEvent(event: ProgressEvent): MasteryEvent {
  if (event.type === "quiz") {
    return event.isCorrect ? "quiz_correct" : "quiz_wrong";
  }
  switch (event.rating) {
    case "remembered":
      return "flashcard_remembered";
    case "unsure":
      return "flashcard_unsure";
    case "forgotten":
      return "flashcard_forgotten";
  }
}

function isCorrectEvent(event: ProgressEvent): boolean {
  return event.type === "quiz"
    ? event.isCorrect
    : event.rating === "remembered";
}

/**
 * 回答イベントを適用し、更新後の語彙状態を返す。
 *
 * ステータス遷移ルール：
 * - Quiz不正解 / Flash Card「覚えていない」→ forgotten（セクション9・12）
 * - Flash Card「あやふや」→ unsure（セクション13）
 * - 正解時：mastered条件（セクション18）を満たせばmastered、
 *   それ以外はreviewing（一度の正解でmasteredにしない — セクション10・11・14）
 * - mastered語彙が間違えた場合はreviewing/forgottenへ戻す（セクション19）
 */
export function applyProgressEvent(
  state: VocabularyProgressState,
  event: ProgressEvent,
  nowIso: string,
): VocabularyProgressUpdate {
  const correct = isCorrectEvent(event);

  // --- カウント更新（セクション9・10・12・14） ---
  let {
    quizCorrectCount,
    quizWrongCount,
    flashcardCorrectCount,
    flashcardWrongCount,
    consecutiveCorrect,
    consecutiveWrong,
  } = state;

  if (event.type === "quiz") {
    if (event.isCorrect) quizCorrectCount += 1;
    else quizWrongCount += 1;
  } else {
    if (event.rating === "remembered") flashcardCorrectCount += 1;
    if (event.rating === "forgotten") flashcardWrongCount += 1;
  }

  if (correct) {
    consecutiveCorrect += 1;
    consecutiveWrong = 0;
  } else if (event.type === "quiz" || event.rating === "forgotten") {
    consecutiveWrong += 1;
    consecutiveCorrect = 0;
  }
  // 「あやふや」は連続カウントをリセットしない（明確な不正解ではないため）

  // --- masteryScore更新（セクション15～17） ---
  const isSpacedReview =
    !!state.lastReviewedAt && !isSameDay(state.lastReviewedAt, nowIso);

  const masteryScore = applyMasteryEvent(
    state.masteryScore,
    toMasteryEvent(event),
    {
      isSpacedReview,
      sameDayReviewCount: state.sameDayReviewCount,
    },
  );

  // --- ステータス遷移 ---
  let status: VocabularyStatus;

  if (!correct && (event.type === "quiz" || event.rating === "forgotten")) {
    // 間違い：masteredからでもforgotten/reviewingへ戻す（セクション9・19）
    status = state.status === "mastered" ? "reviewing" : "forgotten";
  } else if (event.type === "flashcard" && event.rating === "unsure") {
    status = "unsure";
  } else {
    // 正解：mastered条件を再評価（セクション11・14・18）
    const distinctDays =
      state.distinctCorrectReviewDays + (isSpacedReview || !state.lastReviewedAt ? 1 : 0);

    status = meetsMasteredCondition({
      masteryScore,
      consecutiveCorrect,
      distinctCorrectReviewDays: distinctDays,
      quizCorrectCount,
    })
      ? "mastered"
      : state.status === "new"
        ? "learning"
        : "reviewing";
  }

  // --- 次回復習日・優先度（セクション20～24） ---
  const nextReviewAt = getNextReviewAt(nowIso, status, consecutiveCorrect);

  const reviewPriority = calculateReviewPriority(
    {
      status,
      masteryScore,
      quizWrongCount,
      consecutiveCorrect,
      consecutiveWrong,
      level: state.level,
      nextReviewAt,
      lastReviewedAt: nowIso,
    },
    nowIso,
  );

  return {
    status,
    masteryScore,
    quizCorrectCount,
    quizWrongCount,
    flashcardCorrectCount,
    flashcardWrongCount,
    consecutiveCorrect,
    consecutiveWrong,
    lastReviewedAt: nowIso,
    nextReviewAt,
    reviewPriority,
  };
}
