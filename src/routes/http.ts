import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import type Database from "better-sqlite3";
import { enqueueWrite } from "../queue.js";
import type { UserBody } from "../types.js";

export function registerHttpRoutes(
  app: FastifyInstance,
  config: Config,
  db: Database.Database,
): void {
  app.get("/", async () => {
    return { hello: "world" };
  });

  app.get("/users", async () => {
    const users = db.prepare("SELECT id, name, email, created_at FROM users ORDER BY id").all();
    return users;
  });

  app.post<{ Body: UserBody }>("/users", async (request, reply) => {
    const { name, email } = request.body;

    if (!name || typeof name !== "string") {
      return reply.status(400).send({ error: "name is required" });
    }
    if (!email || typeof email !== "string") {
      return reply.status(400).send({ error: "email is required" });
    }

    if (!config.sqsQueueUrl) {
      return reply.status(500).send({ error: "queue not configured" });
    }

    const result = await enqueueWrite(config, { name, email });

    return reply.status(202).send({
      status: "accepted",
      requestId: result.requestId,
      message: "User creation queued",
    });
  });
}
