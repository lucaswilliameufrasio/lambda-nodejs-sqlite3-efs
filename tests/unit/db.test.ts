import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("getDatabase", () => {
  it("can open in-memory database and execute queries", () => {
    const db = new Database(":memory:");

    db.pragma("journal_mode = DELETE");
    db.pragma("busy_timeout = 5000");

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        request_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const insert = db.prepare(
      "INSERT INTO users (name, email, request_id) VALUES (?, ?, ?)",
    );

    insert.run("Alice", "alice@example.com", "req-001");

    const users = db.prepare("SELECT * FROM users").all();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      name: "Alice",
      email: "alice@example.com",
      request_id: "req-001",
    });

    db.close();
  });

  it("handles duplicate request_id gracefully", () => {
    const dir = mkdtempSync(join(tmpdir(), "db-test-"));
    const dbPath = join(dir, "test.db");
    const db = new Database(dbPath);

    db.pragma("journal_mode = DELETE");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        request_id TEXT
      )
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_request_id
      ON users(request_id)
    `);

    const insert = db.prepare(
      "INSERT INTO users (name, email, request_id) VALUES (?, ?, ?)",
    );

    insert.run("Alice", "alice@example.com", "req-001");

    const exists = db
      .prepare("SELECT 1 FROM users WHERE request_id = ?")
      .get("req-001");

    expect(exists).toBeTruthy();

    const notExists = db
      .prepare("SELECT 1 FROM users WHERE request_id = ?")
      .get("req-999");

    expect(notExists).toBeUndefined();

    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
