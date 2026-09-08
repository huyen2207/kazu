// masteryScoreの決定論的な更新 — prompts/vocabulary-manager.md セクション15～18参照
//
// AIに計算させず、必ずこのモジュールで処理する（セクション54）。

export type MasteryEvent =
  | "quiz_correct"
  | "quiz_wrong"
  | "flashcard_remembered"
  | "flashcard_unsure"
  | "flashcard_forgotten";

// 基本の増減（セクション16）
const BASE_DELTA: Record<MasteryEvent, number> = {
  quiz_correct: 10,
  quiz_wrong: -15,
  flashcard_remembered: 8,
  flashcard_unsure: -3,
  flashcard_forgotten: -12,
};

// 時間を空けてQuiz正解した場合の追加ボーナス（セクション16）
const SPACED_QUIZ_BONUS = 5;

export type MasteryUpdateContext = {
  /** 前回復習と異なる日か（時間を空けた復習ならtrue） */
  isSpacedReview: boolean;
  /** 今日すでに何回この語彙を復習したか（0なら今日初） */
  sameDayReviewCount: number;
};

export function clampMasteryScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * イベントに応じてmasteryScoreを更新する。
 * - スコアは0～100に制限（セクション17）
 * - 時間を空けたQuiz正解には+5ボーナス
 * - 同じ日に繰り返し正解した場合、加点は半減させる（セクション16）
 */
export function applyMasteryEvent(
  currentScore: number,
  event: MasteryEvent,
  context: MasteryUpdateContext,
): number {
  let delta = BASE_DELTA[event];

  if (event === "quiz_correct" && context.isSpacedReview) {
    delta += SPACED_QUIZ_BONUS;
  }

  // 同じ日の繰り返しでは加点を小さくする（減点はそのまま）
  if (delta > 0 && context.sameDayReviewCount >= 1) {
    delta = Math.ceil(delta / 2);
  }

  return clampMasteryScore(currentScore + delta);
}

/** masteryScoreの目安ラベル（セクション15） */
export function masteryScoreLabel(score: number): string {
  if (score >= 80) return "定着";
  if (score >= 60) return "かなり覚えている";
  if (score >= 40) return "あやふや";
  if (score >= 20) return "学習中";
  return "ほぼ覚えていない";
}

export type MasteryCheckInput = {
  masteryScore: number;
  consecutiveCorrect: number;
  /** 正しく復習できた「異なる日」の数 */
  distinctCorrectReviewDays: number;
  quizCorrectCount: number;
};

/**
 * mastered条件（セクション18）：
 * - masteryScore >= 80
 * - consecutiveCorrect >= 3
 * - 異なる日に2回以上正しく復習している
 * - 最低1回はQuiz形式で正解している（望ましい条件だが、既定では必須にする）
 *
 * 一度の正解だけでmasteredにしてはいけない（セクション1・10）。
 */
export function meetsMasteredCondition(
  input: MasteryCheckInput,
  options: { requireQuizCorrect?: boolean } = {},
): boolean {
  const { requireQuizCorrect = true } = options;

  if (input.masteryScore < 80) return false;
  if (input.consecutiveCorrect < 3) return false;
  if (input.distinctCorrectReviewDays < 2) return false;
  if (requireQuizCorrect && input.quizCorrectCount < 1) return false;

  return true;
}
