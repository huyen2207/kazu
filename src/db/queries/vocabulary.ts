import { and, asc, desc, eq, lte, sql } from "drizzle-orm";

import type { VocabularyStatus } from "../../types/vocabulary";
import { db } from "../index";
import {
  vocabularyConfusions,
  vocabularyItems,
  vocabularyReviewHistory,
  type NewVocabularyItemRow,
  type NewVocabularyReviewHistoryRow,
  type VocabularyItemRow,
} from "../schema";

export function getVocabularyById(id: string): VocabularyItemRow | undefined {
  return db
    .select()
    .from(vocabularyItems)
    .where(eq(vocabularyItems.id, id))
    .get();
}

// 重複登録防止：normalizedVietnameseで既存を探す（vocabulary-manager.md セクション5・43）
export function getVocabularyByNormalized(
  normalizedVietnamese: string,
): VocabularyItemRow | undefined {
  return db
    .select()
    .from(vocabularyItems)
    .where(eq(vocabularyItems.normalizedVietnamese, normalizedVietnamese))
    .get();
}

export function insertVocabulary(row: NewVocabularyItemRow): void {
  db.insert(vocabularyItems).values(row).run();
}

export function updateVocabulary(
  id: string,
  patch: Partial<NewVocabularyItemRow>,
): void {
  db.update(vocabularyItems)
    .set(patch)
    .where(eq(vocabularyItems.id, id))
    .run();
}

export function listVocabulary(status?: VocabularyStatus): VocabularyItemRow[] {
  const query = db.select().from(vocabularyItems);
  if (status) {
    return query.where(eq(vocabularyItems.status, status)).all();
  }
  return query.all();
}

// 今日の復習リスト（vocabulary-manager.md セクション25・26）
// overdue → 優先度の高い順に上限まで
export function getDueVocabulary(
  nowIso: string,
  limit = 20,
): VocabularyItemRow[] {
  return db
    .select()
    .from(vocabularyItems)
    .where(lte(vocabularyItems.nextReviewAt, nowIso))
    .orderBy(
      desc(vocabularyItems.reviewPriority),
      asc(vocabularyItems.nextReviewAt),
    )
    .limit(limit)
    .all();
}

// weakVocabulary条件（vocabulary-manager.md セクション27）
export function getWeakVocabulary(limit = 50): VocabularyItemRow[] {
  return db
    .select()
    .from(vocabularyItems)
    .where(
      sql`${vocabularyItems.quizWrongCount} >= 2 OR ${vocabularyItems.masteryScore} < 40`,
    )
    .orderBy(desc(vocabularyItems.reviewPriority))
    .limit(limit)
    .all();
}

// 混同ペアの記録（vocabulary-manager.md セクション34・35）
export function recordConfusion(
  targetVocabularyId: string,
  confusedVocabularyId: string,
  occurredAtIso: string,
): void {
  db.insert(vocabularyConfusions)
    .values({
      targetVocabularyId,
      confusedVocabularyId,
      count: 1,
      lastOccurredAt: occurredAtIso,
    })
    .onConflictDoUpdate({
      target: [
        vocabularyConfusions.targetVocabularyId,
        vocabularyConfusions.confusedVocabularyId,
      ],
      set: {
        count: sql`${vocabularyConfusions.count} + 1`,
        lastOccurredAt: occurredAtIso,
      },
    })
    .run();
}

export function getConfusionPairs(vocabularyId: string) {
  return db
    .select()
    .from(vocabularyConfusions)
    .where(
      and(eq(vocabularyConfusions.targetVocabularyId, vocabularyId)),
    )
    .orderBy(desc(vocabularyConfusions.count))
    .all();
}

export function insertReviewHistory(
  row: NewVocabularyReviewHistoryRow,
): void {
  db.insert(vocabularyReviewHistory).values(row).run();
}

// Dashboard用の語彙集計（vocabulary-manager.md セクション47）
export function getVocabularyStatistics(nowIso: string, weekAgoIso: string) {
  const counts = db
    .select({
      status: vocabularyItems.status,
      count: sql<number>`count(*)`,
    })
    .from(vocabularyItems)
    .groupBy(vocabularyItems.status)
    .all();

  const byStatus: Record<string, number> = {};
  for (const row of counts) byStatus[row.status] = row.count;

  const dueToday =
    db
      .select({ count: sql<number>`count(*)` })
      .from(vocabularyItems)
      .where(lte(vocabularyItems.nextReviewAt, nowIso))
      .get()?.count ?? 0;

  const learnedThisWeek =
    db
      .select({ count: sql<number>`count(*)` })
      .from(vocabularyItems)
      .where(sql`${vocabularyItems.firstSeenAt} >= ${weekAgoIso}`)
      .get()?.count ?? 0;

  return {
    totalVocabulary: counts.reduce((sum, r) => sum + r.count, 0),
    new: byStatus["new"] ?? 0,
    learning: byStatus["learning"] ?? 0,
    forgotten: byStatus["forgotten"] ?? 0,
    unsure: byStatus["unsure"] ?? 0,
    reviewing: byStatus["reviewing"] ?? 0,
    mastered: byStatus["mastered"] ?? 0,
    dueToday,
    learnedThisWeek,
  };
}
