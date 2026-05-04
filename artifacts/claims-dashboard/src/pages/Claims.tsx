import { useState } from "react";
import { useListClaims, getListClaimsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import RiskBadge from "@/components/RiskBadge";
import { RefreshCw, Search, Filter } from "lucide-react";

const STATUSES = ["", "PENDING", "PROCESSING", "SUBMITTED", "APPROVED", "DENIED", "RESUBMITTED", "PAID"] as const;

export default function Claims() {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Claims</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} total claims in the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-md text-sm text-secondary-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link href="/submit" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary rounded-md text-sm text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            + New Claim
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search patient, claim ID, ICD code..."
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
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ICD / CPT</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
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
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No claims found.{" "}
                    <Link href="/submit" className="text-primary hover:underline">Submit a claim</Link>
                  </td>
                </tr>
              ) : (
                filtered.map((claim) => (
                  <tr key={claim.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground text-sm">{claim.patientName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{claim.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{claim.insurerName}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {claim.icdCodes.slice(0, 2).map((code) => (
                          <span key={code} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-mono rounded">{code}</span>
                        ))}
                        {claim.cptCodes.slice(0, 1).map((code) => (
                          <span key={code} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-mono rounded">{code}</span>
                        ))}
                        {claim.icdCodes.length + claim.cptCodes.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{claim.icdCodes.length + claim.cptCodes.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={claim.status} /></td>
                    <td className="px-4 py-2.5"><RiskBadge score={claim.riskScore} /></td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      <div className="text-foreground">${claim.totalAmount.toLocaleString()}</div>
                      {claim.approvedAmount != null && (
                        <div className="text-xs text-emerald-400">${claim.approvedAmount.toLocaleString()} paid</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/claims/${claim.id}`} className="text-xs text-primary hover:underline font-medium">View</Link>
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
