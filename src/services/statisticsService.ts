// Statistics Service — Dashboard・学習履歴の集計を担当する
// CLAUDE.md セクション19・21・22、vocabulary-manager.md セクション47・48参照
// DatabaseをSingle Source of Truthとする（AIの会話履歴に依存しない）

import { desc, gte, sql } from "drizzle-orm";

import type { DashboardStats } from "../types/statistics";
import { db } from "../db";
import {
  studySessions,
  vocabularyItems,
  vocabularyReviewHistory,
} from "../db/schema";
import { getSessionTotals, getStudyDates, listStudySessions } from "../db/queries/sessions";
import { getVocabularyStatistics } from "../db/queries/vocabulary";
import { countDueToday, getTopConfusionPairs } from "./reviewService";

const DAY_MS = 86_400_000;

function startOfTodayIso(): string {
  return `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function daysAgoIso(days: number): string {
  const date = new Date(Date.now() - days * DAY_MS);
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

// ---------------------------------------------------------------------------
// 学習ストリーク（CLAUDE.md セクション22）
// ---------------------------------------------------------------------------

export function getStreakDays(): number {
  const dates = getStudyDates(); // 新しい日付順（YYYY-MM-DD）
  if (dates.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);

  // 今日まだ学習していなくても、昨日までの連続は維持されているとみなす
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]).getTime();
    const current = new Date(dates[i]).getTime();
    if (Math.round((prev - current) / DAY_MS) === 1) streak++;
    else break;
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Dashboard統計（CLAUDE.md セクション21）
// ---------------------------------------------------------------------------

export function getDashboardStats(): DashboardStats {
  const todayStart = startOfTodayIso();
  const weekStart = daysAgoIso(6);

  const today = getSessionTotals(todayStart);
  const week = getSessionTotals(weekStart);
  const total = getSessionTotals();
  const vocabStats = getVocabularyStatistics(
    new Date().toISOString(),
    daysAgoIso(7),
  );

  // 今日の新規語彙数
  const newVocabToday =
    db
      .select({ count: sql<number>`count(*)` })
      .from(vocabularyItems)
      .where(gte(vocabularyItems.firstSeenAt, todayStart))
      .get()?.count ?? 0;

  // 今日の復習語彙数（review historyベース）
  const reviewedToday =
    db
      .select({
        count: sql<number>`count(distinct ${vocabularyReviewHistory.vocabularyId})`,
      })
      .from(vocabularyReviewHistory)
      .where(gte(vocabularyReviewHistory.reviewedAt, todayStart))
      .get()?.count ?? 0;

  return {
    today: {
      studyTimeSeconds: today.studyTimeSeconds,
      questionCount: today.questionCount,
      accuracy:
        today.questionCount > 0 ? today.correctCount / today.questionCount : 0,
      newVocabularyCount: newVocabToday,
      reviewVocabularyCount: reviewedToday,
    },
    last7Days: {
      studyDays: week.studyDays,
      questionCount: week.questionCount,
      averageAccuracy:
        week.questionCount > 0 ? week.correctCount / week.questionCount : 0,
      studyTimeSeconds: week.studyTimeSeconds,
      vocabularyCount: vocabStats.learnedThisWeek,
    },
    total: {
      totalStudyTimeSeconds: total.studyTimeSeconds,
      totalQuestionCount: total.questionCount,
      totalVocabularyCount: vocabStats.totalVocabulary,
      masteredCount: vocabStats.mastered,
      unsureCount: vocabStats.unsure,
      forgottenCount: vocabStats.forgotten,
    },
    streakDays: getStreakDays(),
  };
}

export function getVocabularyStatusStats() {
  return getVocabularyStatistics(new Date().toISOString(), daysAgoIso(7));
}

// ---------------------------------------------------------------------------
// 7日間の学習推移（Statisticsページのチャート用）
// ---------------------------------------------------------------------------

export type DailyStudyPoint = {
  date: string; // YYYY-MM-DD
  questionCount: number;
  correctCount: number;
  accuracy: number;
  studyTimeSeconds: number;
};

export function getLast7DaysTrend(): DailyStudyPoint[] {
  const weekStart = daysAgoIso(6);
  const rows = db
    .select({
      day: sql<string>`date(${studySessions.startedAt})`,
      questionCount: sql<number>`coalesce(sum(${studySessions.questionCount}), 0)`,
      correctCount: sql<number>`coalesce(sum(${studySessions.correctCount}), 0)`,
      studyTimeSeconds: sql<number>`coalesce(sum(${studySessions.studyTimeSeconds}), 0)`,
    })
    .from(studySessions)
    .where(gte(studySessions.startedAt, weekStart))
    .groupBy(sql`date(${studySessions.startedAt})`)
    .all();

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const points: DailyStudyPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    const row = byDay.get(date);
    points.push({
      date,
      questionCount: row?.questionCount ?? 0,
      correctCount: row?.correctCount ?? 0,
      accuracy:
        row && row.questionCount > 0 ? row.correctCount / row.questionCount : 0,
      studyTimeSeconds: row?.studyTimeSeconds ?? 0,
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// 弱点語彙・混同統計（CLAUDE.md実装指示14）
// ---------------------------------------------------------------------------

export function getMostWrongVocabulary(limit = 10) {
  return db
    .select()
    .from(vocabularyItems)
    .where(sql`${vocabularyItems.quizWrongCount} >= 1`)
    .orderBy(
      desc(vocabularyItems.quizWrongCount),
      desc(vocabularyItems.flashcardWrongCount),
    )
    .limit(limit)
    .all();
}

export function getMostConfusedPairs(limit = 10) {
  return getTopConfusionPairs(limit);
}

export function getDueTodayCount(): number {
  return countDueToday();
}

export function getRecentSessions(limit = 30) {
  return listStudySessions(limit);
}
