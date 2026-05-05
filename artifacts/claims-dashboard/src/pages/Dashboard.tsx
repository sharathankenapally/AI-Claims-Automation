import { useGetDashboardSummary, useGetRecentActivity, useGetDenialAnalysis, useGetRevenueStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatusBadge from "@/components/StatusBadge";
import { TrendingUp, TrendingDown, Clock, AlertTriangle, DollarSign, FileText, CheckCircle, XCircle, Bot, ArrowRight, Stethoscope, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function KPICard({ title, value, subtitle, icon: Icon, trend, color, help }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  color: string;
  help?: string;
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
        {help && <div className="text-[10px] text-muted-foreground/60 mt-1 italic">{help}</div>}
      </div>
    </div>
  );
}

const DENIAL_COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#10b981"];

const HOW_IT_WORKS = [
  { step: "1", label: "Doctor submits clinical notes", icon: Stethoscope, color: "text-blue-400" },
  { step: "2", label: "AI extracts diagnoses & codes claims", icon: Bot, color: "text-purple-400" },
  { step: "3", label: "Risk checked & auto-fixed if needed", icon: AlertTriangle, color: "text-amber-400" },
  { step: "4", label: "Submitted to insurer, outcome tracked", icon: ShieldCheck, color: "text-emerald-400" },
];

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Live Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time view of your AI-powered insurance claims pipeline
          </p>
        </div>
        <Link href="/submit" className="flex items-center gap-1.5 px-3 py-2 bg-primary rounded-md text-sm text-primary-foreground font-medium hover:opacity-90 transition-opacity">
          <Bot className="w-3.5 h-3.5" />
          Submit a Claim
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* How it works banner */}
      <div className="bg-card border border-card-border rounded-lg p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">How it works</div>
        <div className="grid grid-cols-4 gap-3">
          {HOW_IT_WORKS.map(({ step, label, icon: Icon, color }, i) => (
            <div key={step} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className={cn("w-3.5 h-3.5", color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-muted-foreground">Step {step}</div>
                <div className="text-xs text-foreground leading-tight">{label}</div>
              </div>
              {i < 3 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Claims Overview</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Claims Processed"
            value={s?.totalClaims ?? "—"}
            icon={FileText}
            color="bg-primary/10 text-primary"
            trend={{ value: 12, positive: true }}
            help="All claims ever submitted"
          />
          <KPICard
            title="Claims Approved"
            value={s?.approvedClaims ?? "—"}
            subtitle={s ? `${((s.approvedClaims / Math.max(s.totalClaims, 1)) * 100).toFixed(1)}% approval rate` : undefined}
            icon={CheckCircle}
            color="bg-emerald-500/10 text-emerald-400"
            trend={{ value: 5, positive: true }}
            help="Approved by the insurer"
          />
          <KPICard
            title="Claims Denied"
            value={s?.deniedClaims ?? "—"}
            subtitle={s ? `${(s.denialRate * 100).toFixed(1)}% denial rate` : undefined}
            icon={XCircle}
            color="bg-red-500/10 text-red-400"
            trend={{ value: 3, positive: false }}
            help="Denied — auto-fix attempted"
          />
          <KPICard
            title="Average Risk Score"
            value={s ? `${(s.avgRiskScore * 100).toFixed(0)}%` : "—"}
            subtitle={s ? `${s.avgProcessingTimeHours.toFixed(1)}h avg processing time` : undefined}
            icon={AlertTriangle}
            color="bg-amber-500/10 text-amber-400"
            help="Denial risk predicted by AI (lower = better)"
          />
        </div>
      </div>

      {/* Revenue Row */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Financial Summary</div>
        <div className="grid grid-cols-3 gap-4">
          <KPICard
            title="Total Revenue Collected"
            value={r ? `$${(r.actualRevenue / 1000).toFixed(1)}k` : "—"}
            subtitle={r ? `Expected: $${(r.expectedRevenue / 1000).toFixed(1)}k` : undefined}
            icon={DollarSign}
            color="bg-teal-500/10 text-teal-400"
            trend={{ value: 8, positive: true }}
            help="Payments received from insurers"
          />
          <KPICard
            title="Revenue Pending"
            value={s ? `$${(s.pendingRevenue / 1000).toFixed(1)}k` : "—"}
            subtitle="Awaiting insurer decision"
            icon={Clock}
            color="bg-blue-500/10 text-blue-400"
            help="Claims still being reviewed"
          />
          <KPICard
            title="Underpayment Disputes"
            value={r ? `$${(r.underpaymentAmount / 1000).toFixed(1)}k` : "—"}
            subtitle={r ? `${r.discrepancyCount} dispute(s) filed` : undefined}
            icon={TrendingDown}
            color="bg-orange-500/10 text-orange-400"
            help="Insurer paid less than expected"
          />
        </div>
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-5 gap-4">
        {/* Revenue Chart */}
        <div className="col-span-3 bg-card border border-card-border rounded-lg p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-foreground">Revenue Reconciliation</div>
            <div className="text-xs text-muted-foreground">What we expected vs what insurers actually paid — last 6 months</div>
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
                <Area type="monotone" dataKey="actual" name="Actual Paid" stroke="hsl(142 70% 45%)" fill="url(#gradActual)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-0.5 bg-cyan-400 rounded inline-block" /> Expected</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-0.5 bg-emerald-400 rounded inline-block" /> Actual Paid</div>
          </div>
        </div>

        {/* Denial Pie */}
        <div className="col-span-2 bg-card border border-card-border rounded-lg p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-foreground">Why Claims Get Denied</div>
            <div className="text-xs text-muted-foreground">
              {denial.data
                ? `${denial.data.totalDenied} denied · ${(denial.data.resubmissionSuccessRate * 100).toFixed(0)}% fixed on resubmission`
                : "Loading..."}
            </div>
          </div>
          {denial.isLoading ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : (denial.data?.denialReasons.length ?? 0) === 0 ? (
            <div className="h-52 flex items-center justify-center flex-col gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <p className="text-sm text-muted-foreground">No denials yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={denial.data?.denialReasons.slice(0, 5) ?? []} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={40} outerRadius={68} strokeWidth={0}>
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
              <div className="space-y-1 mt-1">
                {(denial.data?.denialReasons.slice(0, 3) ?? []).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DENIAL_COLORS[i % DENIAL_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{d.reason}</span>
                    <span className="text-foreground font-medium ml-auto flex-shrink-0">{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-card-border rounded-lg">
        <div className="px-4 py-3 border-b border-card-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">Recent AI Agent Activity</div>
            <div className="text-xs text-muted-foreground">Live feed of what each agent is doing right now</div>
          </div>
          <Link href="/claims" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all claims <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {activity.isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading activity...</div>
        ) : (activity.data?.activities.length ?? 0) === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Bot className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No activity yet.</p>
            <Link href="/submit" className="text-xs text-primary hover:underline">Submit your first claim to start the AI pipeline</Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activity.data?.activities.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-foreground truncate">{item.patientName}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-primary font-medium">{item.agentName}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.message}</p>
                </div>
                <Link href={`/claims/${item.claimId}`} className="text-xs text-primary hover:underline flex-shrink-0 mt-0.5">
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
