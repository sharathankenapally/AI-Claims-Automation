import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateClaim, useListPatients, getListPatientsQueryKey, getListClaimsQueryKey, useCreatePatient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Bot, Zap } from "lucide-react";
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

const claimSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  doctorNotes: z.string().min(20, "Notes must be at least 20 characters"),
  insurerId: z.string().min(1, "Select an insurer"),
  totalAmount: z.coerce.number().min(1, "Amount must be positive"),
});

const patientSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  memberId: z.string().min(1, "Required"),
  groupNumber: z.string().min(1, "Required"),
  insurerId: z.string().min(1, "Select an insurer"),
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
        toast({ title: "Claim submitted", description: "The 8-agent pipeline is now processing your claim." });
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
        toast({ title: "Patient registered", description: `${patient.firstName} ${patient.lastName} has been added.` });
        qc.invalidateQueries({ queryKey: getListPatientsQueryKey() });
        patientForm.reset();
        setTab("claim");
      },
      onError: () => {
        toast({ title: "Registration failed", description: "Please check your inputs.", variant: "destructive" });
      },
    },
  });

  function onSubmitClaim(values: ClaimFormValues) {
    createClaim.mutate({ data: values });
  }

  function onSubmitPatient(values: PatientFormValues) {
    createPatient.mutate({ data: values });
  }

  const fieldClass = "w-full px-3 py-2 bg-muted border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Submit</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Register a patient or submit a claim through the AI pipeline</p>
      </div>

      {/* Tab */}
      <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1 w-fit">
        <button onClick={() => setTab("claim")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "claim" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          New Claim
        </button>
        <button onClick={() => setTab("patient")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "patient" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Register Patient
        </button>
      </div>

      {tab === "claim" ? (
        <div className="bg-card border border-card-border rounded-lg p-5">
          {/* Pipeline info */}
          <div className="mb-5 p-3 bg-primary/5 border border-primary/20 rounded-md">
            <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1.5">
              <Bot className="w-4 h-4" />
              8-Agent Autonomous Pipeline
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Intake", "Clinical NLP", "Coding", "Optimization", "Submission", "Monitoring", "Denial Handling", "Reconciliation"].map((agent) => (
                <span key={agent} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-mono">{agent}</span>
              ))}
            </div>
          </div>

          <Form {...claimForm}>
            <form onSubmit={claimForm.handleSubmit(onSubmitClaim)} className="space-y-4">
              <FormField control={claimForm.control} name="patientId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</FormLabel>
                  <FormControl>
                    <select {...field} className={fieldClass}>
                      <option value="">Select a patient...</option>
                      {patientsData?.patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.memberId}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={claimForm.control} name="insurerId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurer</FormLabel>
                  <FormControl>
                    <select {...field} className={fieldClass}>
                      <option value="">Select insurer...</option>
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
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Claim Amount ($)</FormLabel>
                  <FormControl>
                    <input type="number" {...field} placeholder="e.g. 3500" className={fieldClass} step="0.01" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={claimForm.control} name="doctorNotes" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clinical Notes</FormLabel>
                    <button
                      type="button"
                      onClick={() => claimForm.setValue("doctorNotes", SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)]!)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Zap className="w-3 h-3" />
                      Use sample
                    </button>
                  </div>
                  <FormControl>
                    <textarea
                      {...field}
                      placeholder="Enter doctor's clinical notes, diagnoses, symptoms, and procedures..."
                      className={`${fieldClass} resize-none`}
                      rows={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <button
                type="submit"
                disabled={createClaim.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createClaim.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Starting Pipeline...</>
                ) : (
                  <><Bot className="w-4 h-4" /> Submit to AI Pipeline</>
                )}
              </button>
            </form>
          </Form>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-lg p-5">
          <Form {...patientForm}>
            <form onSubmit={patientForm.handleSubmit(onSubmitPatient)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={patientForm.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name</FormLabel>
                    <FormControl><input {...field} className={fieldClass} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={patientForm.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name</FormLabel>
                    <FormControl><input {...field} className={fieldClass} /></FormControl>
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
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member ID</FormLabel>
                    <FormControl><input {...field} placeholder="e.g. MBR-123456" className={fieldClass} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={patientForm.control} name="groupNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Group Number</FormLabel>
                    <FormControl><input {...field} placeholder="e.g. GRP-789" className={fieldClass} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={patientForm.control} name="insurerId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Insurer</FormLabel>
                  <FormControl>
                    <select {...field} className={fieldClass}>
                      <option value="">Select insurer...</option>
                      {INSURERS.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <button
                type="submit"
                disabled={createPatient.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {createPatient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Register Patient
              </button>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
