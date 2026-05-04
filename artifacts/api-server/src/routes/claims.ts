import { Router } from "express";
import { db } from "@workspace/db";
import {
  claimsTable,
  claimAgentStepsTable,
  claimEventsTable,
  patientsTable,
} from "@workspace/db";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import {
  CreateClaimBody,
  GetClaimParams,
  ListClaimsQueryParams,
  ResubmitClaimParams,
  GetClaimEventsParams,
} from "@workspace/api-zod";
import { runFullPipeline } from "../agents/orchestrator.js";

const router = Router();

function formatClaim(claim: typeof claimsTable.$inferSelect, steps: typeof claimAgentStepsTable.$inferSelect[]) {
  return {
    ...claim,
    agentSteps: steps.map((s) => ({
      agent: s.agent,
      status: s.status,
      startedAt: s.startedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      output: s.output,
    })),
    submittedAt: claim.submittedAt?.toISOString() ?? null,
    resolvedAt: claim.resolvedAt?.toISOString() ?? null,
    createdAt: claim.createdAt.toISOString(),
    approvedAmount: claim.approvedAmount ?? null,
    paymentStatus: claim.paymentStatus ?? null,
    denialReason: claim.denialReason ?? null,
  };
}

router.get("/claims", async (req, res) => {
  const query = ListClaimsQueryParams.safeParse(req.query);
  const status = query.success ? query.data.status : undefined;
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 20) : 20;

  const whereConditions = status ? and(eq(claimsTable.status, status)) : undefined;

  const [claims, steps] = await Promise.all([
    db.query.claimsTable.findMany({
      where: whereConditions,
      orderBy: [desc(claimsTable.createdAt)],
      limit,
      offset: (page - 1) * limit,
    }),
    db.query.claimAgentStepsTable.findMany({
      orderBy: [claimAgentStepsTable.stepOrder],
    }),
  ]);

  const stepsByClaimId = steps.reduce<Record<string, typeof steps>>((acc, s) => {
    if (!acc[s.claimId]) acc[s.claimId] = [];
    acc[s.claimId]!.push(s);
    return acc;
  }, {});

  const total = await db.$count(claimsTable, whereConditions);

  res.json({
    claims: claims.map((c) => formatClaim(c, stepsByClaimId[c.id] ?? [])),
    total,
    page,
    limit,
  });
});

router.post("/claims", async (req, res) => {
  const body = CreateClaimBody.parse(req.body);

  const patient = await db.query.patientsTable.findFirst({
    where: eq(patientsTable.id, body.patientId),
  });

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const INSURER_NAMES: Record<string, string> = {
    BCBS: "Blue Cross Blue Shield",
    UHC: "UnitedHealthcare",
    AETNA: "Aetna",
    CIGNA: "Cigna",
    HUMANA: "Humana",
    MEDICARE: "Medicare",
    MEDICAID: "Medicaid",
  };

  const [claim] = await db.insert(claimsTable).values({
    patientId: body.patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    insurerId: body.insurerId,
    insurerName: INSURER_NAMES[body.insurerId] ?? body.insurerId,
    doctorNotes: body.doctorNotes,
    totalAmount: body.totalAmount,
    status: "PENDING",
    riskScore: 0,
    issuesDetected: [],
    actionsTaken: [],
    icdCodes: [],
    cptCodes: [],
  }).returning();

  if (!claim) {
    res.status(500).json({ error: "Failed to create claim" });
    return;
  }

  setImmediate(() => {
    runFullPipeline(claim.id).catch((err) => {
      req.log.error({ claimId: claim.id, err }, "Pipeline error");
    });
  });

  res.status(201).json(formatClaim(claim, []));
});

router.get("/claims/:claimId", async (req, res) => {
  const params = GetClaimParams.parse(req.params);

  const [claim, steps] = await Promise.all([
    db.query.claimsTable.findFirst({ where: eq(claimsTable.id, params.claimId) }),
    db.query.claimAgentStepsTable.findMany({
      where: eq(claimAgentStepsTable.claimId, params.claimId),
      orderBy: [claimAgentStepsTable.stepOrder],
    }),
  ]);

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  res.json(formatClaim(claim, steps));
});

router.post("/claims/:claimId/resubmit", async (req, res) => {
  const params = ResubmitClaimParams.parse(req.params);

  const claim = await db.query.claimsTable.findFirst({
    where: eq(claimsTable.id, params.claimId),
  });

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  await db.delete(claimAgentStepsTable).where(eq(claimAgentStepsTable.claimId, params.claimId));
  await db.update(claimsTable).set({ status: "PENDING", riskScore: 0 }).where(eq(claimsTable.id, params.claimId));

  setImmediate(() => {
    runFullPipeline(params.claimId).catch((err) => {
      req.log.error({ claimId: params.claimId, err }, "Resubmission pipeline error");
    });
  });

  const updatedClaim = await db.query.claimsTable.findFirst({ where: eq(claimsTable.id, params.claimId) });
  res.json(formatClaim(updatedClaim!, []));
});

router.get("/claims/:claimId/events", async (req, res) => {
  const params = GetClaimEventsParams.parse(req.params);

  const events = await db.query.claimEventsTable.findMany({
    where: eq(claimEventsTable.claimId, params.claimId),
    orderBy: [claimEventsTable.createdAt],
  });

  res.json({
    events: events.map((e) => ({
      id: e.id,
      claimId: e.claimId,
      agentName: e.agentName,
      eventType: e.eventType,
      message: e.message,
      data: e.data ? JSON.parse(e.data) : null,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

export default router;
