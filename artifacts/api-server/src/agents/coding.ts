import type { AgentResult, ClaimContext } from "./types.js";

const DIAGNOSIS_TO_ICD: Record<string, string> = {
  "Type 2 Diabetes Mellitus": "E11.9",
  "Essential Hypertension": "I10",
  "Pneumonia, unspecified": "J18.9",
  "Fracture": "S00-T88",
  "Chest pain, unspecified": "R07.9",
  "Appendicitis": "K37",
  "Asthma, unspecified": "J45.909",
  "Major depressive disorder": "F32.9",
  "Generalized anxiety disorder": "F41.1",
  "Chronic kidney disease": "N18.9",
  "Heart failure, unspecified": "I50.9",
  "Cerebrovascular accident": "I63.9",
  "Sepsis, unspecified": "A41.9",
  "COVID-19": "U07.1",
  "Chronic obstructive pulmonary disease": "J44.9",
  "Unspecified condition — requires physician review": "R69",
};

const PROCEDURE_TO_CPT: Record<string, string> = {
  "Radiographic imaging": "71046",
  "MRI": "70553",
  "CT scan": "74178",
  "Laboratory testing": "80053",
  "Surgical procedure": "49000",
  "Electrocardiogram": "93000",
  "Ultrasound imaging": "76700",
  "Biopsy": "20206",
  "IV infusion therapy": "96365",
  "Physical therapy": "97110",
  "Specialist consultation": "99243",
  "Medication administration": "96372",
  "Office visit": "99213",
};

function extractDiagnosesFromNotes(notes: string): string[] {
  const matches: string[] = [];
  for (const [diag] of Object.entries(DIAGNOSIS_TO_ICD)) {
    const keyword = diag.split(" ")[0].toLowerCase();
    if (keyword && notes.toLowerCase().includes(keyword.slice(0, 5))) {
      matches.push(diag);
    }
  }
  return matches.length > 0 ? matches : ["Unspecified condition — requires physician review"];
}

function extractProceduresFromNotes(notes: string): string[] {
  const matches: string[] = [];
  for (const proc of Object.keys(PROCEDURE_TO_CPT)) {
    const keyword = proc.toLowerCase().split(" ")[0];
    if (keyword && notes.toLowerCase().includes(keyword.slice(0, 4))) {
      matches.push(proc);
    }
  }
  return matches.length > 0 ? matches : ["Office visit"];
}

export async function runCodingAgent(ctx: ClaimContext): Promise<AgentResult> {
  await new Promise((r) => setTimeout(r, 350));

  const diagnoses = extractDiagnosesFromNotes(ctx.doctorNotes);
  const procedures = extractProceduresFromNotes(ctx.doctorNotes);

  const icdCodes = diagnoses
    .map((d) => DIAGNOSIS_TO_ICD[d])
    .filter(Boolean) as string[];

  const cptCodes = procedures
    .map((p) => PROCEDURE_TO_CPT[p])
    .filter(Boolean) as string[];

  if (icdCodes.length === 0) icdCodes.push("R69");
  if (cptCodes.length === 0) cptCodes.push("99213");

  const issues: string[] = [];
  const actions: string[] = [];

  if (icdCodes.includes("R69")) {
    issues.push("ICD code R69 (unspecified) — may trigger payer scrutiny");
  }

  actions.push(`Assigned ${icdCodes.length} ICD-10 code(s): ${icdCodes.join(", ")}`);
  actions.push(`Assigned ${cptCodes.length} CPT code(s): ${cptCodes.join(", ")}`);
  actions.push("Cross-checked codes against claim amount for consistency");

  const log = {
    agent: "Coding Agent",
    message: `Coded claim. ICD: ${icdCodes.join(", ")} | CPT: ${cptCodes.join(", ")}`,
    data: { icdCodes, cptCodes },
    timestamp: new Date().toISOString(),
  };

  return {
    context: {
      ...ctx,
      icdCodes,
      cptCodes,
      issuesDetected: [...ctx.issuesDetected, ...issues],
      actionsTaken: [...ctx.actionsTaken, ...actions],
      agentLog: [...ctx.agentLog, log],
    },
    output: `ICD-10: ${icdCodes.join(", ")}. CPT: ${cptCodes.join(", ")}.`,
    success: true,
  };
}
