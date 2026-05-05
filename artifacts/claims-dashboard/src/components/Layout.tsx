import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  PlusCircle,
  Activity,
  ChevronRight,
  Bot,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  {
    path: "/",
    label: "Dashboard",
    description: "Live overview & KPIs",
    icon: LayoutDashboard,
  },
  {
    path: "/claims",
    label: "Insurance Claims",
    description: "Track & review claims",
    icon: FileText,
  },
  {
    path: "/patients",
    label: "Patients",
    description: "Manage patient records",
    icon: Users,
  },
  {
    path: "/submit",
    label: "New Claim",
    description: "Submit to AI pipeline",
    icon: PlusCircle,
  },
];

const PIPELINE_AGENTS = ["Intake", "Clinical NLP", "Coding", "Optimization", "Submission", "Monitoring", "Denial Fix", "Payment"];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">

        {/* Branding */}
        <div className="px-4 pt-5 pb-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <Activity className="w-4.5 h-4.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-bold text-sidebar-foreground tracking-wide">ClaimAI</div>
              <div className="text-[10px] text-primary font-medium">AI-Powered Claims Automation</div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Automatically processes doctor notes through an 8-step AI pipeline to generate, submit, and reconcile insurance claims.
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          <div className="px-3 py-1.5 mb-1">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Navigation</span>
          </div>
          {navItems.map(({ path, label, description, icon: Icon }) => {
            const active = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-all duration-150 group",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-medium leading-tight", active ? "text-sidebar-primary" : "")}>{label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{description}</div>
                </div>
                {active && <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Pipeline status */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-1.5">
            <Bot className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary">8 AI Agents Online</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto animate-pulse" />
          </div>
          <div className="flex flex-wrap gap-1">
            {PIPELINE_AGENTS.map((a) => (
              <span key={a} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] rounded font-mono">{a}</span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-muted-foreground">HIPAA-compliant audit trail</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
