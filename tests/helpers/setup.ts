import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function createTestDatabase(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "lambda-sqlite-test-"));
  const path = join(dir, "test.db");
  return {
    path,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
