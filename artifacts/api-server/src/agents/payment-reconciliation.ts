import type { AgentResult, ClaimContext, PaymentData } from "./types.js";

function computePayment(ctx: ClaimContext): { approvedAmount: number; paymentStatus: string; discrepancy: boolean } {
  if (ctx.status === "DENIED" || ctx.status === "RESUBMITTED") {
    return { approvedAmount: 0, paymentStatus: "DENIED", discrepancy: true };
  }
  if (ctx.status === "PROCESSING" || ctx.status === "PENDING") {
    return { approvedAmount: 0, paymentStatus: "PENDING", discrepancy: false };
  }

  const coverageRate = 0.7 + Math.random() * 0.25;
  const approvedAmount = Math.round(ctx.totalAmount * coverageRate * 100) / 100;
  const discrepancy = approvedAmount < ctx.totalAmount * 0.85;

  return { approvedAmount, paymentStatus: discrepancy ? "UNDERPAID" : "PAID", discrepancy };
}

export async function runPaymentReconciliationAgent(ctx: ClaimContext): Promise<AgentResult> {
  await new Promise((r) => setTimeout(r, 400));

  const { approvedAmount, paymentStatus, discrepancy } = computePayment(ctx);
  const actions: string[] = [];
  const issues: string[] = [];

  actions.push(`Expected payment: $${ctx.totalAmount.toFixed(2)}`);

  if (paymentStatus === "DENIED") {
    actions.push("Claim unpaid due to denial — revenue posted as write-off");
    issues.push(`Revenue loss: $${ctx.totalAmount.toFixed(2)} — denied claim`);
  } else if (paymentStatus === "PENDING") {
    actions.push("Payment pending — monitoring for remittance");
  } else {
    actions.push(`Payer remittance received: $${approvedAmount.toFixed(2)}`);
    if (discrepancy) {
      const shortfall = ctx.totalAmount - approvedAmount;
      issues.push(`Underpayment detected: $${shortfall.toFixed(2)} below expected`);
      actions.push(`Underpayment of $${shortfall.toFixed(2)} flagged for appeal`);
      actions.push("Submitting underpayment dispute to payer");
    } else {
      actions.push("Payment matches expected amount — reconciliation complete");
      actions.push("Revenue posted to ledger");
    }
  }

  const payerRef = `PAY-${Date.now().toString(36).toUpperCase()}-${ctx.insurerId}`;

  const paymentData: PaymentData = {
    amountExpected: ctx.totalAmount,
    amountReceived: approvedAmount,
    payerReference: payerRef,
    paymentStatus,
  };

  const finalStatus = paymentStatus === "PAID" || paymentStatus === "UNDERPAID" ? "PAID" : ctx.status;

  const log = {
    agent: "Payment Reconciliation Agent",
    message: `Reconciliation complete. Payment: $${approvedAmount.toFixed(2)} / $${ctx.totalAmount.toFixed(2)}. Status: ${paymentStatus}`,
    data: { approvedAmount, expectedAmount: ctx.totalAmount, paymentStatus, discrepancy, payerRef } as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  };

  return {
    context: {
      ...ctx,
      status: finalStatus,
      approvedAmount,
      paymentStatus,
      paymentData,
      issuesDetected: [...ctx.issuesDetected, ...issues],
      actionsTaken: [...ctx.actionsTaken, ...actions],
      agentLog: [...ctx.agentLog, log],
    },
    output: `Payment: $${approvedAmount.toFixed(2)} of $${ctx.totalAmount.toFixed(2)}. Status: ${paymentStatus}.${discrepancy ? " Underpayment dispute filed." : ""}`,
    success: true,
  };
}
