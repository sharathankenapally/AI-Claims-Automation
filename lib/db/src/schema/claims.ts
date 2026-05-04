import { pgTable, text, uuid, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const claimsTable = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull(),
  patientName: text("patient_name").notNull(),
  insurerId: text("insurer_id").notNull(),
  insurerName: text("insurer_name").notNull(),
  doctorNotes: text("doctor_notes").notNull(),
  status: text("status").notNull().default("PENDING"),
  riskScore: real("risk_score").notNull().default(0),
  issuesDetected: text("issues_detected").array().notNull().default([]),
  actionsTaken: text("actions_taken").array().notNull().default([]),
  icdCodes: text("icd_codes").array().notNull().default([]),
  cptCodes: text("cpt_codes").array().notNull().default([]),
  totalAmount: real("total_amount").notNull(),
  approvedAmount: real("approved_amount"),
  paymentStatus: text("payment_status"),
  denialReason: text("denial_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const claimAgentStepsTable = pgTable("claim_agent_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id").notNull(),
  agent: text("agent").notNull(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  output: text("output"),
  stepOrder: integer("step_order").notNull(),
});

export const claimEventsTable = pgTable("claim_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: uuid("claim_id").notNull(),
  agentName: text("agent_name").notNull(),
  eventType: text("event_type").notNull(),
  message: text("message").notNull(),
  data: text("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClaimSchema = createInsertSchema(claimsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claimsTable.$inferSelect;
export type ClaimAgentStep = typeof claimAgentStepsTable.$inferSelect;
export type ClaimEvent = typeof claimEventsTable.$inferSelect;
