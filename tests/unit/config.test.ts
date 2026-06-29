import { describe, it, expect, beforeEach, afterEach } from "vitest";

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV };
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe("loadConfig", () => {
  it("returns defaults when no env vars are set", async () => {
    process.env = { ...OLD_ENV };
    delete process.env["PORT"];
    delete process.env["DATABASE_PATH"];
    delete process.env["SQS_QUEUE_URL"];
    delete process.env["NODE_ENV"];

    const { loadConfig } = await import("@/config.js");
    const config = loadConfig();

    expect(config.port).toBe(8080);
    expect(config.databasePath).toBe("./users.db");
    expect(config.sqsQueueUrl).toBe("");
    expect(config.nodeEnv).toBe("development");
  });

  it("reads values from environment variables", async () => {
    process.env["PORT"] = "3000";
    process.env["DATABASE_PATH"] = "/mnt/volume/db.sqlite";
    process.env["SQS_QUEUE_URL"] = "http://sqs:4566/000000000000/queue.fifo";
    process.env["NODE_ENV"] = "production";

    const { loadConfig } = await import("@/config.js");
    const config = loadConfig();

    expect(config.port).toBe(3000);
    expect(config.databasePath).toBe("/mnt/volume/db.sqlite");
    expect(config.sqsQueueUrl).toBe("http://sqs:4566/000000000000/queue.fifo");
    expect(config.nodeEnv).toBe("production");
  });
});
