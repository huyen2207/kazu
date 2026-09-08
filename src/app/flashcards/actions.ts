"use server";

// Flash Card用サーバーアクション
// 評価（覚えていない / あやふや / 覚えた）を受けてstatus・masteryScore・SRSを更新する
// 「覚えた」でも即masteredにはしない（vocabulary-manager.md セクション11・14）

import type { FlashCardAnswer, VocabularyStatus } from "../../types/vocabulary";
import { processFlashcardAnswer } from "../../services/vocabularyService";

export async function rateFlashcardAction(params: {
  vocabularyId: string;
  answer: FlashCardAnswer;
}): Promise<{ status: VocabularyStatus; nextReviewAt: string | null } | undefined> {
  const updated = processFlashcardAnswer(params.vocabularyId, params.answer);
  if (!updated) return undefined;
  return { status: updated.status, nextReviewAt: updated.nextReviewAt };
}
