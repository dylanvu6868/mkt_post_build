import { Link } from "@tanstack/react-router";
import { Zap, Sun, Moon, ArrowRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground glow-yellow">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">Vitba<span className="text-primary">.ai</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Tính năng</a>
          <a href="#hub" className="hover:text-foreground transition">Marketing Hub</a>
          <a href="#how" className="hover:text-foreground transition">Cách hoạt động</a>
          <a href="#agents" className="hover:text-foreground transition">Agents</a>
          <Link to="/pricing" className="hover:text-foreground transition">Bảng giá</Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent transition"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/pricing"
            className="hidden sm:inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition"
          >
            Đăng nhập
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground glow-yellow hover:opacity-90 transition"
          >
            Dùng thử <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
