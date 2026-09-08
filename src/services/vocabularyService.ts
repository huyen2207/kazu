// Vocabulary Service — 語彙の保存・更新・検索を担当する
// prompts/vocabulary-manager.md を正とする（セクション5～14・34・42・43）
// 決定論的な計算は src/lib/vocabularyProgress.ts の applyProgressEvent に委譲する（セクション54）

import { randomUUID } from "node:crypto";
import { and, desc, like, lte, or, sql } from "drizzle-orm";

import type { Question } from "../types/question";
import type { FlashCardAnswer, VocabularyStatus } from "../types/vocabulary";
import { db } from "../db";
import { vocabularyItems, vocabularyReviewHistory, type VocabularyItemRow } from "../db/schema";
import {
  getVocabularyById,
  getVocabularyByNormalized,
  insertReviewHistory,
  insertVocabulary,
  recordConfusion,
  updateVocabulary,
} from "../db/queries/vocabulary";
import { applyProgressEvent, type ProgressEvent } from "../lib/vocabularyProgress";
import { getNextReviewAt, calculateReviewPriority } from "../lib/srs";
import { meetsMasteredCondition } from "../lib/masteryScore";
import { normalizeVietnamese } from "../lib/vocabularyNormalizer";
import {
  isLearningValuable,
  selectVocabularyToSave,
  type QuestionVocabularyEntry,
} from "./ai/vocabularyManager";

// ---------------------------------------------------------------------------
// 復習履歴ベースの補助情報（applyProgressEventへの入力）
// ---------------------------------------------------------------------------

// 異なる日に正しく復習できた日数（mastered判定用、セクション18）
function distinctCorrectReviewDays(vocabularyId: string): number {
  const row = db
    .select({
      days: sql<number>`count(distinct date(${vocabularyReviewHistory.reviewedAt}))`,
    })
    .from(vocabularyReviewHistory)
    .where(
      and(
        sql`${vocabularyReviewHistory.vocabularyId} = ${vocabularyId}`,
        sql`${vocabularyReviewHistory.result} in ('correct', 'remembered')`,
      ),
    )
    .get();
  return row?.days ?? 0;
}

// 今日すでに何回復習したか（同日繰り返しの加点半減用、セクション16）
function sameDayReviewCount(vocabularyId: string, nowIso: string): number {
  const today = nowIso.slice(0, 10);
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(vocabularyReviewHistory)
    .where(
      and(
        sql`${vocabularyReviewHistory.vocabularyId} = ${vocabularyId}`,
        sql`date(${vocabularyReviewHistory.reviewedAt}) = ${today}`,
      ),
    )
    .get();
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// 語彙のupsert（重複登録防止：セクション5・43）
// ---------------------------------------------------------------------------

export function upsertVocabularyFromQuestion(
  entry: QuestionVocabularyEntry,
  question: Pick<Question, "id" | "sentence" | "category" | "targetVocabulary">,
  nowIso: string,
): VocabularyItemRow {
  const normalized = normalizeVietnamese(entry.word);
  const existing = getVocabularyByNormalized(normalized);

  if (existing) {
    // 既存データを更新（セクション43）：exposureCount += 1、sourceQuestionIds追加、lastSeenAt更新
    const sourceIds = existing.sourceQuestionIds.includes(question.id)
      ? existing.sourceQuestionIds
      : [...existing.sourceQuestionIds, question.id];
    updateVocabulary(existing.id, {
      exposureCount: existing.exposureCount + 1,
      sourceQuestionIds: sourceIds,
      lastSeenAt: nowIso,
      // 意味・例文が未登録なら補完する
      japaneseMeaning: existing.japaneseMeaning || entry.meaningJP,
      exampleSentence:
        existing.exampleSentence ??
        entry.example ??
        exampleFromQuestion(entry, question),
      exampleJapanese: existing.exampleJapanese ?? entry.exampleJP,
    });
    return getVocabularyById(existing.id)!;
  }

  const id = randomUUID();
  const status: VocabularyStatus = "new";
  insertVocabulary({
    id,
    vietnamese: entry.word,
    normalizedVietnamese: normalized,
    japaneseMeaning: entry.meaningJP,
    partOfSpeech: entry.partOfSpeech,
    level: "A2",
    category: question.category,
    exampleSentence: entry.example ?? exampleFromQuestion(entry, question),
    exampleJapanese: entry.exampleJP,
    status,
    exposureCount: 1,
    masteryScore: 0,
    firstSeenAt: nowIso,
    lastSeenAt: nowIso,
    // new語彙は初回学習後1日以内に復習（セクション20）
    nextReviewAt: getNextReviewAt(nowIso, status, 0),
    sourceQuestionIds: [question.id],
    reviewPriority: calculateReviewPriority(
      {
        status,
        masteryScore: 0,
        quizWrongCount: 0,
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
        level: "A2",
        nextReviewAt: null,
        lastReviewedAt: null,
      },
      nowIso,
    ),
  });
  return getVocabularyById(id)!;
}

// targetVocabularyの場合、問題文の空欄を埋めた文を例文として使う
function exampleFromQuestion(
  entry: QuestionVocabularyEntry,
  question: Pick<Question, "sentence" | "targetVocabulary">,
): string | undefined {
  if (
    normalizeVietnamese(entry.word) ===
    normalizeVietnamese(question.targetVocabulary)
  ) {
    return question.sentence.replace(/_{2,}/, question.targetVocabulary);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// 共通の復習イベント適用処理
// ---------------------------------------------------------------------------

function applyEventAndPersist(
  row: VocabularyItemRow,
  event: ProgressEvent,
  nowIso: string,
): void {
  const update = applyProgressEvent(
    {
      status: row.status,
      masteryScore: row.masteryScore,
      quizCorrectCount: row.quizCorrectCount,
      quizWrongCount: row.quizWrongCount,
      flashcardCorrectCount: row.flashcardCorrectCount,
      flashcardWrongCount: row.flashcardWrongCount,
      consecutiveCorrect: row.consecutiveCorrect,
      consecutiveWrong: row.consecutiveWrong,
      level: row.level,
      lastReviewedAt: row.lastReviewedAt,
      nextReviewAt: row.nextReviewAt,
      distinctCorrectReviewDays: distinctCorrectReviewDays(row.id),
      sameDayReviewCount: sameDayReviewCount(row.id, nowIso),
    },
    event,
    nowIso,
  );

  updateVocabulary(row.id, { ...update, lastSeenAt: nowIso });

  insertReviewHistory({
    id: randomUUID(),
    vocabularyId: row.id,
    reviewType: event.type === "quiz" ? "quiz" : "flashcard",
    result:
      event.type === "quiz"
        ? event.isCorrect
          ? "correct"
          : "wrong"
        : event.rating,
    reviewedAt: nowIso,
    previousMasteryScore: row.masteryScore,
    newMasteryScore: update.masteryScore,
    nextReviewAt: update.nextReviewAt,
  });
}

// ---------------------------------------------------------------------------
// Quiz回答の処理（セクション9・10・17・34）
// ---------------------------------------------------------------------------

export function processQuizVocabulary(params: {
  question: Question;
  isCorrect: boolean;
  selectedChoiceText?: string;
  nowIso?: string;
}): void {
  const { question, isCorrect, selectedChoiceText } = params;
  const nowIso = params.nowIso ?? new Date().toISOString();

  const selections = selectVocabularyToSave(question, {
    isCorrect,
    selectedChoiceText,
  });

  let targetRow: VocabularyItemRow | undefined;
  let confusedRow: VocabularyItemRow | undefined;

  for (const selection of selections) {
    let row = upsertVocabularyFromQuestion(selection.entry, question, nowIso);
    // targetVocabularyには問題のコロケーションを引き継ぐ（Flash Card裏面用 — CLAUDE.md セクション15）
    if (
      selection.isTarget &&
      !row.collocations?.length &&
      question.collocations?.length
    ) {
      updateVocabulary(row.id, { collocations: question.collocations });
      row = { ...row, collocations: question.collocations };
    }
    if (selection.isTarget) targetRow = row;
    if (
      !isCorrect &&
      selectedChoiceText &&
      normalizeVietnamese(selection.entry.word) ===
        normalizeVietnamese(selectedChoiceText)
    ) {
      confusedRow = row;
    }
  }

  if (!targetRow) return;

  applyEventAndPersist(targetRow, { type: "quiz", isCorrect }, nowIso);

  // 混同の記録（セクション34・35）：正解語彙 ↔ ユーザーが選んだ語彙
  // 選んだ語がquestion.vocabularyに含まれない場合は、選択肢解説から意味を
  // 抽出して語彙登録してから記録する（混同学習を成立させるため）
  if (!isCorrect && selectedChoiceText && !confusedRow) {
    confusedRow = upsertConfusedChoiceVocabulary(
      question,
      selectedChoiceText,
      nowIso,
    );
  }
  if (!isCorrect && confusedRow && confusedRow.id !== targetRow.id) {
    recordConfusion(targetRow.id, confusedRow.id, nowIso);
  }
}

// 誤答に選ばれた選択肢の語彙を登録する。
// 意味は既存DB → 選択肢解説（「語＝意味。…」形式）の順で解決する。
function upsertConfusedChoiceVocabulary(
  question: Question,
  selectedChoiceText: string,
  nowIso: string,
): VocabularyItemRow | undefined {
  if (!isLearningValuable(selectedChoiceText)) return undefined;

  const existing = getVocabularyByNormalized(
    normalizeVietnamese(selectedChoiceText),
  );
  if (existing) return existing;

  const selectedChoice = question.choices.find(
    (c) =>
      normalizeVietnamese(c.text) === normalizeVietnamese(selectedChoiceText),
  );
  const explanation = selectedChoice
    ? question.choiceExplanations.find((e) => e.choice === selectedChoice.id)
        ?.explanationJP
    : undefined;
  // 「nói＝話す。…」のような解説文から意味部分を抽出する
  const meaningMatch = explanation?.match(/[＝=]\s*([^。]+)/);
  const meaningJP = meaningMatch?.[1]?.trim() ?? "";

  return upsertVocabularyFromQuestion(
    { word: selectedChoiceText, meaningJP, partOfSpeech: "" },
    question,
    nowIso,
  );
}

// ---------------------------------------------------------------------------
// Flash Card評価の処理（セクション11～14）
// ---------------------------------------------------------------------------

export function processFlashcardAnswer(
  vocabularyId: string,
  answer: FlashCardAnswer,
  nowIso: string = new Date().toISOString(),
): VocabularyItemRow | undefined {
  const row = getVocabularyById(vocabularyId);
  if (!row) return undefined;
  applyEventAndPersist(row, { type: "flashcard", rating: answer }, nowIso);
  return getVocabularyById(vocabularyId);
}

// ---------------------------------------------------------------------------
// ユーザーによる手動status変更（セクション42）
// ---------------------------------------------------------------------------

// 「覚えた」を選んでもmasteryScoreを100にしない。scoreは変えずstatusとSRSのみ更新する。
export function setManualStatus(
  vocabularyId: string,
  answer: FlashCardAnswer,
  nowIso: string = new Date().toISOString(),
): void {
  const row = getVocabularyById(vocabularyId);
  if (!row) return;

  let newStatus: VocabularyStatus;
  if (answer === "forgotten") newStatus = "forgotten";
  else if (answer === "unsure") newStatus = "unsure";
  else {
    // 「覚えた」：Quiz履歴も含めた条件を満たす場合のみmastered（セクション42）
    newStatus = meetsMasteredCondition({
      masteryScore: row.masteryScore,
      consecutiveCorrect: row.consecutiveCorrect,
      distinctCorrectReviewDays: distinctCorrectReviewDays(vocabularyId),
      quizCorrectCount: row.quizCorrectCount,
    })
      ? "mastered"
      : "reviewing";
  }

  const nextReviewAt = getNextReviewAt(nowIso, newStatus, row.consecutiveCorrect);
  updateVocabulary(vocabularyId, {
    status: newStatus,
    nextReviewAt,
    reviewPriority: calculateReviewPriority(
      {
        status: newStatus,
        masteryScore: row.masteryScore,
        quizWrongCount: row.quizWrongCount,
        consecutiveCorrect: row.consecutiveCorrect,
        consecutiveWrong: row.consecutiveWrong,
        level: row.level,
        nextReviewAt,
        lastReviewedAt: row.lastReviewedAt,
      },
      nowIso,
    ),
  });
}

// ---------------------------------------------------------------------------
// Vocabularyページ用の検索・フィルター（セクション39～41）
// ---------------------------------------------------------------------------

export type VocabularyFilterKey =
  | "all"
  | "new"
  | "learning"
  | "forgotten"
  | "unsure"
  | "reviewing"
  | "mastered"
  | "dueToday"
  | "fromWrongAnswers";

export type VocabularySortKey =
  | "recent"
  | "priority"
  | "wrongCount"
  | "masteryScore"
  | "alphabetical"
  | "nextReview";

export function searchVocabulary(params: {
  filter?: VocabularyFilterKey;
  search?: string;
  sort?: VocabularySortKey;
  nowIso?: string;
}): VocabularyItemRow[] {
  const { filter = "all", search, sort = "recent" } = params;
  const nowIso = params.nowIso ?? new Date().toISOString();

  const conditions = [];
  if (
    filter !== "all" &&
    filter !== "dueToday" &&
    filter !== "fromWrongAnswers"
  ) {
    conditions.push(sql`${vocabularyItems.status} = ${filter}`);
  }
  if (filter === "dueToday") {
    conditions.push(lte(vocabularyItems.nextReviewAt, nowIso));
  }
  if (filter === "fromWrongAnswers") {
    conditions.push(sql`${vocabularyItems.quizWrongCount} >= 1`);
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    const normalizedTerm = `%${normalizeVietnamese(search)}%`;
    conditions.push(
      or(
        like(vocabularyItems.normalizedVietnamese, normalizedTerm),
        like(vocabularyItems.vietnamese, term),
        like(vocabularyItems.japaneseMeaning, term),
        like(vocabularyItems.category, term),
        like(vocabularyItems.partOfSpeech, term),
      ),
    );
  }

  const orderBy = {
    recent: [desc(vocabularyItems.firstSeenAt)],
    priority: [desc(vocabularyItems.reviewPriority)],
    wrongCount: [desc(vocabularyItems.quizWrongCount)],
    masteryScore: [desc(vocabularyItems.masteryScore)],
    alphabetical: [vocabularyItems.normalizedVietnamese],
    nextReview: [vocabularyItems.nextReviewAt],
  }[sort];

  const query = db.select().from(vocabularyItems);
  return (conditions.length > 0 ? query.where(and(...conditions)) : query)
    .orderBy(...orderBy)
    .all();
}
