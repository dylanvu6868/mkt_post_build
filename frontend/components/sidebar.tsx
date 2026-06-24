"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useProjectStore } from "@/store/project";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/knowledge-base", label: "Knowledge Base" },
  { href: "/brand-voice", label: "Brand Voice" },
  { href: "/generate", label: "Generate" },
  { href: "/history", label: "History" },
];

const ADMIN_ITEMS = [
  { href: "/admin", label: "Analytics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/content", label: "Content" },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const activeProject = useProjectStore((s) => s.activeProject);

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm p-5">
      <div className="mb-8">
        <h1 className="text-lg font-bold tracking-tight">AI Marketing</h1>
        {activeProject && (
          <p className="mt-1.5 text-xs text-muted-foreground truncate">
            {activeProject.name}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
              pathname === item.href
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
        {user?.is_admin && (
          <>
            <div className="pt-5 pb-2">
              <span className="px-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Admin
              </span>
            </div>
            {ADMIN_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                  pathname === item.href
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="mt-auto space-y-3 border-t border-border/50 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
            {user?.email}
          </span>
          <ThemeToggle />
        </div>
        <button
          onClick={logout}
          className="w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
