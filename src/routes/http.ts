import type { FastifyInstance } from "fastify";
import type { Config } from "@/config.js";
import type Database from "better-sqlite3";
import { enqueueWrite } from "@/queue.js";
import type { UserBody } from "@/types.js";
import { badRequest, queueNotConfigured } from "@/http-errors.js";

export function registerHttpRoutes(
  app: FastifyInstance,
  config: Config,
  db: Database.Database,
): void {
  app.get("/", async () => {
    return { hello: "world" };
  });

  app.get("/users", async () => {
    const users = db
      .prepare("SELECT id, name, email, created_at FROM users ORDER BY id")
      .all();

    return users;
  });

  app.post<{ Body: UserBody }>("/users", async (request, reply) => {
    const { name, email } = request.body;

    if (typeof name !== "string" || name.length === 0) {
      return badRequest(reply, "name is required");
    }

    if (typeof email !== "string" || email.length === 0) {
      return badRequest(reply, "email is required");
    }

    if (config.sqsQueueUrl.length === 0) {
      return queueNotConfigured(reply);
    }

    const result = await enqueueWrite(config, { name, email });

    return reply.status(202).send({
      status: "accepted",
      requestId: result.requestId,
      message: "User creation queued",
    });
  });
}
