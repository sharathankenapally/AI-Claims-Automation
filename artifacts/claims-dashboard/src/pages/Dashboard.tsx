import { useGetDashboardSummary, useGetRecentActivity, useGetDenialAnalysis, useGetRevenueStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import StatusBadge from "@/components/StatusBadge";
import { TrendingUp, TrendingDown, Clock, AlertTriangle, DollarSign, FileText, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function KPICard({ title, value, subtitle, icon: Icon, trend, color }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", color)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trend.positive ? "text-emerald-400" : "text-red-400")}>
            {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5 font-mono">{subtitle}</div>}
      </div>
    </div>
  );
}

const DENIAL_COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#10b981"];

export default function Dashboard() {
  const summary = useGetDashboardSummary();
  const activity = useGetRecentActivity({ limit: 8 });
  const denial = useGetDenialAnalysis();
  const revenue = useGetRevenueStats();

  const s = summary.data;
  const r = revenue.data;

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Claims Command Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time multi-agent pipeline monitoring</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Claims"
          value={s?.totalClaims ?? "—"}
          icon={FileText}
          color="bg-primary/10 text-primary"
          trend={{ value: 12, positive: true }}
        />
        <KPICard
          title="Approved"
          value={s?.approvedClaims ?? "—"}
          subtitle={s ? `${((s.approvedClaims / Math.max(s.totalClaims, 1)) * 100).toFixed(1)}% approval rate` : undefined}
          icon={CheckCircle}
          color="bg-emerald-500/10 text-emerald-400"
          trend={{ value: 5, positive: true }}
        />
        <KPICard
          title="Denied"
          value={s?.deniedClaims ?? "—"}
          subtitle={s ? `${(s.denialRate * 100).toFixed(1)}% denial rate` : undefined}
          icon={XCircle}
          color="bg-red-500/10 text-red-400"
          trend={{ value: 3, positive: false }}
        />
        <KPICard
          title="Avg Risk Score"
          value={s ? `${(s.avgRiskScore * 100).toFixed(0)}%` : "—"}
          subtitle={s ? `${s.avgProcessingTimeHours.toFixed(1)}h avg processing` : undefined}
          icon={AlertTriangle}
          color="bg-amber-500/10 text-amber-400"
        />
      </div>

      {/* Revenue Row */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard
          title="Total Revenue"
          value={r ? `$${(r.actualRevenue / 1000).toFixed(1)}k` : "—"}
          subtitle={r ? `Expected: $${(r.expectedRevenue / 1000).toFixed(1)}k` : undefined}
          icon={DollarSign}
          color="bg-teal-500/10 text-teal-400"
          trend={{ value: 8, positive: true }}
        />
        <KPICard
          title="Pending Revenue"
          value={s ? `$${(s.pendingRevenue / 1000).toFixed(1)}k` : "—"}
          subtitle="Awaiting payer decision"
          icon={Clock}
          color="bg-blue-500/10 text-blue-400"
        />
        <KPICard
          title="Underpayments"
          value={r ? `$${(r.underpaymentAmount / 1000).toFixed(1)}k` : "—"}
          subtitle={r ? `${r.discrepancyCount} disputes filed` : undefined}
          icon={TrendingDown}
          color="bg-orange-500/10 text-orange-400"
        />
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-5 gap-4">
        {/* Revenue Chart */}
        <div className="col-span-3 bg-card border border-card-border rounded-lg p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-foreground">Revenue Reconciliation</div>
            <div className="text-xs text-muted-foreground">Expected vs actual — last 6 months</div>
          </div>
          {revenue.isLoading ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={r?.monthlyBreakdown ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(196 100% 47%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(196 100% 47%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 70% 45%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(142 70% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(218 15% 18%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(210 12% 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(210 12% 55%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(218 22% 11%)", border: "1px solid hsl(218 15% 20%)", borderRadius: "6px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(210 20% 92%)" }}
                  formatter={(v: number) => [`$${v.toFixed(0)}`, ""]}
                />
                <Area type="monotone" dataKey="expected" name="Expected" stroke="hsl(196 100% 47%)" fill="url(#gradExpected)" strokeWidth={2} />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="hsl(142 70% 45%)" fill="url(#gradActual)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Denial Pie */}
        <div className="col-span-2 bg-card border border-card-border rounded-lg p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-foreground">Denial Reasons</div>
            <div className="text-xs text-muted-foreground">
              {denial.data ? `${denial.data.totalDenied} denied · ${(denial.data.resubmissionSuccessRate * 100).toFixed(0)}% resubmit success` : "Loading..."}
            </div>
          </div>
          {denial.isLoading ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : (denial.data?.denialReasons.length ?? 0) === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No denials yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={denial.data?.denialReasons.slice(0, 5) ?? []} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={45} outerRadius={75} strokeWidth={0}>
                  {(denial.data?.denialReasons.slice(0, 5) ?? []).map((_, i) => (
                    <Cell key={i} fill={DENIAL_COLORS[i % DENIAL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(218 22% 11%)", border: "1px solid hsl(218 15% 20%)", borderRadius: "6px", fontSize: "11px" }}
                  formatter={(v: number, _n: string, p: { payload?: { reason?: string } }) => [v, p.payload?.reason ?? ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-card-border rounded-lg">
        <div className="px-4 py-3 border-b border-card-border flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">Recent Agent Activity</div>
          <Link href="/claims" className="text-xs text-primary hover:underline">View all claims</Link>
        </div>
        {activity.isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading activity...</div>
        ) : (activity.data?.activities.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No activity yet. Submit a claim to start the pipeline.</div>
        ) : (
          <div className="divide-y divide-border">
            {activity.data?.activities.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-foreground truncate">{item.patientName}</span>
                    <span className="text-xs text-muted-foreground font-mono">·</span>
                    <span className="text-xs text-primary font-medium">{item.agentName}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.message}</p>
                </div>
                <Link href={`/claims/${item.claimId}`} className="text-xs text-primary hover:underline flex-shrink-0">View</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
