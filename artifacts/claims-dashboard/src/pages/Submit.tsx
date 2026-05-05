import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateClaim, useListPatients, getListPatientsQueryKey, getListClaimsQueryKey, useCreatePatient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Bot, Zap, UserPlus, FileText, ArrowRight, CheckCircle2, AlertTriangle, DollarSign, Stethoscope } from "lucide-react";
import { useState } from "react";

const INSURERS = [
  { id: "BCBS", name: "Blue Cross Blue Shield" },
  { id: "UHC", name: "UnitedHealthcare" },
  { id: "AETNA", name: "Aetna" },
  { id: "CIGNA", name: "Cigna" },
  { id: "HUMANA", name: "Humana" },
  { id: "MEDICARE", name: "Medicare" },
  { id: "MEDICAID", name: "Medicaid" },
];

const SAMPLE_NOTES = [
  "Patient presents with type 2 diabetes mellitus with poor glycemic control. Recent labs show HbA1c of 9.2%. Essential hypertension also noted. CT scan ordered for abdominal evaluation. Prescribing metformin 1000mg twice daily.",
  "Patient admitted with chest pain radiating to left arm. ECG performed showing sinus rhythm. Blood tests ordered including troponin. Consultation with cardiologist requested. Possible ACS being evaluated.",
  "Patient with known COPD presenting with exacerbation. Dyspnea and productive cough for 3 days. Chest X-ray obtained. IV infusion therapy initiated. Physical therapy referral placed.",
  "Post-surgical follow-up for appendicitis. Patient recovering well. Wound inspection performed. No signs of infection. Pain medication adjusted. Labs reviewed — WBC trending down.",
];

const PIPELINE_STEPS = [
  { icon: Stethoscope, label: "Reads doctor's notes", color: "text-blue-400" },
  { icon: Bot, label: "Extracts diagnosis & CPT codes", color: "text-purple-400" },
  { icon: AlertTriangle, label: "Scores denial risk (0–100%)", color: "text-amber-400" },
  { icon: CheckCircle2, label: "Auto-fixes high-risk issues", color: "text-orange-400" },
  { icon: FileText, label: "Generates X12 EDI & submits", color: "text-cyan-400" },
  { icon: DollarSign, label: "Tracks payment & reconciles", color: "text-emerald-400" },
];

const claimSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  doctorNotes: z.string().min(20, "Clinical notes must be at least 20 characters"),
  insurerId: z.string().min(1, "Please select an insurer"),
  totalAmount: z.coerce.number().min(1, "Amount must be greater than 0"),
});

const patientSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  memberId: z.string().min(1, "Required"),
  groupNumber: z.string().min(1, "Required"),
  insurerId: z.string().min(1, "Please select an insurer"),
});

type ClaimFormValues = z.infer<typeof claimSchema>;
type PatientFormValues = z.infer<typeof patientSchema>;

export default function Submit() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"claim" | "patient">("claim");

  const { data: patientsData } = useListPatients({ query: { queryKey: getListPatientsQueryKey() } });

  const claimForm = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: { patientId: "", doctorNotes: "", insurerId: "", totalAmount: 0 },
  });

  const patientForm = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { firstName: "", lastName: "", dateOfBirth: "", memberId: "", groupNumber: "", insurerId: "" },
  });

  const createClaim = useCreateClaim({
    mutation: {
      onSuccess: (claim) => {
        toast({ title: "Claim submitted!", description: "The AI pipeline is now processing your claim. You'll be redirected to track progress." });
        qc.invalidateQueries({ queryKey: getListClaimsQueryKey() });
        setLocation(`/claims/${claim.id}`);
      },
      onError: () => {
        toast({ title: "Submission failed", description: "Please check your inputs and try again.", variant: "destructive" });
      },
    },
  });

  const createPatient = useCreatePatient({
    mutation: {
      onSuccess: (patient) => {
        toast({ title: "Patient registered", description: `${patient.firstName} ${patient.lastName} has been added. You can now submit claims for them.` });
        qc.invalidateQueries({ queryKey: getListPatientsQueryKey() });
        patientForm.reset();
        setTab("claim");
      },
      onError: () => {
        toast({ title: "Registration failed", description: "Please check your inputs.", variant: "destructive" });
      },
    },
  });

  const fieldClass = "w-full px-3 py-2 bg-muted border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="p-6 max-w-3xl space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Submit a New Insurance Claim</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste the doctor's clinical notes below — the AI handles everything else automatically
        </p>
      </div>

      {/* What happens next */}
      <div className="bg-card border border-card-border rounded-lg p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">What happens after you submit</div>
        <div className="grid grid-cols-3 gap-3">
          {PIPELINE_STEPS.map(({ icon: Icon, label, color }, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className={`w-3 h-3 ${color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-3">
          The entire pipeline runs automatically in seconds. You can track every agent's progress in real time on the claim detail page.
        </p>
      </div>

      {/* Tab */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("claim")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "claim" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileText className="w-3.5 h-3.5" />
          New Claim
        </button>
        <button
          onClick={() => setTab("patient")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "patient" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Register a Patient
        </button>
      </div>

      {tab === "claim" ? (
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="mb-5 p-3 bg-primary/5 border border-primary/20 rounded-md flex items-start gap-2.5">
            <Bot className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-primary mb-1">8-Agent AI Pipeline</div>
              <div className="flex flex-wrap gap-1">
                {["Intake", "Clinical NLP", "Coding", "Optimization", "Submission", "Monitoring", "Denial Handling", "Payment"].map((agent) => (
                  <span key={agent} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-mono">{agent}</span>
                ))}
              </div>
            </div>
          </div>

          <Form {...claimForm}>
            <form onSubmit={claimForm.handleSubmit((v) => createClaim.mutate({ data: v }))} className="space-y-4">

              <FormField control={claimForm.control} name="patientId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Patient
                    <span className="text-muted-foreground/60 normal-case font-normal tracking-normal ml-1">— whose claim is this?</span>
                  </FormLabel>
                  <FormControl>
                    <select {...field} className={fieldClass}>
                      <option value="">Select a patient…</option>
                      {patientsData?.patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — Member ID: {p.memberId}</option>
                      ))}
                    </select>
                  </FormControl>
                  {(patientsData?.patients.length ?? 0) === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No patients yet.{" "}
                      <button type="button" onClick={() => setTab("patient")} className="text-primary hover:underline">Register one first.</button>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={claimForm.control} name="insurerId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Insurance Company
                    <span className="text-muted-foreground/60 normal-case font-normal tracking-normal ml-1">— who to bill</span>
                  </FormLabel>
                  <FormControl>
                    <select {...field} className={fieldClass}>
                      <option value="">Select insurer…</option>
                      {INSURERS.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={claimForm.control} name="totalAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Claim Amount (USD)
                    <span className="text-muted-foreground/60 normal-case font-normal tracking-normal ml-1">— total billed to insurer</span>
                  </FormLabel>
                  <FormControl>
                    <input type="number" {...field} placeholder="e.g. 3500" className={fieldClass} step="0.01" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={claimForm.control} name="doctorNotes" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Doctor's Clinical Notes
                      <span className="text-muted-foreground/60 normal-case font-normal tracking-normal ml-1">— AI will extract codes from this</span>
                    </FormLabel>
                    <button
                      type="button"
                      onClick={() => claimForm.setValue("doctorNotes", SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)]!)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Zap className="w-3 h-3" />
                      Use sample notes
                    </button>
                  </div>
                  <FormControl>
                    <textarea
                      {...field}
                      placeholder="Paste or type the doctor's clinical notes here. Include diagnoses, symptoms, and any procedures performed. The AI will automatically assign the correct ICD-10 and CPT codes."
                      className={`${fieldClass} resize-none`}
                      rows={6}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <button
                type="submit"
                disabled={createClaim.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createClaim.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Starting AI Pipeline…</>
                ) : (
                  <><Bot className="w-4 h-4" /> Submit Claim to AI Pipeline <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                You'll be taken to a live tracking page immediately after submission.
              </p>
            </form>
          </Form>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Register a patient first</strong> before submitting a claim for them.
              You only need to do this once per patient — after that, select them from the dropdown on the claim form.
            </p>
          </div>
          <Form {...patientForm}>
            <form onSubmit={patientForm.handleSubmit((v) => createPatient.mutate({ data: v }))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={patientForm.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name</FormLabel>
                    <FormControl><input {...field} placeholder="Jane" className={fieldClass} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={patientForm.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name</FormLabel>
                    <FormControl><input {...field} placeholder="Smith" className={fieldClass} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={patientForm.control} name="dateOfBirth" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date of Birth</FormLabel>
                  <FormControl><input type="date" {...field} className={fieldClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={patientForm.control} name="memberId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Member ID
                      <span className="text-muted-foreground/60 normal-case font-normal tracking-normal ml-1">from insurance card</span>
                    </FormLabel>
                    <FormControl><input {...field} placeholder="e.g. MBR-123456" className={fieldClass} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={patientForm.control} name="groupNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Group Number
                      <span className="text-muted-foreground/60 normal-case font-normal tracking-normal ml-1">from insurance card</span>
                    </FormLabel>
                    <FormControl><input {...field} placeholder="e.g. GRP-789" className={fieldClass} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={patientForm.control} name="insurerId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Insurance Company</FormLabel>
                  <FormControl>
                    <select {...field} className={fieldClass}>
                      <option value="">Select insurer…</option>
                      {INSURERS.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <button
                type="submit"
                disabled={createPatient.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createPatient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Register Patient
              </button>
              <p className="text-xs text-muted-foreground text-center">
                After registering, you'll be returned to the claim form to submit their first claim.
              </p>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
