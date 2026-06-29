export interface UserBody {
  name: string;
  email: string;
}

export interface SQSRecord {
  messageId: string;
  receiptHandle: string;
  body: string;
  attributes: Record<string, string>;
  messageAttributes: Record<string, unknown>;
  md5OfBody: string;
  eventSource: string;
  eventSourceARN: string;
  awsRegion: string;
}

export interface SQSEvent {
  Records: SQSRecord[];
}

export interface WriteMessage {
  type: "user.create";
  requestId: string;
  timestamp: string;
  payload: {
    name: string;
    email: string;
  };
}
