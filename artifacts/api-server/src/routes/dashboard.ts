import { Router } from "express";
import { db } from "@workspace/db";
import { claimsTable, claimEventsTable, patientsTable } from "@workspace/db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { GetRecentActivityQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const claims = await db.query.claimsTable.findMany();

  const totalClaims = claims.length;
  const pendingClaims = claims.filter((c) => c.status === "PENDING" || c.status === "PROCESSING").length;
  const approvedClaims = claims.filter((c) => c.status === "APPROVED").length;
  const deniedClaims = claims.filter((c) => c.status === "DENIED").length;
  const paidClaims = claims.filter((c) => c.status === "PAID").length;

  const totalRevenue = claims
    .filter((c) => c.approvedAmount != null)
    .reduce((sum, c) => sum + (c.approvedAmount ?? 0), 0);

  const pendingRevenue = claims
    .filter((c) => c.status === "PENDING" || c.status === "PROCESSING" || c.status === "SUBMITTED")
    .reduce((sum, c) => sum + c.totalAmount, 0);

  const denialRate = totalClaims > 0 ? deniedClaims / totalClaims : 0;
  const avgRiskScore = totalClaims > 0
    ? claims.reduce((sum, c) => sum + c.riskScore, 0) / totalClaims
    : 0;

  const resolvedClaims = claims.filter((c) => c.resolvedAt && c.submittedAt);
  const avgProcessingTimeHours = resolvedClaims.length > 0
    ? resolvedClaims.reduce((sum, c) => {
        const diff = (c.resolvedAt!.getTime() - c.submittedAt!.getTime()) / (1000 * 60 * 60);
        return sum + diff;
      }, 0) / resolvedClaims.length
    : 4.2;

  res.json({
    totalClaims,
    pendingClaims,
    approvedClaims,
    deniedClaims,
    paidClaims,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    pendingRevenue: Math.round(pendingRevenue * 100) / 100,
    denialRate: Math.round(denialRate * 1000) / 1000,
    avgRiskScore: Math.round(avgRiskScore * 1000) / 1000,
    avgProcessingTimeHours: Math.round(avgProcessingTimeHours * 10) / 10,
  });
});

router.get("/dashboard/recent-activity", async (req, res) => {
  const query = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 10) : 10;

  const events = await db.query.claimEventsTable.findMany({
    orderBy: [desc(claimEventsTable.createdAt)],
    limit,
  });

  const claimIds = [...new Set(events.map((e) => e.claimId))];
  const claimsData = claimIds.length > 0
    ? await db.query.claimsTable.findMany({
        where: (table, { inArray }) => inArray(table.id, claimIds),
      })
    : [];

  const claimMap = Object.fromEntries(claimsData.map((c) => [c.id, c]));

  res.json({
    activities: events.map((e) => ({
      id: e.id,
      claimId: e.claimId,
      patientName: claimMap[e.claimId]?.patientName ?? "Unknown Patient",
      agentName: e.agentName,
      message: e.message,
      status: (claimMap[e.claimId]?.status ?? "PENDING") as string,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

router.get("/dashboard/denial-analysis", async (_req, res) => {
  const deniedClaims = await db.query.claimsTable.findMany({
    where: (table, { or, eq }) => or(eq(table.status, "DENIED"), eq(table.status, "RESUBMITTED")),
  });

  const resubmittedClaims = deniedClaims.filter((c) => c.status === "RESUBMITTED");
  const resubmissionSuccessRate = deniedClaims.length > 0
    ? resubmittedClaims.length / deniedClaims.length
    : 0;

  const reasonCounts: Record<string, number> = {};
  for (const claim of deniedClaims) {
    if (claim.denialReason) {
      reasonCounts[claim.denialReason] = (reasonCounts[claim.denialReason] ?? 0) + 1;
    }
  }

  const totalDenied = deniedClaims.length;
  const denialReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: totalDenied > 0 ? Math.round((count / totalDenied) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  res.json({
    denialReasons,
    totalDenied,
    resubmissionSuccessRate: Math.round(resubmissionSuccessRate * 1000) / 1000,
  });
});

router.get("/dashboard/revenue", async (_req, res) => {
  const claims = await db.query.claimsTable.findMany();

  const expectedRevenue = claims.reduce((sum, c) => sum + c.totalAmount, 0);
  const actualRevenue = claims
    .filter((c) => c.approvedAmount != null && c.status === "PAID")
    .reduce((sum, c) => sum + (c.approvedAmount ?? 0), 0);
  const underpaymentAmount = Math.max(0, expectedRevenue - actualRevenue);
  const discrepancyCount = claims.filter(
    (c) => c.approvedAmount != null && c.approvedAmount < c.totalAmount * 0.85,
  ).length;

  const monthlyMap: Record<string, { expected: number; actual: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toLocaleString("default", { month: "short", year: "numeric" });
    monthlyMap[key] = { expected: 0, actual: 0 };
  }

  for (const claim of claims) {
    const d = claim.createdAt;
    const key = d.toLocaleString("default", { month: "short", year: "numeric" });
    if (monthlyMap[key]) {
      monthlyMap[key]!.expected += claim.totalAmount;
      if (claim.approvedAmount != null) {
        monthlyMap[key]!.actual += claim.approvedAmount;
      }
    }
  }

  res.json({
    expectedRevenue: Math.round(expectedRevenue * 100) / 100,
    actualRevenue: Math.round(actualRevenue * 100) / 100,
    underpaymentAmount: Math.round(underpaymentAmount * 100) / 100,
    discrepancyCount,
    monthlyBreakdown: Object.entries(monthlyMap).map(([month, vals]) => ({
      month,
      expected: Math.round(vals.expected * 100) / 100,
      actual: Math.round(vals.actual * 100) / 100,
    })),
  });
});

export default router;
