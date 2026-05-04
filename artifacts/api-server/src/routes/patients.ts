import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreatePatientBody,
  GetPatientParams,
} from "@workspace/api-zod";

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

router.get("/patients", async (_req, res) => {
  const patients = await db.query.patientsTable.findMany({
    orderBy: [patientsTable.createdAt],
  });
  res.json({
    patients: patients.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
    total: patients.length,
  });
});

router.post("/patients", async (req, res) => {
  const body = CreatePatientBody.parse(req.body);

  const [patient] = await db.insert(patientsTable).values({
    firstName: body.firstName,
    lastName: body.lastName,
    dateOfBirth: body.dateOfBirth,
    memberId: body.memberId,
    groupNumber: body.groupNumber,
    insurerId: body.insurerId,
    insurerName: INSURER_NAMES[body.insurerId] ?? body.insurerId,
    eligibilityStatus: "ELIGIBLE",
  }).returning();

  if (!patient) {
    res.status(500).json({ error: "Failed to create patient" });
    return;
  }

  res.status(201).json({ ...patient, createdAt: patient.createdAt.toISOString() });
});

router.get("/patients/:patientId", async (req, res) => {
  const params = GetPatientParams.parse(req.params);

  const patient = await db.query.patientsTable.findFirst({
    where: eq(patientsTable.id, params.patientId),
  });

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  res.json({ ...patient, createdAt: patient.createdAt.toISOString() });
});

export default router;
