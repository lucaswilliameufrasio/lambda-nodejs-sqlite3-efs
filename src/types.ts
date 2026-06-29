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

export enum ErrorCode {
  UnexpectedError = "UNEXPECTED_ERROR",
  Unauthorized = "UNAUTHORIZED",
  ValidationError = "VALIDATION_ERROR",
  QueueNotConfigured = "QUEUE_NOT_CONFIGURED",
  UnsupportedEventType = "UNSUPPORTED_EVENT_TYPE",
  EventProcessingFailed = "EVENT_PROCESSING_FAILED",
}

export interface HttpErrorBody {
  message: string;
  error_code: `${ErrorCode}`;
  extra?: Record<string, unknown>;
}
