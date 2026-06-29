import type { Config } from "@/config.js";
import Database from "better-sqlite3";

let db: Database.Database | undefined;

export function getDatabase(config: Config): Database.Database {
  if (db !== undefined) {
    return db;
  }

  db = new Database(config.databasePath);

  db.pragma("journal_mode = DELETE");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      request_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_request_id
    ON users(request_id)
  `);

  return db;
}

export function closeDatabase(): void {
  if (db === undefined) {
    return;
  }

  db.close();
  db = undefined;
}
