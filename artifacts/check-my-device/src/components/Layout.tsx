import { Link, useLocation } from "wouter";
import { Moon, Sun, Activity, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useTestContext } from "@/context/TestContext";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const { results } = useTestContext();

  const completedTests = Object.values(results).filter(s => s !== 'untested').length;
  const totalTests = Object.keys(results).length;
  const progressPercent = (completedTests / totalTests) * 100;

  const isTestPage = location.startsWith('/test/');
  const isWideTestPage = location === '/test/keyboard';
  const contentWidth = isWideTestPage ? 'max-w-[90rem]' : 'max-w-5xl';

  // Derive readable test name from path for breadcrumb
  const testName = isTestPage
    ? location.replace('/test/', '').charAt(0).toUpperCase() +
      location.replace('/test/', '').slice(1)
    : null;

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary/15 selection:text-primary">
      {/* ── Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className={`container mx-auto px-6 h-[52px] flex items-center justify-between gap-4 ${contentWidth}`}>
          {/* Left: logo + optional breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0 group transition-opacity hover:opacity-75"
              aria-label="CheckMyDevice home"
            >
              <Activity className="w-4 h-4 text-primary" strokeWidth={2} />
              <span
                className="font-semibold text-sm tracking-tight text-foreground hidden sm:block"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                CheckMyDevice
              </span>
            </Link>

            {isTestPage && testName && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-border flex-shrink-0" aria-hidden="true" />
                <Link
                  href="/dashboard"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                >
                  Dashboard
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-border flex-shrink-0 hidden sm:block" aria-hidden="true" />
                <span className="text-xs text-foreground font-medium truncate hidden sm:block">
                  {testName}
                </span>
              </>
            )}
          </div>

          {/* Right: progress + theme toggle */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Thin progress bar with mono readout */}
            <div className="hidden md:flex flex-col items-end gap-1 w-28">
              <Progress value={progressPercent} className="h-[2px] bg-secondary" />
              <span className="font-mono text-[9px] tracking-[0.1em] text-muted-foreground select-none">
                {completedTests}/{totalTests} TESTS
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────── */}
      <main className={`flex-1 container mx-auto px-6 py-8 flex flex-col ${contentWidth}`}>
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-border py-4">
        <div className="container mx-auto max-w-5xl px-6 text-center">
          <p className="font-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
            All processing local — no data transmitted — permissions on request only
          </p>
        </div>
      </footer>
    </div>
  );
}
