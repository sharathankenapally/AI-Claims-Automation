import { db } from "@workspace/db";
import {
  claimsTable,
  claimAgentStepsTable,
  claimEventsTable,
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

export const AGENT_PIPELINE: Array<{ name: AgentName; run: (ctx: ClaimContext) => Promise<{ context: ClaimContext; output: string; success: boolean }> }> = [
  { name: "Intake Agent", run: runIntakeAgent },
  { name: "Clinical NLP Agent", run: runClinicalNLPAgent },
  { name: "Coding Agent", run: runCodingAgent },
  { name: "Claim Optimization Agent", run: runClaimOptimizationAgent },
  { name: "Submission Agent", run: runSubmissionAgent },
  { name: "Monitoring Agent", run: runMonitoringAgent },
  { name: "Denial Handling Agent", run: runDenialHandlingAgent },
  { name: "Payment Reconciliation Agent", run: runPaymentReconciliationAgent },
];

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

export async function runFullPipeline(claimId: string): Promise<void> {
  const claim = await db.query.claimsTable.findFirst({
    where: eq(claimsTable.id, claimId),
  });

  if (!claim) {
    logger.error({ claimId }, "Claim not found for pipeline");
    return;
  }

  await db.insert(claimAgentStepsTable).values(
    AGENT_PIPELINE.map((agent, idx) => ({
      claimId,
      agent: agent.name,
      status: "pending",
      stepOrder: idx,
    })),
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
      await updateStepStatus(claimId, agent.name, skip ? "running" : "running");
      await logEvent(claimId, agent.name, "START", `${agent.name} started`);

      if (skip) {
        await updateStepStatus(claimId, agent.name, "skipped", "Skipped — no denial detected");
        await logEvent(claimId, agent.name, "SKIP", `${agent.name} skipped — no denial`);
        continue;
      }

      const result = await agent.run(ctx);
      ctx = result.context;

      await updateStepStatus(claimId, agent.name, "done", result.output);
      await logEvent(claimId, agent.name, "DONE", result.output, { riskScore: ctx.riskScore });

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
      break;
    }
  }

  const finalClaim = await db.query.claimsTable.findFirst({ where: eq(claimsTable.id, claimId) });
  logger.info({ claimId, finalStatus: finalClaim?.status }, "Pipeline complete");
}
