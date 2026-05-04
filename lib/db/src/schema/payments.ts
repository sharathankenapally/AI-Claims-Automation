import { pgTable, text, uuid, timestamp, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { claimsTable } from "./claims";

export const paymentsTable = pgTable(
  "payments",
  {
    paymentId: uuid("payment_id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claimsTable.id, { onDelete: "cascade" }),
    amountExpected: real("amount_expected").notNull(),
    amountReceived: real("amount_received").notNull().default(0),
    payerReference: text("payer_reference"),
    paymentStatus: text("payment_status").notNull().default("PENDING"),
    paymentDate: timestamp("payment_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("payments_claim_id_idx").on(t.claimId)]
);

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  paymentId: true,
  createdAt: true,
  updatedAt: true,
});

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
