import { loadConfig } from "@/config.js";
import { getDatabase } from "@/db.js";
import { createApp } from "@/app.js";

const config = loadConfig();
const db = getDatabase(config);
const app = createApp(config, db);

const start = async () => {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
