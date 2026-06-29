import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { Config } from "@/config.js";
import { randomUUID } from "node:crypto";

let client: SQSClient | undefined;

function getClient(_config: Config): SQSClient {
  if (client !== undefined) {
    return client;
  }

  client = new SQSClient({
    region: process.env["AWS_REGION"] || "us-east-1",
    endpoint: process.env["AWS_ENDPOINT_URL"] || undefined,
  });

  return client;
}

export interface EnqueueResult {
  messageId: string;
  requestId: string;
}

export async function enqueueWrite(
  config: Config,
  payload: { name: string; email: string },
): Promise<EnqueueResult> {
  const sqs = getClient(config);
  const requestId = randomUUID();

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: config.sqsQueueUrl,
      MessageBody: JSON.stringify({
        type: "user.create",
        requestId,
        timestamp: new Date().toISOString(),
        payload,
      }),
      MessageGroupId: "user-writes",
      MessageDeduplicationId: requestId,
    }),
  );

  return { messageId: requestId, requestId };
}
