import { useListPatients, getListPatientsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const ELIGIBILITY_CONFIG: Record<string, { label: string; classes: string }> = {
  ELIGIBLE: { label: "Eligible", classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  INELIGIBLE: { label: "Ineligible", classes: "bg-red-500/10 text-red-400 border border-red-500/20" },
  PENDING: { label: "Pending", classes: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
};

export default function Patients() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListPatients({
    query: { queryKey: getListPatientsQueryKey() },
  });

  const filtered = data?.patients.filter((p) =>
    search === "" ||
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    p.memberId.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} registered patients</p>
        </div>
        <Link href="/submit" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary rounded-md text-sm text-primary-foreground font-medium hover:opacity-90 transition-opacity">
          <UserPlus className="w-3.5 h-3.5" />
          New Claim
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by name or member ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member ID</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurer</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Eligibility</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">DOB</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">No patients found.</td>
              </tr>
            ) : (
              filtered.map((p) => {
                const eligConfig = ELIGIBILITY_CONFIG[p.eligibilityStatus] ?? ELIGIBILITY_CONFIG.PENDING!;
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{p.firstName} {p.lastName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.memberId}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{p.insurerName}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", eligConfig.classes)}>
                        {eligConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.dateOfBirth}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/patients/${p.id}`} className="text-xs text-primary hover:underline font-medium">View</Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
