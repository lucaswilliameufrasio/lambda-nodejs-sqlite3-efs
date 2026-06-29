import * as esbuild from "esbuild";
import { existsSync, rmSync, mkdirSync } from "node:fs";

if (existsSync("dist")) {
  rmSync("dist", { recursive: true });
}
mkdirSync("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  platform: "node",
  target: "node22",
  format: "esm",
  external: ["better-sqlite3"],
  sourcemap: false,
  minify: true,
  treeShaking: true,
  banner: {
    js: `
import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);
`,
  },
});

console.log("Built dist/index.js");
