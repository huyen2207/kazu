import { desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../index";
import { questions, type NewQuestionRow, type QuestionRow } from "../schema";

// Validator PASS済みの問題のみ保存すること（CLAUDE.md セクション3）
export function insertQuestions(rows: NewQuestionRow[]): void {
  if (rows.length === 0) return;
  db.insert(questions).values(rows).run();
}

export function getQuestionById(id: string): QuestionRow | undefined {
  return db.select().from(questions).where(eq(questions.id, id)).get();
}

export function getQuestionsByIds(ids: string[]): QuestionRow[] {
  if (ids.length === 0) return [];
  return db.select().from(questions).where(inArray(questions.id, ids)).all();
}

// Generatorへ渡す重複防止コンテキスト用（CLAUDE.md セクション9）
export function getRecentQuestions(limit = 50): QuestionRow[] {
  return db
    .select()
    .from(questions)
    .orderBy(desc(questions.createdAt))
    .limit(limit)
    .all();
}

export function getRecentTargetVocabulary(limit = 50): string[] {
  const rows = db
    .select({ targetVocabulary: questions.targetVocabulary })
    .from(questions)
    .orderBy(desc(questions.createdAt))
    .limit(limit)
    .all();
  return [...new Set(rows.map((r) => r.targetVocabulary))];
}

export function countQuestions(): number {
  const row = db.select({ count: sql<number>`count(*)` }).from(questions).get();
  return row?.count ?? 0;
}
