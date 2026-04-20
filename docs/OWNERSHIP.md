# Team Ownership & Responsibilities

## Agents

| Agent | Role | Scope |
|-------|------|-------|
| **sde** | Software Engineer | Core pipeline code, Lambda handlers, OpenSearch client, types, ingestion logic |
| **devops** | DevOps / Infra | CDK stacks, IAM, OpenSearch Serverless, Docker Compose, CI/CD, deployment |
| **test** | QA / Validation | Integration tests, dashboard validation, test data generation, documentation |
| **aibuilder** | AI/ML Engineer | Advanced analytics, anomaly detection, quality scoring, cost forecasting |

## Code Ownership

```
src/                    → sde
  ingestion/            → sde
  opensearch/           → sde
  s3/                   → sde
  types.ts              → sde
  config.ts             → sde
infra/                  → devops
  bedrock-monitor-stack → devops
  (future lambdas CDK)  → devops
scripts/                → shared
  pull-metrics.ts       → sde
  generate-test-*       → test
  setup-bedrock-*       → devops
  export-dashboards.ts  → sde
dashboards/             → shared (sde creates, test validates, aibuilder extends)
docs/                   → shared
docker-compose.yml      → devops
.github/                → devops
```
