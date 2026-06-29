import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import type Database from "better-sqlite3";
import type { SQSEvent, WriteMessage } from "../types.js";

function isSQSEvent(body: unknown): body is SQSEvent {
  return (
    typeof body === "object" &&
    body !== null &&
    "Records" in body &&
    Array.isArray((body as SQSEvent).Records)
  );
}

function processRecord(db: Database.Database, recordBody: string): void {
  const message: WriteMessage = JSON.parse(recordBody);

  if (message.type !== "user.create") {
    return;
  }

  const exists = db
    .prepare("SELECT 1 FROM users WHERE request_id = ?")
    .get(message.requestId);

  if (exists) {
    return;
  }

  db.prepare(
    "INSERT INTO users (name, email, request_id) VALUES (?, ?, ?)",
  ).run(message.payload.name, message.payload.email, message.requestId);
}

export function registerEventRoutes(
  app: FastifyInstance,
  _config: Config,
  db: Database.Database,
): void {
  app.post("/events", async (request, reply) => {
    const body = request.body;

    if (!isSQSEvent(body)) {
      return reply.status(400).send({
        error: "unsupported event type",
        expected: "sqs",
      });
    }

    try {
      const insert = db.transaction((records: SQSEvent["Records"]) => {
        for (const record of records) {
          processRecord(db, record.body);
        }
      });

      insert(body.Records);

      return reply.status(200).send({
        processed: body.Records.length,
      });
    } catch (err) {
      return reply.status(500).send({
        error: "processing failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
