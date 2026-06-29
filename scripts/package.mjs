import { execSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync, cpSync } from "node:fs";
import { stripNodeModules } from "./strip-modules.mjs";

const useDocker = process.argv.includes("--docker") || process.env["BUILD_IN_DOCKER"] === "true";

if (!existsSync("dist/index.js")) {
  throw new Error("Build output not found. Run `nub run build` first.");
}

if (existsSync("lambda.zip")) {
  rmSync("lambda.zip");
}

if (existsSync("staging")) {
  rmSync("staging", { recursive: true });
}

if (useDocker) {
  console.log("Building in Docker for Linux arm64...");

  execSync(
    "docker buildx build " +
      "--platform linux/arm64 " +
      "-f docker/build.Dockerfile " +
      "-t lambda-builder " +
      ".",
    { stdio: "inherit" },
  );

  execSync(
    "docker run --rm --entrypoint sh -v $(pwd):/output lambda-builder -c 'cp /build/lambda.zip /output/'",
    { stdio: "inherit" },
  );

  console.log("Lambda zip created via Docker");
} else {
  console.log("Creating production-minimal lambda.zip...");

  mkdirSync("staging/dist", { recursive: true });

  cpSync("dist/index.js", "staging/dist/index.js");
  cpSync("run.sh", "staging/run.sh");
  cpSync("package.json", "staging/package.json");
  if (existsSync("package-lock.json")) {
    cpSync("package-lock.json", "staging/package-lock.json");
  }

  execSync(
    "npm install --omit=dev --no-audit --no-fund --prefix staging 2>&1",
    { stdio: "inherit" },
  );

  rmSync("staging/package.json");
  rmSync("staging/package-lock.json", { force: true });

  stripNodeModules("staging/node_modules");

  execSync(
    "cd staging && zip -r ../lambda.zip . " +
      '-x "node_modules/.cache/*"',
    { stdio: "inherit" },
  );

  rmSync("staging", { recursive: true });

  const stats = existsSync("lambda.zip")
    ? execSync("ls -lh lambda.zip", { encoding: "utf8" }).trim()
    : "";
  console.log(`Created ${stats}`);
}
