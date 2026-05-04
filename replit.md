# CLAIMAI — AI Healthcare Claims Automation

## Overview

End-to-end AI healthcare insurance claims automation system with an 8-agent pipeline and a React dashboard for submitting and monitoring claims in real time.

pnpm workspace monorepo using TypeScript throughout.

## Architecture

### Artifacts
- **`artifacts/api-server`** — Express 5 API server (`@workspace/api-server`), port 8080, routes at `/api`
- **`artifacts/claims-dashboard`** — React + Vite frontend (`@workspace/claims-dashboard`), port 25068, path `/`

### Shared Libraries
- **`lib/api-spec`** — OpenAPI YAML spec + Orval codegen → React Query hooks + Zod schemas
- **`lib/api-zod`** — Generated Zod request/response schemas (do not edit manually)
- **`lib/api-hooks`** — Generated React Query hooks (do not edit manually)
- **`lib/db`** — Drizzle ORM schema + migrations (PostgreSQL)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (server bundle)
- **Frontend**: React 19, Vite 7, Wouter (routing), TanStack Query, Recharts, Tailwind CSS

## The 8 AI Agents

All agents live in `artifacts/api-server/src/agents/`:

| Agent | File | Role |
|---|---|---|
| Intake | `intake.ts` | Validates patient eligibility, extracts basic claim info |
| Clinical NLP | `clinical-nlp.ts` | Parses doctor notes, extracts diagnoses & procedures |
| Coding | `coding.ts` | Maps clinical entities to ICD-10 / CPT codes |
| Optimization | `optimization.ts` | Optimizes code selection for maximum reimbursement |
| Submission | `submission.ts` | Formats and submits claim to payer |
| Monitoring | `monitoring.ts` | Tracks payer response and claim status |
| Denial Handling | `denial-handling.ts` | Analyzes denials and prepares appeals |
| Payment Reconciliation | `payment-reconciliation.ts` | Matches EOB to expected payment, flags underpayments |

The orchestrator (`orchestrator.ts`) runs them sequentially via `setImmediate` after claim creation.

## Database Schema (lib/db/src/schema/)

- **`patients`** — patient demographics and insurance info
- **`claims`** — claim lifecycle with status, codes, amounts, risk scores
- **`claim_agent_steps`** — per-agent execution results and outputs
- **`claim_events`** — audit log of every claim state change

## API Routes

| Prefix | File | Description |
|---|---|---|
| `/api/claims` | `routes/claims.ts` | CRUD + list/filter claims |
| `/api/patients` | `routes/patients.ts` | CRUD + list patients |
| `/api/dashboard` | `routes/dashboard.ts` | Summary, revenue, activity, denial-analysis |
| `/api/agents` | `routes/agents.ts` | Agent status and step details |

## Frontend Pages

- `/` — Dashboard (KPI cards, revenue chart, denial analysis, recent activity)
- `/claims` — Claims table with search/filter, ICD/CPT badges, risk scores
- `/claims/:id` — Claim detail with agent pipeline timeline, step outputs
- `/patients` — Patients table with eligibility status
- `/patients/:id` — Patient detail with linked claims history
- `/submit` — Submit new claim or register new patient

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Express session secret
- `PORT` — assigned per workflow by Replit

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
