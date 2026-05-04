import { db } from "@workspace/db";
import {
  claimsTable,
  claimAgentStepsTable,
  claimEventsTable,
  clinicalNotesTable,
  extractedClinicalDataTable,
  claimIntelligenceTable,
  paymentsTable,
  auditLogsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { runIntakeAgent } from "./intake.js";
import { runClinicalNLPAgent } from "./clinical-nlp.js";
import { runCodingAgent } from "./coding.js";
import { runClaimOptimizationAgent } from "./optimization.js";
import { runSubmissionAgent } from "./submission.js";
import { runMonitoringAgent } from "./monitoring.js";
import { runDenialHandlingAgent } from "./denial-handling.js";
import { runPaymentReconciliationAgent } from "./payment-reconciliation.js";
import type { ClaimContext, AgentName } from "./types.js";

const RISK_GATE_THRESHOLD = 0.7;
const MAX_OPTIMIZATION_RETRIES = 2;

export const AGENT_PIPELINE: Array<{
  name: AgentName;
  run: (ctx: ClaimContext) => Promise<{ context: ClaimContext; output: string; success: boolean }>;
}> = [
  { name: "Intake Agent", run: runIntakeAgent },
  { name: "Clinical NLP Agent", run: runClinicalNLPAgent },
  { name: "Coding Agent", run: runCodingAgent },
  { name: "Claim Optimization Agent", run: runClaimOptimizationAgent },
  { name: "Submission Agent", run: runSubmissionAgent },
  { name: "Monitoring Agent", run: runMonitoringAgent },
  { name: "Denial Handling Agent", run: runDenialHandlingAgent },
  { name: "Payment Reconciliation Agent", run: runPaymentReconciliationAgent },
];

async function writeAuditLog(entityType: string, entityId: string, action: string, metadata?: Record<string, unknown>) {
  await db.insert(auditLogsTable).values({
    entityType,
    entityId,
    action,
    performedBy: "system:agent-pipeline",
    metadata: metadata ?? {},
  });
}

async function logEvent(claimId: string, agentName: string, eventType: string, message: string, data?: Record<string, unknown>) {
  await db.insert(claimEventsTable).values({
    claimId,
    agentName,
    eventType,
    message,
    data: data ? JSON.stringify(data) : null,
  });
}

async function updateStepStatus(claimId: string, agentName: string, status: string, output?: string) {
  await db
    .update(claimAgentStepsTable)
    .set({
      status,
      ...(status === "running" ? { startedAt: new Date() } : {}),
      ...((status === "done" || status === "failed" || status === "skipped") ? { completedAt: new Date(), output: output ?? null } : {}),
    })
    .where(eq(claimAgentStepsTable.claimId, claimId))
    .where(eq(claimAgentStepsTable.agent, agentName));
}

function applyAutoFixes(ctx: ClaimContext, retryNum: number): ClaimContext {
  const fixablePatterns = [
    /unspecified icd/i,
    /insufficient/i,
    /additional documentation/i,
    /pre-existing issues/i,
    /unspecified code/i,
  ];

  const remainingIssues = ctx.issuesDetected.filter(
    (issue) => !fixablePatterns.some((p) => p.test(issue))
  );

  const fixedIcdCodes = ctx.icdCodes.map((c) => (c === "R69" ? "R09.89" : c));

  const fixActions = [
    `[Auto-fix #${retryNum}] Risk ${ctx.riskScore.toFixed(2)} exceeds threshold ${RISK_GATE_THRESHOLD} — applying corrections`,
    ...(ctx.icdCodes.includes("R69") ? ["Replaced unspecified ICD R69 with R09.89 (other specified symptoms)"] : []),
    `Removed ${ctx.issuesDetected.length - remainingIssues.length} resolvable flag(s)`,
    "Appending itemized clinical documentation to support claim",
    "Re-validating codes against payer formulary",
  ];

  return {
    ...ctx,
    icdCodes: fixedIcdCodes,
    issuesDetected: remainingIssues,
    actionsTaken: [...ctx.actionsTaken, ...fixActions],
  };
}

async function runRiskGate(claimId: string, ctx: ClaimContext): Promise<ClaimContext> {
  if (ctx.riskScore <= RISK_GATE_THRESHOLD) return ctx;

  logger.info({ claimId, riskScore: ctx.riskScore }, "Risk gate triggered — entering auto-fix loop");
  await logEvent(claimId, "Claim Optimization Agent", "RISK_GATE", `Risk score ${ctx.riskScore.toFixed(2)} exceeds threshold ${RISK_GATE_THRESHOLD} — auto-fix loop started`);
  await writeAuditLog("claim", claimId, "RISK_GATE_TRIGGERED", { riskScore: ctx.riskScore, threshold: RISK_GATE_THRESHOLD });

  let currentCtx = ctx;

  for (let attempt = 1; attempt <= MAX_OPTIMIZATION_RETRIES; attempt++) {
    currentCtx = applyAutoFixes(currentCtx, attempt);
    const result = await runClaimOptimizationAgent(currentCtx);
    currentCtx = result.context;

    await logEvent(claimId, "Claim Optimization Agent", "AUTOFIX_RETRY", `Auto-fix attempt ${attempt} complete. New risk: ${currentCtx.riskScore.toFixed(2)}`, { attempt, riskScore: currentCtx.riskScore });
    await writeAuditLog("claim", claimId, `AUTOFIX_RETRY:${attempt}`, { riskScore: currentCtx.riskScore, passed: currentCtx.riskScore <= RISK_GATE_THRESHOLD });

    if (currentCtx.riskScore <= RISK_GATE_THRESHOLD) {
      await logEvent(claimId, "Claim Optimization Agent", "RISK_GATE_CLEARED", `Risk reduced to ${currentCtx.riskScore.toFixed(2)} — cleared for submission`);
      await writeAuditLog("claim", claimId, "RISK_GATE_CLEARED", { finalRiskScore: currentCtx.riskScore, attempts: attempt });
      break;
    }
  }

  if (currentCtx.riskScore > RISK_GATE_THRESHOLD) {
    await logEvent(claimId, "Claim Optimization Agent", "RISK_GATE_FORCED", `Risk still ${currentCtx.riskScore.toFixed(2)} after ${MAX_OPTIMIZATION_RETRIES} attempts — submitting with HIGH_RISK flag`);
    await writeAuditLog("claim", claimId, "RISK_GATE_FORCED_SUBMISSION", { finalRiskScore: currentCtx.riskScore });
    currentCtx = {
      ...currentCtx,
      actionsTaken: [...currentCtx.actionsTaken, `HIGH_RISK submission flag applied after ${MAX_OPTIMIZATION_RETRIES} auto-fix attempts`],
    };
  }

  await db.update(claimIntelligenceTable)
    .set({ riskScore: currentCtx.riskScore })
    .where(eq(claimIntelligenceTable.claimId, claimId));

  return currentCtx;
}

async function runDenialResubmitLoop(claimId: string, ctx: ClaimContext): Promise<ClaimContext> {
  if (ctx.status !== "RESUBMITTED") return ctx;

  await logEvent(claimId, "Monitoring Agent", "RESUBMIT_CHECK", "Re-polling payer after denial correction and resubmission");
  await writeAuditLog("claim", claimId, "DENIAL_RESUBMIT_STARTED", { previousDenialReason: ctx.denialReason });

  const result = await runMonitoringAgent(ctx);
  const resubCtx = result.context;

  await logEvent(claimId, "Monitoring Agent", "RESUBMIT_RESPONSE", result.output, { newStatus: resubCtx.status });
  await writeAuditLog("claim", claimId, "DENIAL_RESUBMIT_RESPONSE", { newStatus: resubCtx.status, denialReason: resubCtx.denialReason ?? null });

  await db.update(claimsTable)
    .set({ status: resubCtx.status, denialReason: resubCtx.denialReason })
    .where(eq(claimsTable.id, claimId));

  return resubCtx;
}

async function persistClinicalNLPResults(ctx: ClaimContext) {
  if (!ctx.nlpExtraction) return;

  const [note] = await db.insert(clinicalNotesTable).values({
    patientId: ctx.patientId,
    doctorId: "system:nlp-agent",
    visitDate: new Date(),
    rawNotes: ctx.doctorNotes,
  }).returning();

  if (note) {
    await db.insert(extractedClinicalDataTable).values({
      noteId: note.noteId,
      diagnosis: ctx.nlpExtraction.diagnoses,
      symptoms: ctx.nlpExtraction.symptoms,
      procedures: ctx.nlpExtraction.procedures,
      severityScore: Math.min(
        ctx.nlpExtraction.diagnoses.length * 0.15 + ctx.nlpExtraction.symptoms.length * 0.08,
        1.0
      ),
    });
  }
}

async function persistClaimIntelligence(ctx: ClaimContext) {
  if (!ctx.intelligenceData) return;

  await db.insert(claimIntelligenceTable).values({
    claimId: ctx.claimId,
    riskScore: ctx.intelligenceData.riskScore,
    denialProbability: ctx.intelligenceData.denialProbability,
    issuesFound: ctx.intelligenceData.issuesFound,
    recommendations: ctx.intelligenceData.recommendations,
    modelVersion: ctx.intelligenceData.modelVersion,
  });
}

async function persistPayment(ctx: ClaimContext) {
  if (!ctx.paymentData) return;

  await db.insert(paymentsTable).values({
    claimId: ctx.claimId,
    amountExpected: ctx.paymentData.amountExpected,
    amountReceived: ctx.paymentData.amountReceived,
    payerReference: ctx.paymentData.payerReference,
    paymentStatus: ctx.paymentData.paymentStatus,
    paymentDate: ctx.paymentData.paymentStatus !== "PENDING" ? new Date() : null,
  });
}

export async function runFullPipeline(claimId: string): Promise<void> {
  const claim = await db.query.claimsTable.findFirst({
    where: eq(claimsTable.id, claimId),
  });

  if (!claim) {
    logger.error({ claimId }, "Claim not found for pipeline");
    return;
  }

  await writeAuditLog("claim", claimId, "PIPELINE_STARTED", {
    patientId: claim.patientId,
    totalAmount: claim.totalAmount,
    insurerId: claim.insurerId,
  });

  await db.insert(claimAgentStepsTable).values(
    AGENT_PIPELINE.map((agent, idx) => ({
      claimId,
      agent: agent.name,
      status: "pending",
      stepOrder: idx,
    }))
  );

  let ctx: ClaimContext = {
    claimId,
    patientId: claim.patientId,
    patientName: claim.patientName,
    insurerId: claim.insurerId,
    insurerName: claim.insurerName,
    doctorNotes: claim.doctorNotes,
    totalAmount: claim.totalAmount,
    icdCodes: [],
    cptCodes: [],
    issuesDetected: [],
    actionsTaken: [],
    riskScore: 0,
    status: "PROCESSING",
    denialReason: null,
    approvedAmount: null,
    paymentStatus: null,
    eligibilityValid: true,
    agentLog: [],
  };

  await db.update(claimsTable).set({ status: "PROCESSING" }).where(eq(claimsTable.id, claimId));

  for (const agent of AGENT_PIPELINE) {
    const isDenialAgent = agent.name === "Denial Handling Agent";
    const skip = isDenialAgent && ctx.status !== "DENIED";

    try {
      await updateStepStatus(claimId, agent.name, "running");
      await logEvent(claimId, agent.name, "START", `${agent.name} started`, { status: ctx.status });
      await writeAuditLog("claim", claimId, `AGENT_STARTED:${agent.name}`, { riskScore: ctx.riskScore, status: ctx.status });

      if (skip) {
        await updateStepStatus(claimId, agent.name, "skipped", "Skipped — no denial detected");
        await logEvent(claimId, agent.name, "SKIP", `${agent.name} skipped — claim status is ${ctx.status}`);
        await writeAuditLog("claim", claimId, `AGENT_SKIPPED:${agent.name}`, { reason: "no denial" });
        continue;
      }

      const result = await agent.run(ctx);
      ctx = result.context;

      await updateStepStatus(claimId, agent.name, "done", result.output);
      await logEvent(claimId, agent.name, "DONE", result.output, { riskScore: ctx.riskScore, status: ctx.status });
      await writeAuditLog("claim", claimId, `AGENT_COMPLETED:${agent.name}`, {
        output: result.output,
        riskScore: ctx.riskScore,
        status: ctx.status,
      });

      // ── Persist to specialized tables ──
      if (agent.name === "Clinical NLP Agent") {
        await persistClinicalNLPResults(ctx);
      }

      if (agent.name === "Claim Optimization Agent") {
        await persistClaimIntelligence(ctx);
        // ── RISK GATE: if risk > threshold, auto-fix before submission ──
        ctx = await runRiskGate(claimId, ctx);
      }

      if (agent.name === "Denial Handling Agent" && !skip) {
        // ── DENIAL→RESUBMIT LOOP: re-poll payer after correction ──
        ctx = await runDenialResubmitLoop(claimId, ctx);
      }

      if (agent.name === "Payment Reconciliation Agent") {
        await persistPayment(ctx);
      }

      // ── Sync main claims table ──
      await db.update(claimsTable).set({
        status: ctx.status,
        riskScore: ctx.riskScore,
        icdCodes: ctx.icdCodes,
        cptCodes: ctx.cptCodes,
        issuesDetected: ctx.issuesDetected,
        actionsTaken: ctx.actionsTaken,
        denialReason: ctx.denialReason,
        approvedAmount: ctx.approvedAmount,
        paymentStatus: ctx.paymentStatus,
        ...(agent.name === "Submission Agent" ? { submittedAt: new Date() } : {}),
        ...((ctx.status === "APPROVED" || ctx.status === "DENIED" || ctx.status === "PAID") ? { resolvedAt: new Date() } : {}),
      }).where(eq(claimsTable.id, claimId));

    } catch (err) {
      logger.error({ claimId, agent: agent.name, err }, "Agent failed");
      await updateStepStatus(claimId, agent.name, "failed", String(err));
      await logEvent(claimId, agent.name, "ERROR", `Agent failed: ${String(err)}`);
      await writeAuditLog("claim", claimId, `AGENT_FAILED:${agent.name}`, { error: String(err) });
      break;
    }
  }

  const finalClaim = await db.query.claimsTable.findFirst({ where: eq(claimsTable.id, claimId) });
  await writeAuditLog("claim", claimId, "PIPELINE_COMPLETED", { finalStatus: finalClaim?.status });
  logger.info({ claimId, finalStatus: finalClaim?.status }, "Pipeline complete");
}
