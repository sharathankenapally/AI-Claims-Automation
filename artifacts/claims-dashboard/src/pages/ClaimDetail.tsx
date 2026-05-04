import { useGetClaim, getGetClaimQueryKey, useGetClaimEvents, getGetClaimEventsQueryKey, useResubmitClaim } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import RiskBadge from "@/components/RiskBadge";
import {
  ArrowLeft, RefreshCw, RotateCcw, CheckCircle2, XCircle, Clock,
  Loader2, SkipForward, AlertCircle, Brain, DollarSign, FileText,
  Shield, Activity, ChevronRight, Stethoscope
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const AGENT_PIPELINE = [
  "Intake Agent",
  "Clinical NLP Agent",
  "Coding Agent",
  "Claim Optimization Agent",
  "Submission Agent",
  "Monitoring Agent",
  "Denial Handling Agent",
  "Payment Reconciliation Agent",
];

type Tab = "pipeline" | "timeline" | "intelligence";

function StepIcon({ status }: { status: string }) {
  const size = "w-5 h-5";
  if (status === "done") return <CheckCircle2 className={cn(size, "text-emerald-400")} />;
  if (status === "failed") return <XCircle className={cn(size, "text-red-400")} />;
  if (status === "running") return <Loader2 className={cn(size, "text-blue-400 animate-spin")} />;
  if (status === "skipped") return <SkipForward className={cn(size, "text-muted-foreground")} />;
  return <Clock className={cn(size, "text-muted-foreground")} />;
}

function RiskGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score > 0.7 ? "#ef4444" : score > 0.4 ? "#f59e0b" : "#10b981";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference * (1 - score);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="text-center -mt-12">
        <div className="text-xl font-bold tabular-nums" style={{ color }}>{pct}%</div>
        <div className="text-[10px] text-muted-foreground">Risk</div>
      </div>
    </div>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    START: "bg-blue-500/10 text-blue-400",
    DONE: "bg-emerald-500/10 text-emerald-400",
    SKIP: "bg-muted text-muted-foreground",
    ERROR: "bg-red-500/10 text-red-400",
    RISK_GATE: "bg-amber-500/10 text-amber-400",
    AUTOFIX_RETRY: "bg-purple-500/10 text-purple-400",
    RISK_GATE_CLEARED: "bg-emerald-500/10 text-emerald-400",
    RISK_GATE_FORCED: "bg-red-500/10 text-red-400",
    RESUBMIT_CHECK: "bg-blue-500/10 text-blue-400",
    RESUBMIT_RESPONSE: "bg-indigo-500/10 text-indigo-400",
  };
  const cls = map[type] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-medium flex-shrink-0", cls)}>
      {type}
    </span>
  );
}

export default function ClaimDetail() {
  const [, params] = useRoute("/claims/:id");
  const claimId = params?.id ?? "";
  const [activeTab, setActiveTab] = useState<Tab>("pipeline");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: claim, isLoading, refetch } = useGetClaim(claimId, {
    query: {
      enabled: !!claimId,
      queryKey: getGetClaimQueryKey(claimId),
      refetchInterval: 3000,
    },
  });

  const { data: events } = useGetClaimEvents(claimId, {
    query: {
      enabled: !!claimId,
      queryKey: getGetClaimEventsQueryKey(claimId),
      refetchInterval: 3000,
    },
  });

  const { data: timeline, refetch: refetchTimeline } = useQuery({
    queryKey: ["claim-timeline", claimId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/claims/${claimId}/timeline`);
      if (!res.ok) throw new Error("Failed to load timeline");
      return res.json();
    },
    enabled: !!claimId,
    refetchInterval: 4000,
  });

  const resubmit = useResubmitClaim({
    mutation: {
      onSuccess: () => {
        toast({ title: "Resubmission started", description: "The claim pipeline has been restarted." });
        qc.invalidateQueries({ queryKey: getGetClaimQueryKey(claimId) });
        qc.invalidateQueries({ queryKey: ["claim-timeline", claimId] });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">Claim not found</p>
        <Link href="/claims" className="text-primary hover:underline text-sm mt-2 block">Back to claims</Link>
      </div>
    );
  }

  const stepMap = Object.fromEntries((claim.agentSteps ?? []).map((s) => [s.agent, s]));

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/claims" className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{claim.patientName}</h1>
              <StatusBadge status={claim.status} />
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{claim.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetch(); refetchTimeline(); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary rounded-md text-xs text-secondary-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          {(claim.status === "DENIED" || claim.status === "PENDING") && (
            <button
              onClick={() => resubmit.mutate({ claimId, agentName: null })}
              disabled={resubmit.isPending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary rounded-md text-xs text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <RotateCcw className="w-3 h-3" />
              Resubmit
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: "pipeline", label: "Pipeline", icon: Activity },
          { key: "timeline", label: "Full Timeline", icon: ChevronRight },
          { key: "intelligence", label: "AI Intelligence", icon: Brain },
        ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: PIPELINE ─────────────────────────────────────────────────── */}
      {activeTab === "pipeline" && (
        <div className="grid grid-cols-3 gap-4">
          {/* Left: Claim Info */}
          <div className="space-y-4">
            <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Claim Summary</div>
              <div className="space-y-2">
                {[
                  ["Insurer", claim.insurerName],
                  ["Total Amount", `$${claim.totalAmount.toLocaleString()}`],
                  ["Approved", claim.approvedAmount != null ? `$${Number(claim.approvedAmount).toLocaleString()}` : "—"],
                  ["Payment", claim.paymentStatus ?? "—"],
                  ["Submitted", claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString() : "—"],
                  ["Resolved", claim.resolvedAt ? new Date(claim.resolvedAt).toLocaleDateString() : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Assessment</div>
              <RiskBadge score={claim.riskScore} />
              {claim.denialReason && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400">
                  {claim.denialReason}
                </div>
              )}
            </div>

            <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medical Codes</div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1.5">ICD-10</div>
                <div className="flex flex-wrap gap-1">
                  {claim.icdCodes.length === 0 ? <span className="text-xs text-muted-foreground">None</span> :
                    claim.icdCodes.map((c) => (
                      <span key={c} className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono rounded">{c}</span>
                    ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1.5">CPT</div>
                <div className="flex flex-wrap gap-1">
                  {claim.cptCodes.length === 0 ? <span className="text-xs text-muted-foreground">None</span> :
                    claim.cptCodes.map((c) => (
                      <span key={c} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs font-mono rounded">{c}</span>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Middle+Right: Pipeline + log */}
          <div className="col-span-2 space-y-4">
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Agent Pipeline</div>
              <div className="space-y-0">
                {AGENT_PIPELINE.map((agentName, idx) => {
                  const step = stepMap[agentName];
                  const status = step?.status ?? "pending";
                  const isLast = idx === AGENT_PIPELINE.length - 1;
                  return (
                    <div key={agentName} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="mt-0.5 flex-shrink-0"><StepIcon status={status} /></div>
                        {!isLast && (
                          <div className={cn("w-px flex-1 mt-1 mb-1", status === "done" ? "bg-emerald-400/40" : "bg-border")} style={{ minHeight: "28px" }} />
                        )}
                      </div>
                      <div className={cn("flex-1 pb-4", isLast ? "pb-0" : "")}>
                        <div className="flex items-center justify-between">
                          <div className={cn("text-sm font-medium",
                            status === "done" ? "text-foreground" :
                            status === "running" ? "text-blue-400" :
                            status === "failed" ? "text-red-400" : "text-muted-foreground"
                          )}>
                            {agentName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {step?.startedAt && <span>{new Date(step.startedAt).toLocaleTimeString()}</span>}
                            <span className={cn("capitalize font-medium",
                              status === "done" ? "text-emerald-400" :
                              status === "running" ? "text-blue-400" :
                              status === "failed" ? "text-red-400" : "text-muted-foreground"
                            )}>{status}</span>
                          </div>
                        </div>
                        {step?.output && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.output}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Issues Detected</div>
                {claim.issuesDetected.length === 0 ? (
                  <p className="text-xs text-emerald-400">No issues detected</p>
                ) : (
                  <ul className="space-y-1.5">
                    {claim.issuesDetected.map((issue, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                        <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Actions Taken</div>
                {claim.actionsTaken.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Processing...</p>
                ) : (
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {claim.actionsTaken.map((action, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                        <span className="text-primary mt-0.5 flex-shrink-0">+</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {events && events.events.length > 0 && (
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Decision Log</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {events.events.map((e) => (
                    <div key={e.id} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground font-mono flex-shrink-0">{new Date(e.createdAt).toLocaleTimeString()}</span>
                      <span className="text-primary font-medium flex-shrink-0">[{e.agentName.replace(" Agent", "")}]</span>
                      <span className="text-muted-foreground">{e.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: FULL TIMELINE ──────────────────────────────────────────────── */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          {!timeline ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {/* Clinical Layer */}
              <div className="col-span-1 space-y-4">
                <div className="bg-card border border-card-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope className="w-3.5 h-3.5 text-primary" />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clinical Layer</div>
                  </div>
                  {timeline.clinical?.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No clinical notes linked</p>
                  ) : (
                    timeline.clinical?.map((note: any) => (
                      <div key={note.noteId} className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-[10px] text-muted-foreground">DOCTOR NOTES</div>
                          <p className="text-xs text-foreground leading-relaxed line-clamp-4">{note.rawNotes}</p>
                        </div>
                        {note.extracted && (
                          <>
                            <div className="space-y-1">
                              <div className="text-[10px] text-muted-foreground">EXTRACTED DIAGNOSES</div>
                              <div className="flex flex-wrap gap-1">
                                {note.extracted.diagnoses.map((d: string) => (
                                  <span key={d} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded">{d}</span>
                                ))}
                              </div>
                            </div>
                            {note.extracted.symptoms.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[10px] text-muted-foreground">SYMPTOMS</div>
                                <div className="flex flex-wrap gap-1">
                                  {note.extracted.symptoms.map((s: string) => (
                                    <span key={s} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="text-[10px] text-muted-foreground">PROCEDURES</div>
                              <div className="flex flex-wrap gap-1">
                                {note.extracted.procedures.map((p: string) => (
                                  <span key={p} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] rounded">{p}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Severity Score</span>
                              <span className="font-medium text-foreground">{(note.extracted.severityScore * 100).toFixed(0)}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Payment */}
                {timeline.payments?.length > 0 && (
                  <div className="bg-card border border-card-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Reconciliation</div>
                    </div>
                    {timeline.payments.map((p: any) => (
                      <div key={p.paymentId} className="space-y-2">
                        {[
                          ["Expected", `$${p.amountExpected?.toLocaleString()}`],
                          ["Received", `$${p.amountReceived?.toLocaleString()}`],
                          ["Status", p.paymentStatus],
                          ["Payer Ref", p.payerReference ?? "—"],
                          ["Paid On", p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "—"],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={cn("font-medium",
                              label === "Status" && value === "PAID" ? "text-emerald-400" :
                              label === "Status" && value === "UNDERPAID" ? "text-amber-400" :
                              label === "Status" && value === "DENIED" ? "text-red-400" : "text-foreground"
                            )}>{value}</span>
                          </div>
                        ))}
                        {p.amountExpected > p.amountReceived && p.amountReceived > 0 && (
                          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-400">
                            Underpayment: ${(p.amountExpected - p.amountReceived).toFixed(2)} — dispute filed
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chronological Event Timeline */}
              <div className="col-span-2 space-y-4">
                <div className="bg-card border border-card-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Claim Lifecycle — {timeline.events?.length ?? 0} events
                    </div>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {(timeline.events ?? []).map((e: any, i: number) => (
                      <div key={e.id ?? i} className="flex items-start gap-2.5">
                        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 mt-0.5 w-16 text-right">
                          {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        <EventTypeBadge type={e.eventType} />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-medium text-primary mr-1">[{e.agentName.replace(" Agent", "")}]</span>
                          <span className="text-xs text-muted-foreground">{e.message}</span>
                        </div>
                      </div>
                    ))}
                    {(timeline.events ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">Pipeline still running...</p>
                    )}
                  </div>
                </div>

                {/* Audit Trail */}
                <div className="bg-card border border-card-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Compliance Audit Trail — {timeline.auditTrail?.length ?? 0} entries
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {(timeline.auditTrail ?? []).map((a: any, i: number) => (
                      <div key={a.logId ?? i} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground font-mono flex-shrink-0 w-16 text-right">
                          {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400 flex-shrink-0 truncate max-w-[180px]">{a.action}</span>
                        <span className="text-muted-foreground text-[10px]">{a.performedBy}</span>
                      </div>
                    ))}
                    {(timeline.auditTrail ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">No audit entries yet</p>
                    )}
                  </div>
                </div>

                {/* Step Performance */}
                {timeline.steps?.filter((s: any) => s.durationMs != null).length > 0 && (
                  <div className="bg-card border border-card-border rounded-lg p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Agent Execution Times</div>
                    <div className="space-y-2">
                      {timeline.steps?.filter((s: any) => s.status !== "pending").map((s: any) => (
                        <div key={s.agent} className="flex items-center gap-3">
                          <div className="text-xs text-muted-foreground w-40 truncate flex-shrink-0">{s.agent.replace(" Agent", "")}</div>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            {s.durationMs != null && (
                              <div
                                className={cn("h-full rounded-full transition-all", s.status === "done" ? "bg-emerald-400" : s.status === "skipped" ? "bg-muted-foreground" : "bg-red-400")}
                                style={{ width: `${Math.min((s.durationMs / 1000) * 100, 100)}%` }}
                              />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground w-14 text-right flex-shrink-0">
                            {s.status === "skipped" ? "skipped" : s.durationMs != null ? `${s.durationMs}ms` : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: AI INTELLIGENCE ──────────────────────────────────────────── */}
      {activeTab === "intelligence" && (
        <div className="space-y-4">
          {!timeline?.intelligence ? (
            <div className="flex items-center justify-center py-12 flex-col gap-2">
              <Brain className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Intelligence data not yet available — pipeline still processing</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {/* Risk Gauge + Stats */}
              <div className="space-y-4">
                <div className="bg-card border border-card-border rounded-lg p-5 flex flex-col items-center gap-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider self-start">AI Risk Score</div>
                  <RiskGauge score={timeline.intelligence.riskScore} />
                  <div className="w-full space-y-2 pt-2 border-t border-border">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Denial Probability</span>
                      <span className="font-medium text-foreground">{(timeline.intelligence.denialProbability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Model Version</span>
                      <span className="font-mono text-muted-foreground">{timeline.intelligence.modelVersion}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Threshold</span>
                      <span className="font-medium text-foreground">0.70 (auto-fix gate)</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Generated</span>
                      <span className="text-muted-foreground">{new Date(timeline.intelligence.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issues + Recommendations */}
              <div className="col-span-2 space-y-4">
                <div className="bg-card border border-card-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Issues Found ({timeline.intelligence.issuesFound?.length ?? 0})
                    </div>
                  </div>
                  {(timeline.intelligence.issuesFound ?? []).length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      No issues found — claim passed all AI checks
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {timeline.intelligence.issuesFound.map((issue: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 p-2 bg-red-500/5 border border-red-500/10 rounded-md text-xs text-foreground">
                          <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-card border border-card-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      AI Recommendations ({timeline.intelligence.recommendations?.length ?? 0})
                    </div>
                  </div>
                  {(timeline.intelligence.recommendations ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No recommendations — claim optimally coded</p>
                  ) : (
                    <ul className="space-y-2">
                      {timeline.intelligence.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 p-2 bg-primary/5 border border-primary/10 rounded-md text-xs text-foreground">
                          <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Doctor Notes */}
                <div className="bg-card border border-card-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source Clinical Notes</div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{claim.doctorNotes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
