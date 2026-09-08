// Database schema — CLAUDE.md セクション14・19・20・23、prompts/vocabulary-manager.md セクション4・35・45・46参照
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";

import type { ChoiceId, Difficulty } from "../types/question";
import type { VocabularyStatus, VocabularyLevel } from "../types/vocabulary";

// ---------------------------------------------------------------------------
// Questions — 出題済み問題をすべて記録する（重複防止のため削除しない）
// ---------------------------------------------------------------------------

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),

    sentence: text("sentence").notNull(),

    choices: text("choices", { mode: "json" })
      .$type<{ id: ChoiceId; text: string }[]>()
      .notNull(),

    correctChoice: text("correct_choice").$type<ChoiceId>().notNull(),

    translationJP: text("translation_jp").notNull(),
    explanationJP: text("explanation_jp").notNull(),

    choiceExplanations: text("choice_explanations", { mode: "json" })
      .$type<{ choice: ChoiceId; explanationJP: string }[]>()
      .notNull(),

    vocabulary: text("vocabulary", { mode: "json" })
      .$type<
        {
          word: string;
          meaningJP: string;
          partOfSpeech: string;
          explanationJP?: string;
        }[]
      >()
      .notNull(),

    grammar: text("grammar", { mode: "json" })
      .$type<
        {
          pattern: string;
          meaningJP: string;
          explanationJP: string;
          example?: string;
          exampleJP?: string;
        }[]
      >()
      .notNull(),

    collocations: text("collocations", { mode: "json" }).$type<
      { expression: string; meaningJP: string }[]
    >(),

    level: text("level").$type<"A2">().notNull().default("A2"),
    difficulty: text("difficulty").$type<Difficulty>().notNull(),
    category: text("category").notNull(),

    targetVocabulary: text("target_vocabulary").notNull(),

    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_questions_category").on(t.category),
    index("idx_questions_target_vocabulary").on(t.targetVocabulary),
  ],
);

// ---------------------------------------------------------------------------
// Vocabulary — vocabulary-manager.md セクション4のVocabularyItem
// ---------------------------------------------------------------------------

export const vocabularyItems = sqliteTable(
  "vocabulary_items",
  {
    id: text("id").primaryKey(),

    vietnamese: text("vietnamese").notNull(),
    // 小文字化・空白除去済み。声調記号は保持する（セクション5）
    normalizedVietnamese: text("normalized_vietnamese").notNull(),

    japaneseMeaning: text("japanese_meaning").notNull(),
    partOfSpeech: text("part_of_speech").notNull(),

    level: text("level").$type<VocabularyLevel>().notNull(),
    category: text("category").notNull(),

    exampleSentence: text("example_sentence"),
    exampleJapanese: text("example_japanese"),

    collocations: text("collocations", { mode: "json" }).$type<
      { expression: string; meaningJP: string }[]
    >(),

    synonyms: text("synonyms", { mode: "json" }).$type<string[]>(),
    antonyms: text("antonyms", { mode: "json" }).$type<string[]>(),

    status: text("status").$type<VocabularyStatus>().notNull().default("new"),

    exposureCount: integer("exposure_count").notNull().default(0),

    quizCorrectCount: integer("quiz_correct_count").notNull().default(0),
    quizWrongCount: integer("quiz_wrong_count").notNull().default(0),

    flashcardCorrectCount: integer("flashcard_correct_count")
      .notNull()
      .default(0),
    flashcardWrongCount: integer("flashcard_wrong_count").notNull().default(0),

    consecutiveCorrect: integer("consecutive_correct").notNull().default(0),
    consecutiveWrong: integer("consecutive_wrong").notNull().default(0),

    // 0～100（セクション15～17）
    masteryScore: integer("mastery_score").notNull().default(0),

    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at"),
    lastReviewedAt: text("last_reviewed_at"),
    nextReviewAt: text("next_review_at"),

    sourceQuestionIds: text("source_question_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),

    // 0～100、高いほど今日復習すべき（セクション22）
    reviewPriority: integer("review_priority").notNull().default(0),
  },
  (t) => [
    // 重複登録防止（セクション43）。多義語はvocabulary_sensesで管理（セクション44）
    uniqueIndex("uniq_vocabulary_normalized").on(t.normalizedVietnamese),
    index("idx_vocabulary_status").on(t.status),
    index("idx_vocabulary_next_review").on(t.nextReviewAt),
    index("idx_vocabulary_review_priority").on(t.reviewPriority),
  ],
);

// 多義語のsense単位管理（例：đường = 道 / 砂糖）— セクション44・45
export const vocabularySenses = sqliteTable(
  "vocabulary_senses",
  {
    senseId: text("sense_id").primaryKey(),

    vocabularyId: text("vocabulary_id")
      .notNull()
      .references(() => vocabularyItems.id),

    meaningJP: text("meaning_jp").notNull(),
    partOfSpeech: text("part_of_speech").notNull(),
    exampleSentence: text("example_sentence").notNull(),
    category: text("category"),
  },
  (t) => [index("idx_senses_vocabulary").on(t.vocabularyId)],
);

// 混同ペアの記録（AをBと間違えた）— セクション34・35
export const vocabularyConfusions = sqliteTable(
  "vocabulary_confusions",
  {
    targetVocabularyId: text("target_vocabulary_id")
      .notNull()
      .references(() => vocabularyItems.id),
    confusedVocabularyId: text("confused_vocabulary_id")
      .notNull()
      .references(() => vocabularyItems.id),

    count: integer("count").notNull().default(1),

    lastOccurredAt: text("last_occurred_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.targetVocabularyId, t.confusedVocabularyId] }),
  ],
);

// 語彙ごとの復習履歴 — セクション46
export const vocabularyReviewHistory = sqliteTable(
  "vocabulary_review_history",
  {
    id: text("id").primaryKey(),

    vocabularyId: text("vocabulary_id")
      .notNull()
      .references(() => vocabularyItems.id),

    reviewType: text("review_type")
      .$type<"quiz" | "flashcard" | "reverse" | "example" | "confusion">()
      .notNull(),

    result: text("result")
      .$type<"correct" | "wrong" | "forgotten" | "unsure" | "remembered">()
      .notNull(),

    reviewedAt: text("reviewed_at").notNull(),

    previousMasteryScore: integer("previous_mastery_score").notNull(),
    newMasteryScore: integer("new_mastery_score").notNull(),

    nextReviewAt: text("next_review_at").notNull(),
  },
  (t) => [
    index("idx_review_history_vocabulary").on(t.vocabularyId),
    index("idx_review_history_reviewed_at").on(t.reviewedAt),
  ],
);

// ---------------------------------------------------------------------------
// Learning History — CLAUDE.md セクション19・20
// ---------------------------------------------------------------------------

export const studySessions = sqliteTable(
  "study_sessions",
  {
    id: text("id").primaryKey(),

    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at").notNull(),

    questionCount: integer("question_count").notNull(),
    correctCount: integer("correct_count").notNull(),
    wrongCount: integer("wrong_count").notNull(),

    // 0～1
    accuracy: real("accuracy").notNull(),

    studiedVocabulary: text("studied_vocabulary", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    wrongVocabulary: text("wrong_vocabulary", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),

    studyTimeSeconds: integer("study_time_seconds").notNull(),
  },
  (t) => [index("idx_sessions_started_at").on(t.startedAt)],
);

export const answerHistory = sqliteTable(
  "answer_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    sessionId: text("session_id").references(() => studySessions.id),

    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),

    selectedAnswer: text("selected_answer").$type<ChoiceId>().notNull(),
    correctAnswer: text("correct_answer").$type<ChoiceId>().notNull(),

    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),

    responseTimeSeconds: real("response_time_seconds").notNull(),

    answeredAt: text("answered_at").notNull(),
  },
  (t) => [
    index("idx_answers_question").on(t.questionId),
    index("idx_answers_session").on(t.sessionId),
    index("idx_answers_answered_at").on(t.answeredAt),
  ],
);

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export type QuestionRow = typeof questions.$inferSelect;
export type NewQuestionRow = typeof questions.$inferInsert;

export type VocabularyItemRow = typeof vocabularyItems.$inferSelect;
export type NewVocabularyItemRow = typeof vocabularyItems.$inferInsert;

export type VocabularySenseRow = typeof vocabularySenses.$inferSelect;
export type VocabularyConfusionRow = typeof vocabularyConfusions.$inferSelect;
export type VocabularyReviewHistoryRow =
  typeof vocabularyReviewHistory.$inferSelect;
export type NewVocabularyReviewHistoryRow =
  typeof vocabularyReviewHistory.$inferInsert;

export type StudySessionRow = typeof studySessions.$inferSelect;
export type NewStudySessionRow = typeof studySessions.$inferInsert;

export type AnswerHistoryRow = typeof answerHistory.$inferSelect;
export type NewAnswerHistoryRow = typeof answerHistory.$inferInsert;
