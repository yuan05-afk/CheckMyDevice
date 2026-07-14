import { ArrowLeft, Check, TriangleAlert } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

type TestPageHeaderProps = {
  testId: string;
  title: string;
  description: string;
  onMarkIssue: () => void;
  onMarkWorking: () => void;
  showActions?: boolean;
};

export function TestPageHeader({
  testId,
  title,
  description,
  onMarkIssue,
  onMarkWorking,
  showActions = true,
}: TestPageHeaderProps) {
  return (
    <header className="relative mb-7 overflow-hidden rounded-xl border border-border/80 bg-card/75 px-5 py-5 shadow-sm backdrop-blur-sm sm:px-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            className="mt-0.5 h-9 w-9 shrink-0 border-border/80 bg-background/70 text-muted-foreground shadow-sm hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            asChild
          >
            <Link href="/dashboard" aria-label="Back to diagnostics">
              <ArrowLeft className="h-4 w-4 shrink-0" />
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="spec-item text-primary">{testId}</span>
              <span className="h-1 w-1 rounded-full bg-primary/50" />
              <span className="spec-item">Diagnostic module</span>
            </div>
            <h1
              className="text-2xl font-bold tracking-[-0.035em] text-foreground sm:text-[1.75rem]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>

        {showActions && (
          <div className="flex shrink-0 gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-2 border-status-warn/35 bg-background/60 px-4 font-semibold text-status-warn shadow-sm hover:bg-status-warn/10 hover:text-status-warn"
              onClick={onMarkIssue}
            >
              <TriangleAlert className="h-4 w-4 shrink-0" />
              Mark Issue
            </Button>
            <Button
              size="sm"
              className="h-10 gap-2 bg-status-pass px-4 font-semibold text-white shadow-sm hover:bg-status-pass/90"
              onClick={onMarkWorking}
            >
              <Check className="h-4 w-4 shrink-0" />
              Mark Working
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
