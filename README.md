# ClaimAI - AI-Powered Healthcare Insurance Claims Automation

A full-stack healthcare insurance claims automation system that processes doctor clinical notes through an 8-agent AI pipeline to generate, submit, predict, and reconcile insurance claims automatically.

**Author:** Sharath Ankenapally

---

## What It Does

ClaimAI removes the manual work from healthcare billing. A doctor pastes clinical notes, and the system handles everything else: extracting diagnosis codes, assigning CPT codes, checking denial risk, submitting to the insurer, handling rejections, and reconciling the final payment.

---

## System Architecture

### 8-Agent AI Pipeline

Every claim passes through these agents in sequence:

| Step | Agent | What It Does |
|------|-------|-------------|
| 1 | Intake Agent | Validates patient eligibility and claim completeness |
| 2 | Clinical NLP Agent | Extracts diagnoses, symptoms, and procedures from doctor notes |
| 3 | Coding Agent | Assigns ICD-10 diagnosis codes and CPT procedure codes |
| 4 | Optimization Agent | Scores denial risk (0-100%) and recommends fixes |
| 5 | Submission Agent | Generates X12 837P EDI and submits to the insurer |
| 6 | Monitoring Agent | Polls payer for APPROVED / DENIED / PENDING response |
| 7 | Denial Handling Agent | Auto-fixes denial reasons and resubmits corrected claim |
| 8 | Payment Reconciliation Agent | Reconciles expected vs actual payment, flags underpayments |

### Risk Gate (Auto-Fix Loop)

After the Optimization Agent, if the risk score exceeds 0.70 the system enters an auto-fix loop (up to 2 retries) before submitting. It replaces vague ICD codes, strips unresolvable flags, and re-optimizes until the score clears the threshold.

### Denial Resubmit Loop

After the Denial Handling Agent corrects a claim, the Monitoring Agent is re-invoked automatically to re-poll the payer on the resubmission.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | TypeScript, Express 5, Node.js |
| Database | PostgreSQL with Drizzle ORM |
| API Contract | OpenAPI spec with Orval codegen |
| Frontend | React 18, Vite, Tailwind CSS |
| Charts | Recharts |
| Monorepo | pnpm workspaces |

---

## Database Schema

The system writes to 9 tables across the claim lifecycle:

- `patients` - Patient demographics and insurance info
- `claims` - Core claim record with status, risk score, ICD and CPT codes
- `claim_agent_steps` - Per-agent execution log with timestamps
- `claim_events` - Chronological event log for every pipeline decision
- `clinical_notes` - Raw doctor notes stored per visit
- `extracted_clinical_data` - NLP output: diagnoses, symptoms, procedures, severity score
- `insurance_details` - Coverage dates, plan type, eligibility per patient
- `claim_intelligence` - AI risk score, denial probability, issues, and recommendations
- `payments` - Expected vs received amounts, payer reference, payment status
- `audit_logs` - Full compliance audit trail of every agent action and system decision

---

## API Endpoints

### Claims

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/claims | Submit a new claim (starts the pipeline) |
| POST | /api/submit-claim | Alias for POST /api/claims |
| GET | /api/claims | List all claims with filtering and pagination |
| GET | /api/claims/:id | Get a single claim with agent steps |
| GET | /api/claim/:id | Alias for GET /api/claims/:id |
| GET | /api/claims/:id/timeline | Full claim lifecycle: steps, events, intelligence, payments, audit trail |
| GET | /api/claim/:id/timeline | Alias for timeline endpoint |
| POST | /api/claims/:id/resubmit | Restart the full pipeline for a claim |
| GET | /api/claims/:id/events | Chronological event log for a claim |

### Clinical Notes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/clinical-notes | Create a clinical note with NLP extraction |
| GET | /api/clinical-notes/patient/:id | All notes for a patient |

### Patients

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/patients | Register a new patient |
| GET | /api/patients | List all patients |
| GET | /api/patients/:id | Get patient details |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/dashboard/summary | KPI summary (totals, approval rate, avg risk) |
| GET | /api/dashboard/revenue | Revenue reconciliation and monthly breakdown |
| GET | /api/dashboard/denial-analysis | Denial reasons and resubmission success rate |
| GET | /api/dashboard/recent-activity | Live feed of recent agent activity |

---

## Dashboard Features

The React dashboard provides:

- **Live Operations Dashboard** - KPIs, revenue reconciliation chart, denial breakdown, and real-time agent activity feed
- **Insurance Claims Table** - Searchable and filterable list with status guide, denial risk bars, and ICD/CPT codes
- **Claim Detail - Pipeline Tab** - Step-by-step agent progress with live status updates
- **Claim Detail - Full Timeline Tab** - Chronological event log, clinical data, payment reconciliation, compliance audit trail, and agent execution times
- **Claim Detail - AI Intelligence Tab** - Animated risk gauge, denial probability, AI-detected issues, and recommendations
- **Submit Claim Form** - Paste doctor notes and get a fully processed claim in seconds

---

## Project Structure

```
/
|-- artifacts/
|   |-- api-server/          Backend Express API with all 8 agents
|   |   |-- src/agents/      One file per agent + orchestrator
|   |   |-- src/routes/      REST endpoints
|   |-- claims-dashboard/    React + Vite frontend
|   |   |-- src/pages/       Dashboard, Claims, ClaimDetail, Submit, Patients
|   |   |-- src/components/  Layout, StatusBadge, RiskBadge
|-- lib/
|   |-- db/                  Drizzle ORM schema and migrations
|   |-- api-spec/            OpenAPI specification
|   |-- api-zod/             Generated Zod validation schemas
|   |-- api-client-react/    Generated React Query hooks
|-- scripts/                 Utility scripts including DB seed
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Setup

```bash
# Install dependencies
pnpm install

# Set environment variables
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=your-secret-here

# Run database migrations
pnpm --filter @workspace/db run migrate

# Seed sample data
pnpm --filter @workspace/scripts run seed

# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the dashboard
pnpm --filter @workspace/claims-dashboard run dev
```

---

## Key Design Decisions

**Risk Gate at 0.70:** Claims with a predicted denial probability above 70% are held back and auto-fixed before submission, reducing unnecessary denials.

**Contract-First API:** The OpenAPI spec in `lib/api-spec` drives Zod validation schemas and React Query hooks via Orval codegen. The server validates inputs and outputs against these schemas.

**Full Audit Trail:** Every agent action, every system decision, and every state change is written to `audit_logs` with timestamps and metadata for healthcare compliance simulation.

**Denial Loop:** The system does not give up on denied claims. The Denial Handling Agent applies pattern-matched fixes and the Monitoring Agent re-polls the payer automatically.

---

## License

MIT
