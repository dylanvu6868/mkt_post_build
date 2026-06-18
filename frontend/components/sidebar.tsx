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

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const activeProject = useProjectStore((s) => s.activeProject);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card p-4">
      <div className="mb-6">
        <h1 className="text-lg font-bold">AI Marketing</h1>
        {activeProject && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
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
              "block rounded-md px-3 py-2 text-sm transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">
            {user?.email}
          </span>
          <ThemeToggle />
        </div>
        <button
          onClick={logout}
          className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
