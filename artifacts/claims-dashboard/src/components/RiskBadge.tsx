import { cn } from "@/lib/utils";

export default function RiskBadge({ score, className }: { score: number; className?: string }) {
  const pct = Math.round(score * 100);
  const level = pct >= 70 ? "high" : pct >= 40 ? "medium" : "low";
  const config = {
    high: { label: "High Risk", classes: "text-red-400", bar: "bg-red-500" },
    medium: { label: "Med Risk", classes: "text-amber-400", bar: "bg-amber-500" },
    low: { label: "Low Risk", classes: "text-emerald-400", bar: "bg-emerald-500" },
  }[level];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", config.bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-xs font-mono tabular-nums", config.classes)}>{pct}%</span>
    </div>
  );
}
