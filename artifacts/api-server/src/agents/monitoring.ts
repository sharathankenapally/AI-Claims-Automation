import type { AgentResult, ClaimContext } from "./types.js";

type PayerResponse = "APPROVED" | "DENIED" | "PENDING";

const DENIAL_REASONS = [
  "Service not covered under patient plan",
  "Prior authorization required",
  "Duplicate claim submission",
  "Missing or invalid diagnosis code",
  "Coordination of benefits applies",
  "Claim exceeds maximum benefit",
  "Non-covered provider",
];

function simulatePayerResponse(ctx: ClaimContext): { response: PayerResponse; denialReason?: string } {
  const riskScore = ctx.riskScore;

  if (riskScore > 0.7) {
    const reason = DENIAL_REASONS[Math.floor(Math.random() * DENIAL_REASONS.length)];
    return { response: "DENIED", denialReason: reason };
  }

  if (riskScore > 0.45) {
    const rand = Math.random();
    if (rand < 0.25) {
      const reason = DENIAL_REASONS[Math.floor(Math.random() * DENIAL_REASONS.length)];
      return { response: "DENIED", denialReason: reason };
    }
    if (rand < 0.35) return { response: "PENDING" };
    return { response: "APPROVED" };
  }

  const rand = Math.random();
  if (rand < 0.08) {
    const reason = DENIAL_REASONS[Math.floor(Math.random() * DENIAL_REASONS.length)];
    return { response: "DENIED", denialReason: reason };
  }
  if (rand < 0.12) return { response: "PENDING" };
  return { response: "APPROVED" };
}

export async function runMonitoringAgent(ctx: ClaimContext): Promise<AgentResult> {
  await new Promise((r) => setTimeout(r, 700));

  const { response, denialReason } = simulatePayerResponse(ctx);
  const actions: string[] = [];

  actions.push(`Polling ${ctx.insurerName} for claim status`);
  actions.push(`Payer response received: ${response}`);

  let status = ctx.status;
  let updatedDenialReason = ctx.denialReason;

  if (response === "APPROVED") {
    status = "APPROVED";
    actions.push("Claim approved — routing to payment reconciliation");
  } else if (response === "DENIED") {
    status = "DENIED";
    updatedDenialReason = denialReason ?? "Unspecified denial";
    actions.push(`Denial reason: ${updatedDenialReason}`);
    actions.push("Routing to Denial Handling Agent for correction");
  } else {
    status = "PROCESSING";
    actions.push("Claim in payer review — monitoring for updates");
  }

  const log = {
    agent: "Monitoring Agent",
    message: `Payer response: ${response}${denialReason ? ` — ${denialReason}` : ""}`,
    data: { response, denialReason },
    timestamp: new Date().toISOString(),
  };

  return {
    context: {
      ...ctx,
      status,
      denialReason: updatedDenialReason,
      actionsTaken: [...ctx.actionsTaken, ...actions],
      agentLog: [...ctx.agentLog, log],
    },
    output: `Payer response: ${response}.${denialReason ? ` Reason: ${denialReason}` : ""}`,
    success: true,
  };
}
