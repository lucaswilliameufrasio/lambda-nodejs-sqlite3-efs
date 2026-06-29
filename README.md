# Lambda Node.js SQLite3 EFS

Fastify + SQLite on EFS with SQS write serialization via AWS Lambda Web Adapter.

## Architecture

- **OpenTofu** provisions all AWS resources: Lambda, API Gateway HTTP API, EFS, SQS FIFO queue, IAM, and networking.
- **Lambda Web Adapter** runs a Fastify web server inside the Lambda runtime, handling both HTTP requests and SQS event forwarding.
- **SQS FIFO** serializes database writes to avoid SQLite single-writer contention on EFS.
- **TypeScript** app bundled with **esbuild** for minimal cold start overhead.
- **arm64** architecture for better Lambda price/performance.

### Write Path

```
HTTP POST /users -> validate -> enqueue SQS FIFO -> 202 Accepted
SQS event -> Lambda Web Adapter -> POST /events -> write to SQLite on EFS
```

### Read Path

```
HTTP GET /users -> read SQLite on EFS directly -> return results
```

## Prerequisites

- [OpenTofu](https://opentofu.org/docs/intro/install/) >= 1.8
- [nub](https://nubjs.com) >= 0.2 (`npm install -g @nubjs/nub`)
- [Docker](https://docker.com) (for Linux arm64 native packaging)
- [AWS CLI](https://aws.amazon.com/cli/) (for live AWS smoke tests)

Optional:
- [Floci](https://floci.io) (local AWS emulation via Docker)

## Quick Start

### 1. Install dependencies

```bash
nub install
```

### 2. Build the app

```bash
nub run build
```

### 3. Run tests

```bash
nub run test
```

### 4. Package the Lambda artifact

For local testing (macOS binaries, dev only):

```bash
nub run package
```

For Linux arm64 (production Lambda):

```bash
nub run package -- --docker
```

### 5. Provision infrastructure

First time:

```bash
nub run infra:apply
```

This creates:
- Lambda function with placeholder code
- API Gateway HTTP API
- SQS FIFO queue + DLQ
- EFS filesystem
- VPC networking

### 6. Deploy Lambda code

```bash
export LAMBDA_FUNCTION_NAME=lambda-nodejs-sqlite3-efs-api
nub run deploy
```

This only updates the Lambda code — no infra changes.

## Development with Floci

Floci provides local AWS emulation via Docker. It supports Lambda, API Gateway v2, SQS, and event source mappings.

### Start Floci

```bash
docker run -d --name floci \
  -p 4566:4566 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  floci/floci:latest
```

### Configure environment

```bash
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export LAMBDA_FUNCTION_NAME=my-function
```

### Provision and test locally

```bash
# Point OpenTofu at Floci
tofu -chdir=terraform init -backend=false
tofu -chdir=terraform plan

# Run deploy script against Floci
nub run deploy
```

Floci can validate the Lambda creation, SQS event source mapping, and code update flow.
It does not support Lambda layers or EFS — final smoke tests require real AWS.

## Testing

### Unit tests

```bash
nub run test:unit
```

### Integration tests

```bash
nub run test:integration
```

### All tests

```bash
nub run test
```

Tests use in-memory SQLite databases and Fastify's `inject` for HTTP simulation.

## Write Semantics

`POST /users` is asynchronous:
- Returns `202 Accepted` with a `requestId`
- The actual write happens via SQS FIFO -> Lambda -> SQLite
- Reads (`GET /users`) are always consistent with committed data

This tradeoff solves the SQLite single-writer problem without forcing all HTTP traffic through one concurrent invocation.

## FIFO Queue Design

- Single `MessageGroupId` (`user-writes`) ensures strict serialization
- `MessageDeduplicationId` prevents duplicate delivery within the 5-minute dedup window
- A `processed_messages` tracking table prevents duplicates beyond the dedup window
- `batchSize: 1` ensures one active writer at a time
- DLQ captures messages after 3 failed delivery attempts

## SQLite on EFS

- `journal_mode = DELETE` (safer on network storage than WAL)
- `busy_timeout = 5000`
- `synchronous = NORMAL`
- The destructive DB-file-deletion-on-error behavior has been removed
- EFS-backed SQLite is the main performance ceiling — this design fixes the writer contention, not the storage latency

## Project Structure

```
├── docker/
│   └── build.Dockerfile      # Linux arm64 build environment
├── scripts/
│   ├── build.mjs             # esbuild bundler
│   ├── package.mjs           # zip artifact creator
│   └── deploy.mjs            # Lambda code updater
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Fastify app setup
│   ├── config.ts             # Environment configuration
│   ├── db.ts                 # SQLite connection and schema
│   ├── queue.ts              # SQS client for writes
│   ├── routes/
│   │   ├── http.ts           # HTTP route handlers
│   │   └── events.ts         # SQS event handler
│   └── types.ts              # Shared types
├── tests/
│   ├── unit/
│   │   ├── config.test.ts
│   │   ├── queue.test.ts
│   │   └── db.test.ts
│   ├── integration/
│   │   └── routes.test.ts
│   ├── fixtures/
│   │   └── sqs-event.json
│   └── helpers/
│       └── setup.ts
├── terraform/
│   ├── versions.tf           # Provider and OpenTofu version
│   ├── main.tf               # Locals and tags
│   ├── network.tf            # VPC, subnets, security groups
│   ├── efs.tf                # EFS + access point + mount target
│   ├── sqs.tf                # SQS FIFO queue + DLQ
│   ├── iam.tf                # Lambda IAM role and policies
│   ├── lambda.tf             # Lambda function + event source mapping
│   ├── api.tf                # API Gateway HTTP API
│   └── outputs.tf            # Outputs
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── run.sh                    # Lambda startup script
└── README.md
```

## Migration Notes

### From Terraform to OpenTofu

All references to `terraform` in commands and docs have been replaced with `tofu`. The lockfile name (`.terraform.lock.hcl`) remains unchanged — OpenTofu uses the same format.

### From Serverless Framework

Infrastructure previously managed by `serverless.yml` is now fully owned by OpenTofu. The Lambda deployment script (`deploy`) handles code-only updates without touching infrastructure.

## Benchmark

The project includes a GitHub Actions workflow to run local benchmarks with k6:

```bash
nub run bench:k6
```

The workflow:
1. Starts Floci for local SQS emulation
2. Creates a FIFO queue
3. Starts the API locally
4. Runs a mixed k6 scenario (GET /, GET /users, POST /users)
5. Generates an HTML report
6. Deploys the report to GitHub Pages

### Enabling GitHub Pages

For the report to be accessible, enable GitHub Pages in the repository:

1. Go to **Settings > Pages**
2. Under **Source**, select **Deploy from a branch**
3. Set branch to **gh-pages** and folder to **/ (root)**
4. Click **Save**

After the first benchmark run completes, the report is available at:

```
https://{owner}.github.io/{repo}/benchmark/latest
```

> POST /users measures enqueue latency (202 acceptance), not persistence latency.

## Caveats

- Floci does not support Lambda layers or EFS — those require real AWS validation
- SQLite on EFS has write latency that exceeds DynamoDB or RDS — this design eliminates write contention, not storage latency
- The deploy script uses `LAMBDA_FUNCTION_NAME` env var — set it before running
- `node_modules/` includes a native module for `better-sqlite3` — local packaging produces macOS binaries; use `--docker` for production Lambda zips
