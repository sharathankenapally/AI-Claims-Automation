import type { AgentResult, ClaimContext } from "./types.js";

function generateClaimId(): string {
  const prefix = "CLM";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function buildX12Segment(ctx: ClaimContext): string {
  const claimId = generateClaimId();
  return [
    `ISA*00*          *00*          *ZZ*${ctx.insurerId.padEnd(15)}*ZZ*CLEARINGHOUSE   *${new Date().toISOString().slice(0, 10).replace(/-/g, "")}*${new Date().toTimeString().slice(0, 5).replace(":", "")}*^*00501*${claimId}*0*P*:~`,
    `GS*HC*${ctx.insurerId}*CLEARING*${new Date().toISOString().slice(0, 10).replace(/-/g, "")}*${new Date().toTimeString().slice(0, 5).replace(":", "")}*1*X*005010X222A1~`,
    `ST*837*0001*005010X222A1~`,
    `BPR*22*${ctx.totalAmount.toFixed(2)}*C*ACH*CTX*01*999999999*DA*123456789*${new Date().toISOString().slice(0, 10).replace(/-/g, "")}~`,
    `NM1*IL*1*${ctx.patientName.split(" ")[1] ?? ""}*${ctx.patientName.split(" ")[0]}*~`,
    `CLM*${claimId}*${ctx.totalAmount.toFixed(2)}***11:B:1*Y*A*Y*I~`,
    `HI*ABK:${ctx.icdCodes.join(":ABK:")}~`,
    `LX*1~SV1*HC:${ctx.cptCodes.join(":HC:")}*${ctx.totalAmount.toFixed(2)}*UN*1~`,
    `SE*10*0001~`,
    `GE*1*1~`,
    `IEA*1*${claimId}~`,
  ].join("\n");
}

export async function runSubmissionAgent(ctx: ClaimContext): Promise<AgentResult> {
  await new Promise((r) => setTimeout(r, 600));

  const submissionId = generateClaimId();
  const x12 = buildX12Segment(ctx);
  const actions: string[] = [];

  actions.push(`Converted claim to X12 837P EDI format`);
  actions.push(`Submitted to clearinghouse with ID: ${submissionId}`);
  actions.push(`Claim transmitted to ${ctx.insurerName} payer system`);
  actions.push(`Submission acknowledgment received`);

  const log = {
    agent: "Submission Agent",
    message: `Claim submitted. Submission ID: ${submissionId}`,
    data: { submissionId, x12Preview: x12.slice(0, 200) },
    timestamp: new Date().toISOString(),
  };

  return {
    context: {
      ...ctx,
      status: "SUBMITTED",
      actionsTaken: [...ctx.actionsTaken, ...actions],
      agentLog: [...ctx.agentLog, log],
    },
    output: `Claim submitted to ${ctx.insurerName} via X12 EDI. Submission ID: ${submissionId}.`,
    success: true,
  };
}
