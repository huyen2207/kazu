"use server";

// Vocabularyページ用サーバーアクション — ユーザーによる手動status変更
// 「覚えた」を選んでもmasteryScoreは100にしない（vocabulary-manager.md セクション42）

import { revalidatePath } from "next/cache";

import type { FlashCardAnswer } from "../../types/vocabulary";
import { setManualStatus } from "../../services/vocabularyService";

export async function setManualStatusAction(params: {
  vocabularyId: string;
  answer: FlashCardAnswer;
}): Promise<void> {
  setManualStatus(params.vocabularyId, params.answer);
  revalidatePath("/vocabulary");
}
