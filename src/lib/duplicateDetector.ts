// 問題の重複検出（決定論的な事前フィルター）— CLAUDE.md セクション10、
// prompts/question-validator.md セクション16～18参照
//
// AI Validatorに渡す前に、明らかな重複・準重複をコードで検出して弾く。
// 意味レベルの微妙な重複判定は最終的にValidator（AI）が行う。

import { isSameVocabulary, tokenizeVietnamese } from "./vocabularyNormalizer";

export type DuplicateCheckTarget = {
  id: string;
  sentence: string;
  targetVocabulary: string;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  reason?: "exact_match" | "near_duplicate" | "same_target_similar_sentence";
  matchedQuestionId?: string;
  similarity?: number;
};

/** トークン集合のJaccard類似度（0～1） */
export function sentenceSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenizeVietnamese(a));
  const tokensB = new Set(tokenizeVietnamese(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return intersection / union;
}

// 準重複とみなす閾値：
// - 正解語彙が同じ場合は文の重なりが少なくても重複扱い（学習体験がほぼ同じになるため）
// - 正解語彙が違っても文がほぼ同じなら重複扱い
const SAME_TARGET_THRESHOLD = 0.6;
const ANY_TARGET_THRESHOLD = 0.85;

/**
 * 新しい問題が過去問題と重複していないか検査する。
 *
 * 例（CLAUDE.md セクション10）：
 *   既存: Tôi phải sắp xếp lại phòng trước khi khách đến.
 *   新規: Tôi phải sắp xếp lại nhà trước khi bạn đến.
 * → 正解語彙が同じ・文構造がほぼ同じなので準重複としてFAIL。
 *
 * Review Modeでは同じtargetVocabularyの再利用は許可されるが、
 * 文が似すぎる場合は重複扱いになる（validator セクション19）。
 */
export function checkDuplicate(
  candidate: { sentence: string; targetVocabulary: string },
  previousQuestions: DuplicateCheckTarget[],
  options: { allowSameTarget?: boolean } = {},
): DuplicateCheckResult {
  const { allowSameTarget = false } = options;

  for (const prev of previousQuestions) {
    const similarity = sentenceSimilarity(candidate.sentence, prev.sentence);
    const sameTarget = isSameVocabulary(
      candidate.targetVocabulary,
      prev.targetVocabulary,
    );

    if (similarity >= 0.99) {
      return {
        isDuplicate: true,
        reason: "exact_match",
        matchedQuestionId: prev.id,
        similarity,
      };
    }

    if (similarity >= ANY_TARGET_THRESHOLD) {
      return {
        isDuplicate: true,
        reason: "near_duplicate",
        matchedQuestionId: prev.id,
        similarity,
      };
    }

    // New Modeでは同じ正解語彙で文も似ていれば準重複。
    // Review Mode（allowSameTarget=true）でも、文が似すぎるものは弾く。
    if (sameTarget && similarity >= SAME_TARGET_THRESHOLD) {
      return {
        isDuplicate: true,
        reason: allowSameTarget ? "near_duplicate" : "same_target_similar_sentence",
        matchedQuestionId: prev.id,
        similarity,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * 複数問題セット内の正解位置の偏りを検査する（question-generator.md セクション10、
 * validator セクション20）。
 * 1つの位置が全体の50%を超える場合は偏りすぎと判定する。
 */
export function checkAnswerPositionBalance(
  correctChoices: ("A" | "B" | "C" | "D")[],
): { balanced: boolean; counts: Record<"A" | "B" | "C" | "D", number> } {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const choice of correctChoices) counts[choice] += 1;

  const max = Math.max(counts.A, counts.B, counts.C, counts.D);
  const balanced =
    correctChoices.length < 4 || max <= Math.ceil(correctChoices.length / 2);

  return { balanced, counts };
}
