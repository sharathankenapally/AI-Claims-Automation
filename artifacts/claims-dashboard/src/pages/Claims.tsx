import { useState } from "react";
import { useListClaims, getListClaimsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import RiskBadge from "@/components/RiskBadge";
import { RefreshCw, Search, Filter, Bot, ArrowRight, Info } from "lucide-react";

const STATUSES = ["", "PENDING", "PROCESSING", "SUBMITTED", "APPROVED", "DENIED", "RESUBMITTED", "PAID"] as const;

const STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING: "Waiting to be picked up by the AI pipeline",
  PROCESSING: "AI agents are actively working on this claim",
  SUBMITTED: "Sent to the insurance company for review",
  APPROVED: "Insurer approved the claim",
  DENIED: "Insurer denied — AI attempted automatic fix",
  RESUBMITTED: "Re-sent to insurer after AI corrections",
  PAID: "Payment received and reconciled",
};

export default function Claims() {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useListClaims(
    status ? { status: status as "PENDING", page: 1, limit: 50 } : { page: 1, limit: 50 },
    {
      query: {
        queryKey: getListClaimsQueryKey(status ? { status: status as "PENDING" } : undefined),
        refetchInterval: 5000,
      },
    }
  );

  const filtered = data?.claims.filter((c) =>
    search === "" ||
    c.patientName.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.icdCodes.some((code) => code.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  return (
    <div className="p-6 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Insurance Claims</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every claim here was processed by the 8-agent AI pipeline — from doctor notes to payment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary rounded-md text-xs text-secondary-foreground hover:bg-accent transition-colors"
            title="Show status guide"
          >
            <Info className="w-3.5 h-3.5" />
            Status Guide
          </button>
          <button
            onClick={() => { refetch(); qc.invalidateQueries({ queryKey: getListClaimsQueryKey() }); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-md text-sm text-secondary-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link href="/submit" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary rounded-md text-sm text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            <Bot className="w-3.5 h-3.5" />
            New Claim
          </Link>
        </div>
      </div>

      {/* Status guide (collapsible) */}
      {showHelp && (
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Claim Status Guide</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(STATUS_DESCRIPTIONS).map(([status, desc]) => (
              <div key={status} className="flex items-start gap-2">
                <StatusBadge status={status} />
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{data?.total ?? 0} total claims</span>
        {data && (
          <>
            <span>·</span>
            <span className="text-emerald-400">{data.claims.filter(c => c.status === "PAID").length} paid</span>
            <span>·</span>
            <span className="text-blue-400">{data.claims.filter(c => ["PROCESSING", "SUBMITTED"].includes(c.status)).length} in progress</span>
            <span>·</span>
            <span className="text-red-400">{data.claims.filter(c => c.status === "DENIED").length} denied</span>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by patient name, claim ID or medical code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-muted border border-border rounded-md text-sm text-foreground px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === "" ? "All Statuses" : s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurer</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span title="ICD = diagnosis code, CPT = procedure code">ICD / CPT Codes</span>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span title="AI-predicted probability of denial (0% = safe, 100% = high risk)">Denial Risk</span>
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">No claims found.</p>
                    <Link href="/submit" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      Submit a claim to start the AI pipeline <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((claim) => (
                  <tr key={claim.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground text-sm">{claim.patientName}</div>
                      <div className="text-xs text-muted-foreground font-mono" title={claim.id}>{claim.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{claim.insurerName}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {claim.icdCodes.slice(0, 2).map((code) => (
                          <span key={code} title={`Diagnosis code: ${code}`} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-mono rounded">{code}</span>
                        ))}
                        {claim.cptCodes.slice(0, 1).map((code) => (
                          <span key={code} title={`Procedure code: ${code}`} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-mono rounded">{code}</span>
                        ))}
                        {claim.icdCodes.length + claim.cptCodes.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{claim.icdCodes.length + claim.cptCodes.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={claim.status} /></td>
                    <td className="px-4 py-2.5"><RiskBadge score={claim.riskScore} /></td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      <div className="text-foreground">${claim.totalAmount.toLocaleString()}</div>
                      {claim.approvedAmount != null && (
                        <div className="text-xs text-emerald-400">${Number(claim.approvedAmount).toLocaleString()} paid</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/claims/${claim.id}`} className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
