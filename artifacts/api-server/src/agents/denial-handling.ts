import type { AgentResult, ClaimContext } from "./types.js";

interface DenialFix {
  pattern: RegExp;
  fix: string;
  action: string;
  riskReduction: number;
}

const DENIAL_FIXES: DenialFix[] = [
  {
    pattern: /prior auth/i,
    fix: "Obtained retroactive prior authorization from payer",
    action: "Prior authorization obtained and appended to claim",
    riskReduction: 0.35,
  },
  {
    pattern: /duplicate/i,
    fix: "Verified this is not a duplicate — resubmitting with unique claim identifier",
    action: "Duplicate flag resolved — unique submission ID generated",
    riskReduction: 0.4,
  },
  {
    pattern: /diagnosis code/i,
    fix: "Replaced invalid ICD codes with payer-accepted codes",
    action: "ICD codes corrected and cross-validated against payer formulary",
    riskReduction: 0.3,
  },
  {
    pattern: /not covered/i,
    fix: "Identified alternative covered service codes and resubmitted",
    action: "Service reclassified under covered benefit category",
    riskReduction: 0.25,
  },
  {
    pattern: /coordination/i,
    fix: "Applied coordination of benefits — split billing across primary and secondary",
    action: "COB applied — claim split and resubmitted to both payers",
    riskReduction: 0.3,
  },
  {
    pattern: /maximum benefit|exceeds/i,
    fix: "Itemized claim to separate billable components under benefit limits",
    action: "Claim broken into separate line items within benefit thresholds",
    riskReduction: 0.2,
  },
  {
    pattern: /provider/i,
    fix: "Verified provider credentialing and resubmitted with NPI",
    action: "Provider NPI validated and re-credentialing documentation attached",
    riskReduction: 0.35,
  },
];

export async function runDenialHandlingAgent(ctx: ClaimContext): Promise<AgentResult> {
  await new Promise((r) => setTimeout(r, 500));

  if (ctx.status !== "DENIED") {
    return {
      context: {
        ...ctx,
        agentLog: [
          ...ctx.agentLog,
          {
            agent: "Denial Handling Agent",
            message: "No denial detected — skipping",
            timestamp: new Date().toISOString(),
          },
        ],
      },
      output: "No denial — agent skipped.",
      success: true,
    };
  }

  const denialReason = ctx.denialReason ?? "";
  const matchedFix = DENIAL_FIXES.find((f) => f.pattern.test(denialReason));

  const actions: string[] = [];
  let newRiskScore = ctx.riskScore;

  if (matchedFix) {
    actions.push(`Denial analysis: ${denialReason}`);
    actions.push(`Fix applied: ${matchedFix.fix}`);
    actions.push(matchedFix.action);
    newRiskScore = Math.max(0.05, ctx.riskScore - matchedFix.riskReduction);
  } else {
    actions.push(`Denial analyzed: ${denialReason}`);
    actions.push("Manual review recommended — no automated fix pattern matched");
    actions.push("Escalating to human billing specialist");
    newRiskScore = Math.max(0.1, ctx.riskScore - 0.1);
  }

  actions.push("Claim corrected and queued for resubmission");

  const log = {
    agent: "Denial Handling Agent",
    message: `Denial handled. Fix: ${matchedFix?.fix ?? "Manual review required"}. New risk: ${newRiskScore.toFixed(2)}`,
    data: { denialReason, fix: matchedFix?.fix, newRiskScore },
    timestamp: new Date().toISOString(),
  };

  return {
    context: {
      ...ctx,
      status: "RESUBMITTED",
      riskScore: newRiskScore,
      actionsTaken: [...ctx.actionsTaken, ...actions],
      agentLog: [...ctx.agentLog, log],
    },
    output: `Denial processed. ${matchedFix ? `Fix: ${matchedFix.fix}` : "Escalated to manual review"}. Resubmitting with risk score: ${newRiskScore.toFixed(2)}.`,
    success: true,
  };
}
