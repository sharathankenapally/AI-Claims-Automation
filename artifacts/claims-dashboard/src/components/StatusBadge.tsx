import { cn } from "@/lib/utils";

type Status = "PENDING" | "APPROVED" | "DENIED" | "SUBMITTED" | "PROCESSING" | "RESUBMITTED" | "PAID";

const STATUS_CONFIG: Record<Status, { label: string; classes: string; dot: string }> = {
  PENDING: { label: "Pending", classes: "bg-amber-500/10 text-amber-400 border border-amber-500/20", dot: "bg-amber-400" },
  PROCESSING: { label: "Processing", classes: "bg-blue-500/10 text-blue-400 border border-blue-500/20", dot: "bg-blue-400 animate-pulse" },
  SUBMITTED: { label: "Submitted", classes: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", dot: "bg-cyan-400" },
  APPROVED: { label: "Approved", classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", dot: "bg-emerald-400" },
  DENIED: { label: "Denied", classes: "bg-red-500/10 text-red-400 border border-red-500/20", dot: "bg-red-400" },
  RESUBMITTED: { label: "Resubmitted", classes: "bg-purple-500/10 text-purple-400 border border-purple-500/20", dot: "bg-purple-400" },
  PAID: { label: "Paid", classes: "bg-teal-500/10 text-teal-400 border border-teal-500/20", dot: "bg-teal-400" },
};

export default function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status as Status] ?? {
    label: status,
    classes: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", config.classes, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}
