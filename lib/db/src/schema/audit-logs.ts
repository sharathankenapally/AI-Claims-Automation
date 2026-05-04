import { pgTable, text, uuid, timestamp, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    logId: uuid("log_id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    performedBy: text("performed_by").notNull().default("system"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    metadata: json("metadata").$type<Record<string, unknown>>().default({}),
  },
  (t) => [
    index("audit_logs_entity_id_idx").on(t.entityId),
    index("audit_logs_entity_type_idx").on(t.entityType),
    index("audit_logs_timestamp_idx").on(t.timestamp),
  ]
);

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  logId: true,
  timestamp: true,
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
