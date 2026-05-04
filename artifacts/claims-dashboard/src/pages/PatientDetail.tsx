import { useGetPatient, getGetPatientQueryKey, useListClaims, getListClaimsQueryKey } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import StatusBadge from "@/components/StatusBadge";
import RiskBadge from "@/components/RiskBadge";
import { ArrowLeft, Loader2, AlertCircle, User, Shield, Calendar } from "lucide-react";

export default function PatientDetail() {
  const [, params] = useRoute("/patients/:id");
  const patientId = params?.id ?? "";

  const { data: patient, isLoading } = useGetPatient(patientId, {
    query: {
      enabled: !!patientId,
      queryKey: getGetPatientQueryKey(patientId),
    },
  });

  const { data: claims } = useListClaims({ page: 1, limit: 50 }, {
    query: { queryKey: getListClaimsQueryKey() },
  });

  const patientClaims = claims?.claims.filter((c) => c.patientId === patientId) ?? [];

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  }

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">Patient not found</p>
        <Link href="/patients" className="text-primary hover:underline text-sm mt-2 block">Back to patients</Link>
      </div>
    );
  }

  const totalRevenue = patientClaims.reduce((s, c) => s + (c.approvedAmount ?? 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/patients" className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{patient.firstName} {patient.lastName}</h1>
            <p className="text-xs text-muted-foreground font-mono">{patient.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient Info</div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">{patient.firstName} {patient.lastName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">{patient.dateOfBirth}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">{patient.insurerName}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurance</div>
            <div className="space-y-2">
              {[
                ["Member ID", patient.memberId],
                ["Group", patient.groupNumber],
                ["Status", patient.eligibilityStatus],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cn("font-medium", value === "ELIGIBLE" ? "text-emerald-400" : value === "INELIGIBLE" ? "text-red-400" : "text-foreground")}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Claim Stats</div>
            <div className="space-y-2">
              {[
                ["Total Claims", patientClaims.length],
                ["Approved", patientClaims.filter((c) => c.status === "APPROVED" || c.status === "PAID").length],
                ["Denied", patientClaims.filter((c) => c.status === "DENIED").length],
                ["Revenue", `$${totalRevenue.toFixed(0)}`],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="bg-card border border-card-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border">
              <div className="text-sm font-semibold text-foreground">Claims History</div>
            </div>
            {patientClaims.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No claims for this patient yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {patientClaims.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-2.5"><RiskBadge score={c.riskScore} /></td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground">${c.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/claims/${c.id}`} className="text-xs text-primary hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...args: (string | undefined | false | null)[]) {
  return args.filter(Boolean).join(" ");
}
