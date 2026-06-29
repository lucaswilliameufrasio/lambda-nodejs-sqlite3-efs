export interface Config {
  port: number;
  databasePath: string;
  sqsQueueUrl: string;
  nodeEnv: string;
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env["PORT"] || "8080", 10),
    databasePath: process.env["DATABASE_PATH"] || "./users.db",
    sqsQueueUrl: process.env["SQS_QUEUE_URL"] || "",
    nodeEnv: process.env["NODE_ENV"] || "development",
  };
}
