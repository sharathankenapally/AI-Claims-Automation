import { pgTable, text, uuid, timestamp, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const clinicalNotesTable = pgTable(
  "clinical_notes",
  {
    noteId: uuid("note_id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patientsTable.id, { onDelete: "cascade" }),
    doctorId: text("doctor_id").notNull(),
    visitDate: timestamp("visit_date", { withTimezone: true }).notNull(),
    rawNotes: text("raw_notes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("clinical_notes_patient_id_idx").on(t.patientId)]
);

export const extractedClinicalDataTable = pgTable(
  "extracted_clinical_data",
  {
    clinicalId: uuid("clinical_id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .unique()
      .references(() => clinicalNotesTable.noteId, { onDelete: "cascade" }),
    diagnosis: text("diagnosis").array().notNull().default([]),
    symptoms: text("symptoms").array().notNull().default([]),
    procedures: text("procedures").array().notNull().default([]),
    severityScore: real("severity_score").notNull().default(0),
    extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("extracted_clinical_data_note_id_idx").on(t.noteId)]
);

export const insertClinicalNoteSchema = createInsertSchema(clinicalNotesTable).omit({
  noteId: true,
  createdAt: true,
});
export const insertExtractedClinicalDataSchema = createInsertSchema(extractedClinicalDataTable).omit({
  clinicalId: true,
  extractedAt: true,
});

export type ClinicalNote = typeof clinicalNotesTable.$inferSelect;
export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;
export type ExtractedClinicalData = typeof extractedClinicalDataTable.$inferSelect;
export type InsertExtractedClinicalData = z.infer<typeof insertExtractedClinicalDataSchema>;
