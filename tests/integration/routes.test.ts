import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { createApp } from "../../src/app.js";
import type { Config } from "../../src/config.js";
import sqsEvent from "../fixtures/sqs-event.json" with { type: "json" };

let db: Database.Database;
let config: Config;

beforeAll(() => {
  db = new Database(":memory:");
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_request_id
    ON users(request_id)
  `);

  config = {
    port: 0,
    databasePath: ":memory:",
    sqsQueueUrl: "",
    nodeEnv: "test",
  };
});

afterAll(() => {
  db.close();
});

describe("HTTP routes", () => {
  it("GET / returns health check", async () => {
    const app = createApp(config, db);
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ hello: "world" });
  });

  it("GET /users returns empty list initially", async () => {
    const app = createApp(config, db);
    const response = await app.inject({
      method: "GET",
      url: "/users",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("POST /users returns 202 when SQS queue is not configured", async () => {
    const app = createApp(config, db);
    const response = await app.inject({
      method: "POST",
      url: "/users",
      body: { name: "Alice", email: "alice@example.com" },
    });

    expect(response.statusCode).toBe(500);
  });

  it("POST /users validates required fields", async () => {
    const app = createApp(config, db);
    const response = await app.inject({
      method: "POST",
      url: "/users",
      body: { name: "Alice" },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("Events route", () => {
  it("POST /events with SQS event writes users to database", async () => {
    const app = createApp(config, db);

    const response = await app.inject({
      method: "POST",
      url: "/events",
      body: sqsEvent,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ processed: 2 });

    const users = db.prepare("SELECT * FROM users ORDER BY id").all();
    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({
      name: "Alice",
      email: "alice@example.com",
      request_id: "test-request-001",
    });
    expect(users[1]).toMatchObject({
      name: "Bob",
      email: "bob@example.com",
      request_id: "test-request-002",
    });
  });

  it("POST /events is idempotent for duplicate messages", async () => {
    const app = createApp(config, db);

    const first = await app.inject({
      method: "POST",
      url: "/events",
      body: sqsEvent,
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ processed: 2 });

    const second = await app.inject({
      method: "POST",
      url: "/events",
      body: sqsEvent,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ processed: 2 });

    const users = db.prepare("SELECT * FROM users ORDER BY id").all();
    expect(users).toHaveLength(2);
  });

  it("POST /events returns 400 for non-SQS body", async () => {
    const app = createApp(config, db);

    const response = await app.inject({
      method: "POST",
      url: "/events",
      body: { someOtherEvent: true },
    });

    expect(response.statusCode).toBe(400);
  });
});
