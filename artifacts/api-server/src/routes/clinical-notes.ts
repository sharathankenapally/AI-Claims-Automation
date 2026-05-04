import { Router } from "express";
import { db } from "@workspace/db";
import {
  clinicalNotesTable,
  extractedClinicalDataTable,
  patientsTable,
  auditLogsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { extractFromNotes } from "../agents/clinical-nlp.js";

const router = Router();

router.post("/clinical-notes", async (req, res) => {
  const { patientId, doctorId = "unknown", visitDate, rawNotes } = req.body as {
    patientId?: string;
    doctorId?: string;
    visitDate?: string;
    rawNotes?: string;
  };

  if (!patientId || typeof patientId !== "string") {
    res.status(400).json({ error: "patientId is required" });
    return;
  }
  if (!rawNotes || typeof rawNotes !== "string" || rawNotes.trim().length < 10) {
    res.status(400).json({ error: "rawNotes must be at least 10 characters" });
    return;
  }

  const body = { patientId, doctorId, visitDate, rawNotes };

  const patient = await db.query.patientsTable.findFirst({
    where: eq(patientsTable.id, body.patientId),
  });

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const [note] = await db.insert(clinicalNotesTable).values({
    patientId: body.patientId,
    doctorId: body.doctorId,
    visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
    rawNotes: body.rawNotes,
  }).returning();

  if (!note) {
    res.status(500).json({ error: "Failed to create clinical note" });
    return;
  }

  const extraction = extractFromNotes(body.rawNotes);
  const severityScore = Math.min(
    extraction.diagnoses.length * 0.15 + extraction.symptoms.length * 0.08,
    1.0
  );

  const [extracted] = await db.insert(extractedClinicalDataTable).values({
    noteId: note.noteId,
    diagnosis: extraction.diagnoses,
    symptoms: extraction.symptoms,
    procedures: extraction.procedures,
    severityScore,
  }).returning();

  await db.insert(auditLogsTable).values({
    entityType: "patient",
    entityId: body.patientId,
    action: "CLINICAL_NOTE_ADDED",
    performedBy: body.doctorId,
    metadata: {
      noteId: note.noteId,
      diagnosisCount: extraction.diagnoses.length,
      procedureCount: extraction.procedures.length,
      severityScore,
    },
  });

  res.status(201).json({
    noteId: note.noteId,
    patientId: note.patientId,
    doctorId: note.doctorId,
    visitDate: note.visitDate.toISOString(),
    rawNotes: note.rawNotes,
    createdAt: note.createdAt.toISOString(),
    extracted: extracted
      ? {
          clinicalId: extracted.clinicalId,
          diagnoses: extracted.diagnosis,
          symptoms: extracted.symptoms,
          procedures: extracted.procedures,
          severityScore: extracted.severityScore,
        }
      : null,
  });
});

router.get("/clinical-notes/patient/:patientId", async (req, res) => {
  const { patientId } = req.params;

  const notes = await db.query.clinicalNotesTable.findMany({
    where: eq(clinicalNotesTable.patientId, patientId),
  });

  const result = await Promise.all(
    notes.map(async (note) => {
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
            }
          : null,
      };
    })
  );

  res.json({ notes: result, total: result.length });
});

export default router;
