import { useGetClaim, getGetClaimQueryKey, useGetClaimEvents, getGetClaimEventsQueryKey, useResubmitClaim } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import RiskBadge from "@/components/RiskBadge";
import { ArrowLeft, RefreshCw, RotateCcw, CheckCircle2, XCircle, Clock, Loader2, SkipForward, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

function StepIcon({ status }: { status: string }) {
  const size = "w-5 h-5";
  if (status === "done") return <CheckCircle2 className={cn(size, "text-emerald-400")} />;
  if (status === "failed") return <XCircle className={cn(size, "text-red-400")} />;
  if (status === "running") return <Loader2 className={cn(size, "text-blue-400 animate-spin")} />;
  if (status === "skipped") return <SkipForward className={cn(size, "text-muted-foreground")} />;
  return <Clock className={cn(size, "text-muted-foreground")} />;
}

export default function ClaimDetail() {
  const [, params] = useRoute("/claims/:id");
  const claimId = params?.id ?? "";
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

  const resubmit = useResubmitClaim({
    mutation: {
      onSuccess: () => {
        toast({ title: "Resubmission started", description: "The claim pipeline has been restarted." });
        qc.invalidateQueries({ queryKey: getGetClaimQueryKey(claimId) });
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
            onClick={() => refetch()}
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

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Claim Info */}
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Claim Summary</div>
            <div className="space-y-2">
              {[
                ["Insurer", claim.insurerName],
                ["Total Amount", `$${claim.totalAmount.toLocaleString()}`],
                ["Approved", claim.approvedAmount != null ? `$${claim.approvedAmount.toLocaleString()}` : "—"],
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

          {/* Risk */}
          <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Assessment</div>
            <RiskBadge score={claim.riskScore} />
            {claim.denialReason && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400">
                {claim.denialReason}
              </div>
            )}
          </div>

          {/* Codes */}
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

        {/* Middle: Agent Pipeline */}
        <div className="col-span-2 space-y-4">
          {/* Pipeline */}
          <div className="bg-card border border-card-border rounded-lg p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Agent Pipeline</div>
            <div className="space-y-0">
              {AGENT_PIPELINE.map((agentName, idx) => {
                const step = stepMap[agentName];
                const status = step?.status ?? "pending";
                const isLast = idx === AGENT_PIPELINE.length - 1;
                return (
                  <div key={agentName} className="flex gap-3">
                    {/* Connector */}
                    <div className="flex flex-col items-center">
                      <div className="mt-0.5 flex-shrink-0">
                        <StepIcon status={status} />
                      </div>
                      {!isLast && (
                        <div className={cn("w-px flex-1 mt-1 mb-1", status === "done" ? "bg-emerald-400/40" : "bg-border")} style={{ minHeight: "28px" }} />
                      )}
                    </div>
                    {/* Content */}
                    <div className={cn("flex-1 pb-4", isLast ? "pb-0" : "")}>
                      <div className="flex items-center justify-between">
                        <div className={cn("text-sm font-medium", status === "done" ? "text-foreground" : status === "running" ? "text-blue-400" : status === "failed" ? "text-red-400" : "text-muted-foreground")}>
                          {agentName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {step?.startedAt && <span>{new Date(step.startedAt).toLocaleTimeString()}</span>}
                          <span className={cn("capitalize font-medium",
                            status === "done" ? "text-emerald-400" :
                            status === "running" ? "text-blue-400" :
                            status === "failed" ? "text-red-400" :
                            status === "skipped" ? "text-muted-foreground" : "text-muted-foreground"
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

          {/* Issues & Actions */}
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

          {/* Event Log */}
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
    </div>
  );
}
