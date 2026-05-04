import { pgTable, text, uuid, timestamp, real, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { claimsTable } from "./claims";

export const claimIntelligenceTable = pgTable(
  "claim_intelligence",
  {
    intelligenceId: uuid("intelligence_id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claimsTable.id, { onDelete: "cascade" }),
    riskScore: real("risk_score").notNull().default(0),
    denialProbability: real("denial_probability").notNull().default(0),
    issuesFound: json("issues_found").$type<string[]>().notNull().default([]),
    recommendations: json("recommendations").$type<string[]>().notNull().default([]),
    modelVersion: text("model_version").notNull().default("1.0.0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("claim_intelligence_claim_id_idx").on(t.claimId),
    index("claim_intelligence_risk_score_idx").on(t.riskScore),
  ]
);

export const insertClaimIntelligenceSchema = createInsertSchema(claimIntelligenceTable).omit({
  intelligenceId: true,
  createdAt: true,
});

export type ClaimIntelligence = typeof claimIntelligenceTable.$inferSelect;
export type InsertClaimIntelligence = z.infer<typeof insertClaimIntelligenceSchema>;
