"use server";

// Quiz用サーバーアクション — 回答記録とセッション確定
// 回答ごとにDBへ保存し、語彙のstatus/SRS更新まで行う（CLAUDE.md セクション17・20）

import type { ChoiceId } from "../../types/question";
import {
  finishQuizSession,
  recordAnswer,
  type RecordAnswerResult,
} from "../../services/quizService";

export async function submitAnswerAction(params: {
  questionId: string;
  selectedChoice: ChoiceId;
  responseTimeSeconds: number;
}): Promise<RecordAnswerResult | undefined> {
  return recordAnswer(params);
}

export async function finishQuizAction(params: {
  startedAtIso: string;
  answerIds: number[];
  studiedVocabulary: string[];
  wrongVocabulary: string[];
}): Promise<{ sessionId: string }> {
  const sessionId = finishQuizSession(params);
  return { sessionId };
}
