import type { FastifyReply } from "fastify";
import { ErrorCode } from "./types.js";
import type { HttpErrorBody } from "./types.js";

function sendError(
  reply: FastifyReply,
  status: number,
  body: HttpErrorBody,
): void {
  reply.status(status).send(body);
}

export function badRequest(
  reply: FastifyReply,
  message: string,
  extra?: Record<string, unknown>,
): void {
  sendError(reply, 400, {
    message,
    error_code: ErrorCode.ValidationError,
    extra,
  });
}

export function notFound(
  reply: FastifyReply,
  message: string,
  extra?: Record<string, unknown>,
): void {
  sendError(reply, 404, {
    message,
    error_code: ErrorCode.UnexpectedError,
    extra,
  });
}

export function internalError(
  reply: FastifyReply,
  message: string,
  extra?: Record<string, unknown>,
): void {
  sendError(reply, 500, {
    message,
    error_code: ErrorCode.UnexpectedError,
    extra,
  });
}

export function queueNotConfigured(reply: FastifyReply): void {
  sendError(reply, 500, {
    message: "queue not configured",
    error_code: ErrorCode.QueueNotConfigured,
  });
}

export function unsupportedEventType(reply: FastifyReply): void {
  sendError(reply, 400, {
    message: "unsupported event type",
    error_code: ErrorCode.UnsupportedEventType,
  });
}

export function eventProcessingFailed(
  reply: FastifyReply,
  reason: string,
): void {
  sendError(reply, 500, {
    message: "event processing failed",
    error_code: ErrorCode.EventProcessingFailed,
    extra: { reason },
  });
}
