import { Router } from "express";
import { db } from "@workspace/db";
import {
  claimsTable,
  claimAgentStepsTable,
  claimEventsTable,
  patientsTable,
  claimIntelligenceTable,
  paymentsTable,
  clinicalNotesTable,
  extractedClinicalDataTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, desc, and, asc } from "drizzle-orm";
import {
  CreateClaimBody,
  GetClaimParams,
  ListClaimsQueryParams,
  ResubmitClaimParams,
  GetClaimEventsParams,
} from "@workspace/api-zod";
import { runFullPipeline } from "../agents/orchestrator.js";

const INSURER_NAMES: Record<string, string> = {
  BCBS: "Blue Cross Blue Shield",
  UHC: "UnitedHealthcare",
  AETNA: "Aetna",
  CIGNA: "Cigna",
  HUMANA: "Humana",
  MEDICARE: "Medicare",
  MEDICAID: "Medicaid",
};

const router = Router();

function formatClaim(
  claim: typeof claimsTable.$inferSelect,
  steps: typeof claimAgentStepsTable.$inferSelect[]
) {
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
    updatedAt: claim.updatedAt.toISOString(),
    approvedAmount: claim.approvedAmount ?? null,
    paymentStatus: claim.paymentStatus ?? null,
    denialReason: claim.denialReason ?? null,
  };
}

// ── List Claims ──────────────────────────────────────────────────────────────
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

// ── Submit Claim ─────────────────────────────────────────────────────────────
async function handleCreateClaim(req: any, res: any) {
  const body = CreateClaimBody.parse(req.body);

  const patient = await db.query.patientsTable.findFirst({
    where: eq(patientsTable.id, body.patientId),
  });

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

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
      req.log?.error({ claimId: claim.id, err }, "Pipeline error");
    });
  });

  res.status(201).json(formatClaim(claim, []));
}

router.post("/claims", handleCreateClaim);
router.post("/submit-claim", handleCreateClaim);

// ── Get Claim ────────────────────────────────────────────────────────────────
async function handleGetClaim(req: any, res: any) {
  const claimId = req.params.claimId ?? req.params.id;

  const [claim, steps] = await Promise.all([
    db.query.claimsTable.findFirst({ where: eq(claimsTable.id, claimId) }),
    db.query.claimAgentStepsTable.findMany({
      where: eq(claimAgentStepsTable.claimId, claimId),
      orderBy: [claimAgentStepsTable.stepOrder],
    }),
  ]);

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  res.json(formatClaim(claim, steps));
}

router.get("/claims/:claimId", handleGetClaim);
router.get("/claim/:id", handleGetClaim);

// ── Claim Timeline ────────────────────────────────────────────────────────────
async function handleGetTimeline(req: any, res: any) {
  const claimId = req.params.claimId ?? req.params.id;

  const [claim, steps, events, intelligence, payments, auditEntries] = await Promise.all([
    db.query.claimsTable.findFirst({ where: eq(claimsTable.id, claimId) }),
    db.query.claimAgentStepsTable.findMany({
      where: eq(claimAgentStepsTable.claimId, claimId),
      orderBy: [claimAgentStepsTable.stepOrder],
    }),
    db.query.claimEventsTable.findMany({
      where: eq(claimEventsTable.claimId, claimId),
      orderBy: [asc(claimEventsTable.createdAt)],
    }),
    db.query.claimIntelligenceTable.findFirst({
      where: eq(claimIntelligenceTable.claimId, claimId),
    }),
    db.query.paymentsTable.findMany({
      where: eq(paymentsTable.claimId, claimId),
      orderBy: [desc(paymentsTable.createdAt)],
    }),
    db.select().from(auditLogsTable)
      .where(eq(auditLogsTable.entityId, claimId))
      .orderBy(asc(auditLogsTable.timestamp)),
  ]);

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  // Clinical data: find notes by patientId around claim creation date
  const clinicalNotes = await db.query.clinicalNotesTable.findMany({
    where: eq(clinicalNotesTable.patientId, claim.patientId),
    orderBy: [desc(clinicalNotesTable.createdAt)],
  });

  const clinicalData = await Promise.all(
    clinicalNotes.slice(0, 3).map(async (note) => {
      const extracted = await db.query.extractedClinicalDataTable.findFirst({
        where: eq(extractedClinicalDataTable.noteId, note.noteId),
      });
      return {
        noteId: note.noteId,
        doctorId: note.doctorId,
        visitDate: note.visitDate.toISOString(),
        rawNotes: note.rawNotes,
        createdAt: note.createdAt.toISOString(),
        extracted: extracted
          ? {
              diagnoses: extracted.diagnosis,
              symptoms: extracted.symptoms,
              procedures: extracted.procedures,
              severityScore: extracted.severityScore,
              extractedAt: extracted.extractedAt.toISOString(),
            }
          : null,
      };
    })
  );

  // Build chronological timeline of events
  const timelineEvents = events.map((e) => ({
    id: e.id,
    timestamp: e.createdAt.toISOString(),
    agentName: e.agentName,
    eventType: e.eventType,
    message: e.message,
    data: e.data ? JSON.parse(e.data) : null,
  }));

  res.json({
    claimId: claim.id,
    patientName: claim.patientName,
    insurerName: claim.insurerName,
    status: claim.status,
    totalAmount: claim.totalAmount,
    approvedAmount: claim.approvedAmount,
    riskScore: claim.riskScore,
    icdCodes: claim.icdCodes,
    cptCodes: claim.cptCodes,
    issuesDetected: claim.issuesDetected,
    actionsTaken: claim.actionsTaken,
    denialReason: claim.denialReason,
    createdAt: claim.createdAt.toISOString(),
    submittedAt: claim.submittedAt?.toISOString() ?? null,
    resolvedAt: claim.resolvedAt?.toISOString() ?? null,

    // Clinical layer
    clinical: clinicalData,

    // AI intelligence
    intelligence: intelligence
      ? {
          intelligenceId: intelligence.intelligenceId,
          riskScore: intelligence.riskScore,
          denialProbability: intelligence.denialProbability,
          issuesFound: intelligence.issuesFound as string[],
          recommendations: intelligence.recommendations as string[],
          modelVersion: intelligence.modelVersion,
          createdAt: intelligence.createdAt.toISOString(),
        }
      : null,

    // Financial
    payments: payments.map((p) => ({
      paymentId: p.paymentId,
      amountExpected: p.amountExpected,
      amountReceived: p.amountReceived,
      payerReference: p.payerReference,
      paymentStatus: p.paymentStatus,
      paymentDate: p.paymentDate?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),

    // Agent execution steps
    steps: steps.map((s) => ({
      agent: s.agent,
      status: s.status,
      stepOrder: s.stepOrder,
      startedAt: s.startedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      durationMs:
        s.startedAt && s.completedAt
          ? new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()
          : null,
      output: s.output,
    })),

    // Chronological event log
    events: timelineEvents,

    // Compliance audit trail
    auditTrail: auditEntries.map((a) => ({
      logId: a.logId,
      action: a.action,
      performedBy: a.performedBy,
      timestamp: a.timestamp.toISOString(),
      metadata: a.metadata,
    })),
  });
}

router.get("/claims/:claimId/timeline", handleGetTimeline);
router.get("/claim/:id/timeline", handleGetTimeline);

// ── Resubmit Claim ───────────────────────────────────────────────────────────
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
  await db.update(claimsTable)
    .set({ status: "PENDING", riskScore: 0 })
    .where(eq(claimsTable.id, params.claimId));

  setImmediate(() => {
    runFullPipeline(params.claimId).catch((err) => {
      req.log?.error({ claimId: params.claimId, err }, "Resubmission pipeline error");
    });
  });

  const updatedClaim = await db.query.claimsTable.findFirst({
    where: eq(claimsTable.id, params.claimId),
  });
  res.json(formatClaim(updatedClaim!, []));
});

// ── Claim Events ─────────────────────────────────────────────────────────────
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
