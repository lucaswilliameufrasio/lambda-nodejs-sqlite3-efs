import { rmSync, readdirSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const keep = new Set([
  "better-sqlite3", "bindings", "file-uri-to-path",
]);

export function stripNodeModules(nmPath) {
  for (const entry of readdirSync(nmPath)) {
    const fullPath = join(nmPath, entry);
    if (entry.startsWith("@")) {
      for (const sub of readdirSync(fullPath)) {
        if (!keep.has("@" + sub) && !keep.has(entry + "/" + sub)) {
          rmSync(join(fullPath, sub), { recursive: true, force: true });
        }
      }
      const remaining = readdirSync(fullPath);
      if (remaining.length === 0) {
        rmSync(fullPath, { recursive: true, force: true });
      }
    } else if (!keep.has(entry)) {
      rmSync(fullPath, { recursive: true, force: true });
    }
  }

  const bs3Path = join(nmPath, "better-sqlite3");
  if (existsSync(bs3Path)) {
    const buildPath = join(bs3Path, "build");
    if (existsSync(buildPath)) {
      for (const entry of readdirSync(buildPath)) {
        if (entry !== "Release") {
          rmSync(join(buildPath, entry), { recursive: true, force: true });
        }
      }
      const releasePath = join(buildPath, "Release");
      if (existsSync(releasePath)) {
        for (const entry of readdirSync(releasePath)) {
          if (entry !== "better_sqlite3.node") {
            rmSync(join(releasePath, entry), { recursive: true, force: true });
          }
        }
      }
    }
    for (const file of ["binding.gyp", "binding.gypi", "deps", "src"]) {
      const p = join(bs3Path, file);
      if (existsSync(p)) rmSync(p, { recursive: true, force: true });
    }
  }

  const toRemove = [join(nmPath, ".bin"), join(nmPath, ".package-lock.json")];
  for (const p of toRemove) {
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }

  console.log("node_modules stripped:", readdirSync(nmPath).join(", "));
}
