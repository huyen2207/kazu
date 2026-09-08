// 簡易Spaced Repetition — prompts/vocabulary-manager.md セクション19～26参照
//
// 復習間隔・次回復習日・復習優先度の計算はすべてこのモジュールで行う（セクション54）。

import type { VocabularyStatus } from "../types/vocabulary";

// ---------------------------------------------------------------------------
// 日付ユーティリティ（ISO文字列ベース）
// ---------------------------------------------------------------------------

export function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/** 2つの日時が（ローカルではなくUTC基準で）同じ日か */
export function isSameDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

/** aからbまでの経過日数（日付部分の差、b >= a なら正） */
export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA.slice(0, 10)).getTime();
  const b = new Date(isoB.slice(0, 10)).getTime();
  return Math.round((b - a) / 86_400_000);
}

// ---------------------------------------------------------------------------
// 復習間隔（セクション20・21）
// ---------------------------------------------------------------------------

// 連続正解による間隔ラダー：1日 → 3日 → 7日 → 14日 → 30日
const INTERVAL_LADDER = [1, 3, 7, 14, 30] as const;

function ladderDays(consecutiveCorrect: number): number {
  const step = Math.max(1, Math.min(consecutiveCorrect, INTERVAL_LADDER.length));
  return INTERVAL_LADDER[step - 1];
}

/**
 * 次回復習までの日数を計算する。
 *
 * ステータスごとの初期間隔（セクション20）を基本とし、
 * 連続正解が多いほど間隔を伸ばす（セクション21）。
 * 間違い直後のステータス（forgotten）は必ず短い間隔になる。
 */
export function getNextIntervalDays(
  status: VocabularyStatus,
  consecutiveCorrect: number,
): number {
  switch (status) {
    case "forgotten":
      // できるだけ早く再復習（0～1日）
      return 1;
    case "new":
      // 初回学習後1日以内
      return 1;
    case "unsure":
      // 1～3日
      return Math.min(3, Math.max(1, ladderDays(consecutiveCorrect)));
    case "learning":
      // 2～4日
      return Math.min(4, Math.max(2, ladderDays(consecutiveCorrect)));
    case "reviewing":
      // 3～7日
      return Math.min(7, Math.max(3, ladderDays(consecutiveCorrect)));
    case "mastered":
      // 14～30日（長期間隔で低頻度に再確認 — セクション19）
      return Math.min(30, Math.max(14, ladderDays(consecutiveCorrect)));
  }
}

/** 次回復習日時（ISO）を計算する */
export function getNextReviewAt(
  nowIso: string,
  status: VocabularyStatus,
  consecutiveCorrect: number,
): string {
  return addDays(nowIso, getNextIntervalDays(status, consecutiveCorrect));
}

// ---------------------------------------------------------------------------
// 復習優先度 0～100（セクション22～24）
// ---------------------------------------------------------------------------

export type ReviewPriorityInput = {
  status: VocabularyStatus;
  masteryScore: number;
  quizWrongCount: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  level: "A1" | "A2";
  nextReviewAt?: string | null;
  lastReviewedAt?: string | null;
  /** 日本人が混同しやすい重要語彙か（confusion groupに属するなど） */
  isConfusionProne?: boolean;
};

/**
 * 復習優先度を計算する。高いほど今日復習すべき。
 * 決定論的なルールベース：
 *
 * 上げる要因（セクション23）：
 * - nextReviewAtを過ぎている（超過日数に応じて最大+25）
 * - 直近で間違えている（consecutiveWrong）
 * - 複数回間違えた（quizWrongCount >= 2）
 * - masteryScoreが低い
 * - forgotten / unsure状態
 * - 混同しやすい重要語彙
 *
 * 下げる要因（セクション24）：
 * - mastered
 * - 連続正解が続いている
 * - 今日すでに復習した
 * - A1の超基本語彙
 */
export function calculateReviewPriority(
  input: ReviewPriorityInput,
  nowIso: string,
): number {
  let priority = 50;

  // overdue（超過1日ごとに+5、最大+25）
  if (input.nextReviewAt && input.nextReviewAt <= nowIso) {
    const overdueDays = Math.max(0, daysBetween(input.nextReviewAt, nowIso));
    priority += Math.min(25, 5 + overdueDays * 5);
  }

  if (input.status === "forgotten") priority += 20;
  else if (input.status === "unsure") priority += 10;
  else if (input.status === "reviewing") priority += 5;

  if (input.consecutiveWrong >= 1) priority += 10;
  if (input.quizWrongCount >= 2) priority += 10;
  if (input.masteryScore < 40) priority += 10;
  if (input.isConfusionProne) priority += 5;

  if (input.status === "mastered") priority -= 30;
  if (input.consecutiveCorrect >= 3) priority -= 15;
  if (input.level === "A1") priority -= 10;
  if (input.lastReviewedAt && isSameDay(input.lastReviewedAt, nowIso)) {
    priority -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(priority)));
}
