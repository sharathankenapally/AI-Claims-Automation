import type { AgentResult, ClaimContext } from "./types.js";

const INSURER_NAMES: Record<string, string> = {
  "BCBS": "Blue Cross Blue Shield",
  "UHC": "UnitedHealthcare",
  "AETNA": "Aetna",
  "CIGNA": "Cigna",
  "HUMANA": "Humana",
  "MEDICARE": "Medicare",
  "MEDICAID": "Medicaid",
};

function simulateEligibilityCheck(insurerId: string, memberId?: string): boolean {
  const ineligiblePatterns = ["INELIGIBLE", "EXPIRED", "TERM"];
  if (memberId && ineligiblePatterns.some((p) => memberId.toUpperCase().includes(p))) return false;
  return Math.random() > 0.1;
}

export async function runIntakeAgent(ctx: ClaimContext): Promise<AgentResult> {
  await new Promise((r) => setTimeout(r, 300));

  const issues: string[] = [];
  const actions: string[] = [];

  if (!ctx.doctorNotes || ctx.doctorNotes.trim().length < 10) {
    issues.push("Doctor notes are too brief or missing");
  }

  if (!ctx.insurerId) {
    issues.push("Insurer ID is missing");
  }

  if (ctx.totalAmount <= 0) {
    issues.push("Invalid claim amount");
  }

  const eligibilityValid = simulateEligibilityCheck(ctx.insurerId);

  if (!eligibilityValid) {
    issues.push("Patient insurance eligibility could not be verified");
    actions.push("Flagged for manual eligibility review");
  } else {
    actions.push("Insurance eligibility verified successfully");
  }

  actions.push(`Patient intake validated for ${ctx.patientName}`);
  actions.push(`Insurer identified: ${INSURER_NAMES[ctx.insurerId] ?? ctx.insurerId}`);

  const log = {
    agent: "Intake Agent",
    message: `Intake complete. Eligibility: ${eligibilityValid ? "VALID" : "INVALID"}. Issues found: ${issues.length}`,
    data: { eligibilityValid, insurerName: INSURER_NAMES[ctx.insurerId] ?? ctx.insurerId },
    timestamp: new Date().toISOString(),
  };

  return {
    context: {
      ...ctx,
      eligibilityValid,
      insurerName: INSURER_NAMES[ctx.insurerId] ?? ctx.insurerId,
      issuesDetected: [...ctx.issuesDetected, ...issues],
      actionsTaken: [...ctx.actionsTaken, ...actions],
      agentLog: [...ctx.agentLog, log],
    },
    output: `Patient intake validated. Eligibility: ${eligibilityValid ? "VALID" : "INVALID"}. ${issues.length} issue(s) detected.`,
    success: true,
  };
}
