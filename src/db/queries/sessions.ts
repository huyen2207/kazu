import { desc, eq, gte, sql } from "drizzle-orm";

import { db } from "../index";
import {
  answerHistory,
  studySessions,
  type AnswerHistoryRow,
  type NewAnswerHistoryRow,
  type NewStudySessionRow,
  type StudySessionRow,
} from "../schema";

export function insertStudySession(row: NewStudySessionRow): void {
  db.insert(studySessions).values(row).run();
}

export function insertAnswer(row: NewAnswerHistoryRow): void {
  db.insert(answerHistory).values(row).run();
}

export function listStudySessions(limit = 50): StudySessionRow[] {
  return db
    .select()
    .from(studySessions)
    .orderBy(desc(studySessions.startedAt))
    .limit(limit)
    .all();
}

export function getAnswersForSession(sessionId: string): AnswerHistoryRow[] {
  return db
    .select()
    .from(answerHistory)
    .where(eq(answerHistory.sessionId, sessionId))
    .all();
}

// Dashboard集計用（CLAUDE.md セクション21）
export function getSessionTotals(sinceIso?: string) {
  const base = db
    .select({
      sessionCount: sql<number>`count(*)`,
      questionCount: sql<number>`coalesce(sum(${studySessions.questionCount}), 0)`,
      correctCount: sql<number>`coalesce(sum(${studySessions.correctCount}), 0)`,
      studyTimeSeconds: sql<number>`coalesce(sum(${studySessions.studyTimeSeconds}), 0)`,
      // 学習日数（同じ日の複数セッションは1日と数える）
      studyDays: sql<number>`count(distinct date(${studySessions.startedAt}))`,
    })
    .from(studySessions);

  const row = sinceIso
    ? base.where(gte(studySessions.startedAt, sinceIso)).get()
    : base.get();

  return (
    row ?? {
      sessionCount: 0,
      questionCount: 0,
      correctCount: 0,
      studyTimeSeconds: 0,
      studyDays: 0,
    }
  );
}

// 学習ストリーク（CLAUDE.md セクション22）：連続学習日数
export function getStudyDates(limit = 400): string[] {
  const rows = db
    .select({
      day: sql<string>`date(${studySessions.startedAt})`,
    })
    .from(studySessions)
    .groupBy(sql`date(${studySessions.startedAt})`)
    .orderBy(desc(sql`date(${studySessions.startedAt})`))
    .limit(limit)
    .all();
  return rows.map((r) => r.day);
}
