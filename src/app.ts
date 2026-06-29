import Fastify from "fastify";
import type { Config } from "@/config.js";
import type Database from "better-sqlite3";
import { registerHttpRoutes } from "@/routes/http.js";
import { registerEventRoutes } from "@/routes/events.js";

export function createApp(config: Config, db: Database.Database) {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === "production" ? "info" : "debug",
    },
  });

  registerHttpRoutes(app, config, db);
  registerEventRoutes(app, config, db);

  return app;
}
