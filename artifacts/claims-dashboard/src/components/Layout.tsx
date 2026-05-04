import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  PlusCircle,
  Activity,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/claims", label: "Claims", icon: FileText },
  { path: "/patients", label: "Patients", icon: Users },
  { path: "/submit", label: "Submit Claim", icon: PlusCircle },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-xs font-bold text-sidebar-foreground tracking-wider uppercase">ClaimAI</div>
            <div className="text-[10px] text-muted-foreground">Claims Intelligence</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150 group",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 text-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-[10px] text-muted-foreground font-mono">
            <div className="text-primary font-semibold text-xs mb-0.5">8 Agents Active</div>
            <div>Multi-agent pipeline</div>
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
