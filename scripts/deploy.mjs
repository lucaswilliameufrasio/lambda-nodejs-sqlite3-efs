import { LambdaClient, UpdateFunctionCodeCommand, waitUntilFunctionUpdated } from "@aws-sdk/client-lambda";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

function getLambdaFunctionName() {
  if (process.env["LAMBDA_FUNCTION_NAME"]) {
    return process.env["LAMBDA_FUNCTION_NAME"];
  }

  try {
    const name = execSync(
      "tofu -chdir=terraform output -raw lambda_function_name 2>/dev/null",
      { encoding: "utf8", timeout: 10000 },
    ).trim();
    if (name) return name;
  } catch {
    // tofu not available or not initialized
  }

  console.error(
    "Could not determine Lambda function name. " +
    "Set LAMBDA_FUNCTION_NAME env var or run `tofu apply` first.",
  );
  process.exit(1);
}

function getRegion() {
  if (process.env["AWS_REGION"]) return process.env["AWS_REGION"];
  if (process.env["AWS_DEFAULT_REGION"]) return process.env["AWS_DEFAULT_REGION"];

  try {
    const region = execSync(
      "tofu -chdir=terraform output -raw region 2>/dev/null",
      { encoding: "utf8", timeout: 10000 },
    ).trim();
    if (region) return region;
  } catch {
    // tofu not available
  }

  return "us-east-1";
}

const functionName = getLambdaFunctionName();
const region = getRegion();
const endpoint = process.env["AWS_ENDPOINT_URL"] || undefined;

if (!existsSync("lambda.zip")) {
  console.error("lambda.zip not found. Run `nub run build && nub run package` first.");
  process.exit(1);
}

const client = new LambdaClient({ region, endpoint });

const zipFile = readFileSync("lambda.zip");
const sizeKB = (zipFile.length / 1024).toFixed(1);

console.log(`Updating ${functionName} with lambda.zip (${sizeKB} KB)...`);

const result = await client.send(
  new UpdateFunctionCodeCommand({
    FunctionName: functionName,
    ZipFile: zipFile,
  }),
);

console.log(`Update triggered: ${result.FunctionArn}`);

await waitUntilFunctionUpdated(
  { client, maxWaitTime: 120 },
  { FunctionName: functionName },
);

console.log("Function update completed successfully");
