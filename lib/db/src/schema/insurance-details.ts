import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const insuranceDetailsTable = pgTable(
  "insurance_details",
  {
    insuranceId: uuid("insurance_id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patientsTable.id, { onDelete: "cascade" }),
    providerName: text("provider_name").notNull(),
    memberId: text("member_id").notNull(),
    planType: text("plan_type").notNull(),
    coverageStart: timestamp("coverage_start", { withTimezone: true }).notNull(),
    coverageEnd: timestamp("coverage_end", { withTimezone: true }),
    eligibilityStatus: text("eligibility_status").notNull().default("ELIGIBLE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("insurance_details_patient_id_idx").on(t.patientId)]
);

export const insertInsuranceDetailsSchema = createInsertSchema(insuranceDetailsTable).omit({
  insuranceId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsuranceDetails = typeof insuranceDetailsTable.$inferSelect;
export type InsertInsuranceDetails = z.infer<typeof insertInsuranceDetailsSchema>;
