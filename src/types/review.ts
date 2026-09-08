// Review / History types — CLAUDE.md セクション20、prompts/vocabulary-manager.md セクション46参照

import type { ChoiceId } from "./question";

export type AnswerHistory = {
  questionId: string;

  selectedAnswer: ChoiceId;
  correctAnswer: ChoiceId;

  isCorrect: boolean;

  responseTimeSeconds: number;

  answeredAt: string;
};

// 語彙ごとの復習履歴 — vocabulary-manager.md セクション46参照
export type VocabularyReviewHistory = {
  id: string;

  vocabularyId: string;

  reviewType: "quiz" | "flashcard" | "reverse" | "example" | "confusion";

  result: "correct" | "wrong" | "forgotten" | "unsure" | "remembered";

  reviewedAt: string;

  previousMasteryScore: number;
  newMasteryScore: number;

  nextReviewAt: string;
};
