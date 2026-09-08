import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";

import * as schema from "./schema";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "kazu.db");

// Next.jsのdevモードではモジュールが再評価されるため、globalに接続を保持する
const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
};

const sqlite = globalForDb.sqlite ?? new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });

export * as schema from "./schema";
