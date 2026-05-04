import type { AgentResult, ClaimContext, NLPExtraction } from "./types.js";

const DIAGNOSIS_PATTERNS: Array<{ pattern: RegExp; diagnosis: string }> = [
  { pattern: /diabet/i, diagnosis: "Type 2 Diabetes Mellitus" },
  { pattern: /hypertens/i, diagnosis: "Essential Hypertension" },
  { pattern: /pneumon/i, diagnosis: "Pneumonia, unspecified" },
  { pattern: /fractur/i, diagnosis: "Fracture" },
  { pattern: /chest\s*pain/i, diagnosis: "Chest pain, unspecified" },
  { pattern: /appendic/i, diagnosis: "Appendicitis" },
  { pattern: /asthm/i, diagnosis: "Asthma, unspecified" },
  { pattern: /depress/i, diagnosis: "Major depressive disorder" },
  { pattern: /anxiety/i, diagnosis: "Generalized anxiety disorder" },
  { pattern: /kidney|renal/i, diagnosis: "Chronic kidney disease" },
  { pattern: /heart\s*fail/i, diagnosis: "Heart failure, unspecified" },
  { pattern: /stroke|cerebro/i, diagnosis: "Cerebrovascular accident" },
  { pattern: /sepsis/i, diagnosis: "Sepsis, unspecified" },
  { pattern: /covid|coronavirus/i, diagnosis: "COVID-19" },
  { pattern: /copd|emphysema/i, diagnosis: "Chronic obstructive pulmonary disease" },
];

const PROCEDURE_PATTERNS: Array<{ pattern: RegExp; procedure: string }> = [
  { pattern: /x-ray|xray|radiograph/i, procedure: "Radiographic imaging" },
  { pattern: /mri|magnetic resonan/i, procedure: "MRI" },
  { pattern: /ct\s*scan|computed tomograph/i, procedure: "CT scan" },
  { pattern: /blood\s*test|lab|laboratory/i, procedure: "Laboratory testing" },
  { pattern: /surgery|surgical|operation/i, procedure: "Surgical procedure" },
  { pattern: /ecg|electrocardiog/i, procedure: "Electrocardiogram" },
  { pattern: /ultrasound|echo/i, procedure: "Ultrasound imaging" },
  { pattern: /biopsy/i, procedure: "Biopsy" },
  { pattern: /infusion|iv\s*therapy/i, procedure: "IV infusion therapy" },
  { pattern: /physical\s*therapy|physio/i, procedure: "Physical therapy" },
  { pattern: /consult/i, procedure: "Specialist consultation" },
  { pattern: /medication|prescription|drug/i, procedure: "Medication administration" },
];

export function extractFromNotes(notes: string): NLPExtraction {
  const diagnoses = DIAGNOSIS_PATTERNS.filter((d) => d.pattern.test(notes)).map((d) => d.diagnosis);
  const procedures = PROCEDURE_PATTERNS.filter((p) => p.pattern.test(notes)).map((p) => p.procedure);

  const symptoms: string[] = [];
  if (/fever|febrile/i.test(notes)) symptoms.push("Fever");
  if (/pain/i.test(notes)) symptoms.push("Pain");
  if (/fatigue|tired/i.test(notes)) symptoms.push("Fatigue");
  if (/nausea|vomit/i.test(notes)) symptoms.push("Nausea");
  if (/cough/i.test(notes)) symptoms.push("Cough");
  if (/dyspnea|breath/i.test(notes)) symptoms.push("Dyspnea");
  if (/swelling|edema/i.test(notes)) symptoms.push("Edema");
  if (/headache/i.test(notes)) symptoms.push("Headache");
  if (/dizziness/i.test(notes)) symptoms.push("Dizziness");

  if (diagnoses.length === 0) diagnoses.push("Unspecified condition — requires physician review");
  if (procedures.length === 0) procedures.push("Office visit");

  return { diagnoses, symptoms, procedures };
}

export async function runClinicalNLPAgent(ctx: ClaimContext): Promise<AgentResult> {
  await new Promise((r) => setTimeout(r, 400));

  const extraction = extractFromNotes(ctx.doctorNotes);
  const issues: string[] = [];
  const actions: string[] = [];

  if (extraction.diagnoses[0]?.includes("requires physician review")) {
    issues.push("Diagnosis could not be extracted from clinical notes — manual coding required");
  }

  actions.push(`Extracted ${extraction.diagnoses.length} diagnosis/diagnoses from clinical notes`);
  actions.push(`Identified ${extraction.procedures.length} procedure(s)`);
  if (extraction.symptoms.length > 0) {
    actions.push(`Documented symptoms: ${extraction.symptoms.join(", ")}`);
  }

  const log = {
    agent: "Clinical NLP Agent",
    message: `NLP extraction complete. Diagnoses: ${extraction.diagnoses.join(", ")}`,
    data: extraction as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  };

  return {
    context: {
      ...ctx,
      nlpExtraction: extraction,
      issuesDetected: [...ctx.issuesDetected, ...issues],
      actionsTaken: [...ctx.actionsTaken, ...actions],
      agentLog: [...ctx.agentLog, log],
    },
    output: `Extracted: ${extraction.diagnoses.join("; ")}. Procedures: ${extraction.procedures.join("; ")}. Symptoms: ${extraction.symptoms.join(", ") || "none documented"}.`,
    success: true,
  };
}
