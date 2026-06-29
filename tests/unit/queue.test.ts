import { describe, it, expect } from "vitest";
import type { WriteMessage } from "../../src/types.js";

describe("WriteMessage structure", () => {
  it("produces a valid message shape", () => {
    const requestId = crypto.randomUUID();

    const message: WriteMessage = {
      type: "user.create",
      requestId,
      timestamp: new Date().toISOString(),
      payload: {
        name: "Alice",
        email: "alice@example.com",
      },
    };

    expect(message.type).toBe("user.create");
    expect(message.requestId).toBe(requestId);
    expect(message.payload.name).toBe("Alice");
    expect(message.payload.email).toBe("alice@example.com");

    const serialized = JSON.stringify(message);
    const parsed = JSON.parse(serialized) as WriteMessage;

    expect(parsed.requestId).toBe(requestId);
    expect(parsed.payload.name).toBe("Alice");
  });
});
