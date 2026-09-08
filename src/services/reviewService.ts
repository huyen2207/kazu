// Review Service — 「今日の復習」リストの作成を担当する
// 優先順位（CLAUDE.md実装指示・vocabulary-manager.md セクション25）：
//   1. overdue → 2. forgotten → 3. repeated mistakes → 4. unsure → 5. reviewing → 6. masteredの長期確認

import { desc, or, sql } from "drizzle-orm";

import { db } from "../db";
import { vocabularyConfusions, vocabularyItems, type VocabularyItemRow } from "../db/schema";
import { daysBetween } from "../lib/srs";

export type ReviewBucket =
  | "overdue"
  | "forgotten"
  | "repeatedMistakes"
  | "unsure"
  | "reviewing"
  | "masteredCheck";

export const REVIEW_BUCKET_LABELS: Record<ReviewBucket, string> = {
  overdue: "復習期限切れ",
  forgotten: "覚えていない",
  repeatedMistakes: "繰り返し間違えた",
  unsure: "あやふや",
  reviewing: "復習中",
  masteredCheck: "定着の長期確認",
};

const BUCKET_ORDER: ReviewBucket[] = [
  "overdue",
  "forgotten",
  "repeatedMistakes",
  "unsure",
  "reviewing",
  "masteredCheck",
];

export function classifyReviewBucket(
  item: Pick<
    VocabularyItemRow,
    "status" | "quizWrongCount" | "nextReviewAt"
  >,
  nowIso: string,
): ReviewBucket | null {
  const due = item.nextReviewAt !== null && item.nextReviewAt <= nowIso;
  const overdueDays = item.nextReviewAt
    ? daysBetween(item.nextReviewAt, nowIso)
    : 0;

  if (due && overdueDays >= 1) return "overdue";
  if (item.status === "forgotten") return "forgotten";
  if (item.quizWrongCount >= 2) return "repeatedMistakes";
  if (item.status === "unsure") return "unsure";
  if (item.status === "mastered") return due ? "masteredCheck" : null;
  if (due) return "reviewing";
  return null;
}

export type ReviewListItem = {
  item: VocabularyItemRow;
  bucket: ReviewBucket;
};

/**
 * 今日復習すべき語彙を優先順に返す。
 * 一度にすべて出さない — デフォルト20語、5/10/20/30から選択可能（セクション26）。
 */
export function getTodayReviewList(limit = 20): ReviewListItem[] {
  const nowIso = new Date().toISOString();

  const candidates = db
    .select()
    .from(vocabularyItems)
    .where(
      or(
        sql`${vocabularyItems.nextReviewAt} <= ${nowIso}`,
        sql`${vocabularyItems.status} in ('forgotten', 'unsure')`,
        sql`${vocabularyItems.quizWrongCount} >= 2`,
      ),
    )
    .orderBy(desc(vocabularyItems.reviewPriority))
    .all();

  const classified: ReviewListItem[] = [];
  for (const item of candidates) {
    const bucket = classifyReviewBucket(item, nowIso);
    if (bucket) classified.push({ item, bucket });
  }

  classified.sort((a, b) => {
    const orderDiff =
      BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket);
    if (orderDiff !== 0) return orderDiff;
    return b.item.reviewPriority - a.item.reviewPriority;
  });

  return classified.slice(0, limit);
}

export function countDueToday(): number {
  const nowIso = new Date().toISOString();
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(vocabularyItems)
    .where(sql`${vocabularyItems.nextReviewAt} <= ${nowIso}`)
    .get();
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// 混同ペア（Confusion Learning — CLAUDE.md実装指示9）
// ---------------------------------------------------------------------------

export type ConfusionPairView = {
  target: VocabularyItemRow;
  confused: VocabularyItemRow;
  count: number;
  lastOccurredAt: string;
};

/** 混同回数の多いペアを返す（比較Flash Card用） */
export function getTopConfusionPairs(limit = 10): ConfusionPairView[] {
  const rows = db
    .select()
    .from(vocabularyConfusions)
    .orderBy(desc(vocabularyConfusions.count))
    .limit(limit)
    .all();

  const pairs: ConfusionPairView[] = [];
  for (const row of rows) {
    const target = db
      .select()
      .from(vocabularyItems)
      .where(sql`${vocabularyItems.id} = ${row.targetVocabularyId}`)
      .get();
    const confused = db
      .select()
      .from(vocabularyItems)
      .where(sql`${vocabularyItems.id} = ${row.confusedVocabularyId}`)
      .get();
    if (target && confused) {
      pairs.push({
        target,
        confused,
        count: row.count,
        lastOccurredAt: row.lastOccurredAt,
      });
    }
  }
  return pairs;
}
