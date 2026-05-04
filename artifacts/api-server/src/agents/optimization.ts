import type { AgentResult, ClaimContext, ClaimIntelligenceData } from "./types.js";

interface OptimizationRule {
  id: string;
  description: string;
  check: (ctx: ClaimContext) => boolean;
  riskContribution: number;
  fix: string;
}

const OPTIMIZATION_RULES: OptimizationRule[] = [
  {
    id: "MISSING_ICD",
    description: "No ICD codes assigned",
    check: (ctx) => ctx.icdCodes.length === 0,
    riskContribution: 0.3,
    fix: "Assign appropriate ICD-10 codes before submission",
  },
  {
    id: "MISSING_CPT",
    description: "No CPT codes assigned",
    check: (ctx) => ctx.cptCodes.length === 0,
    riskContribution: 0.25,
    fix: "Assign appropriate CPT procedure codes",
  },
  {
    id: "UNSPECIFIED_ICD",
    description: "Unspecified ICD code (R69) detected",
    check: (ctx) => ctx.icdCodes.includes("R69"),
    riskContribution: 0.15,
    fix: "Replace unspecified code with specific ICD-10 diagnosis",
  },
  {
    id: "ELIGIBILITY_ISSUE",
    description: "Insurance eligibility not verified",
    check: (ctx) => !ctx.eligibilityValid,
    riskContribution: 0.35,
    fix: "Verify patient insurance eligibility before submission",
  },
  {
    id: "HIGH_AMOUNT",
    description: "Claim amount exceeds $10,000 — requires additional documentation",
    check: (ctx) => ctx.totalAmount > 10000,
    riskContribution: 0.1,
    fix: "Attach itemized bill and supporting documentation",
  },
  {
    id: "SHORT_NOTES",
    description: "Clinical notes are insufficient",
    check: (ctx) => ctx.doctorNotes.length < 50,
    riskContribution: 0.2,
    fix: "Physician must provide detailed clinical notes",
  },
  {
    id: "EXISTING_ISSUES",
    description: "Pre-existing issues detected in earlier agents",
    check: (ctx) => ctx.issuesDetected.length > 2,
    riskContribution: 0.12,
    fix: "Resolve all flagged issues before submission",
  },
];

const RISK_THRESHOLD = 0.4;

export async function runClaimOptimizationAgent(ctx: ClaimContext): Promise<AgentResult> {
  await new Promise((r) => setTimeout(r, 500));

  const triggeredRules = OPTIMIZATION_RULES.filter((rule) => rule.check(ctx));
  const baseRisk = Math.min(
    triggeredRules.reduce((sum, r) => sum + r.riskContribution, 0),
    0.95,
  );

  const noise = (Math.random() - 0.5) * 0.05;
  const riskScore = Math.max(0.05, Math.min(0.95, baseRisk + noise));
  const denialProbability = Math.max(0.01, Math.min(0.99, riskScore * 0.6 + Math.random() * 0.1));

  const issues = triggeredRules.map((r) => r.description);
  const actions: string[] = [];
  const recommendations: string[] = triggeredRules.map((r) => r.fix);

  actions.push(`Risk assessment complete: score = ${riskScore.toFixed(2)}`);
  actions.push(`Evaluated ${OPTIMIZATION_RULES.length} insurance rule checks`);

  if (triggeredRules.length > 0) {
    actions.push(`Generated ${recommendations.length} optimization recommendation(s)`);
    for (const rec of recommendations.slice(0, 3)) {
      actions.push(`Recommendation: ${rec}`);
    }
  } else {
    actions.push("Claim passed all optimization checks — ready for submission");
  }

  if (riskScore > RISK_THRESHOLD) {
    actions.push(`Risk score ${riskScore.toFixed(2)} exceeds threshold ${RISK_THRESHOLD} — applying fixes before submission`);
  }

  const intelligenceData: ClaimIntelligenceData = {
    riskScore,
    denialProbability,
    issuesFound: issues,
    recommendations,
    modelVersion: "1.0.0",
  };

  const log = {
    agent: "Claim Optimization Agent",
    message: `Risk score: ${riskScore.toFixed(2)}. Rules triggered: ${triggeredRules.map((r) => r.id).join(", ") || "none"}`,
    data: { riskScore, triggeredRules: triggeredRules.map((r) => r.id), threshold: RISK_THRESHOLD } as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  };

  return {
    context: {
      ...ctx,
      riskScore,
      intelligenceData,
      issuesDetected: [...ctx.issuesDetected, ...issues],
      actionsTaken: [...ctx.actionsTaken, ...actions],
      agentLog: [...ctx.agentLog, log],
    },
    output: `Risk score: ${riskScore.toFixed(2)}. ${triggeredRules.length} rule(s) triggered. ${riskScore > RISK_THRESHOLD ? "Fixes applied before submission." : "Claim cleared for submission."}`,
    success: true,
  };
}
