export interface ClaimContext {
  claimId: string;
  patientId: string;
  patientName: string;
  insurerId: string;
  insurerName: string;
  doctorNotes: string;
  totalAmount: number;
  icdCodes: string[];
  cptCodes: string[];
  issuesDetected: string[];
  actionsTaken: string[];
  riskScore: number;
  status: string;
  denialReason: string | null;
  approvedAmount: number | null;
  paymentStatus: string | null;
  eligibilityValid: boolean;
  agentLog: AgentLogEntry[];
}

export interface AgentLogEntry {
  agent: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface AgentResult {
  context: ClaimContext;
  output: string;
  success: boolean;
}

export type AgentName =
  | "Intake Agent"
  | "Clinical NLP Agent"
  | "Coding Agent"
  | "Claim Optimization Agent"
  | "Submission Agent"
  | "Monitoring Agent"
  | "Denial Handling Agent"
  | "Payment Reconciliation Agent";

export const AGENT_ORDER: AgentName[] = [
  "Intake Agent",
  "Clinical NLP Agent",
  "Coding Agent",
  "Claim Optimization Agent",
  "Submission Agent",
  "Monitoring Agent",
  "Denial Handling Agent",
  "Payment Reconciliation Agent",
];
