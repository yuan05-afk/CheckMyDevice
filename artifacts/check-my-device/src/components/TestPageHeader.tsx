import { ArrowLeft } from 'lucide-react';
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
    <header className="flex flex-col gap-4 pb-6 mb-6 border-b border-border/50 sm:flex-row sm:items-center">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link href="/dashboard" aria-label="Back to diagnostics">
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </Button>

      <div className="flex-1">
        <span className="spec-item block mb-1">{testId}</span>
        <h1
          className="text-2xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h1>
        <p className="mt-0.5 text-sm font-medium text-muted-foreground">
          {description}
        </p>
      </div>

      {showActions && (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="border-status-warn/40 text-status-warn hover:bg-status-warn/10 hover:text-status-warn font-semibold"
            onClick={onMarkIssue}
          >
            Mark Issue
          </Button>
          <Button
            size="sm"
            className="bg-status-pass text-white hover:bg-status-pass/90 font-semibold"
            onClick={onMarkWorking}
          >
            Mark Working
          </Button>
        </div>
      )}
    </header>
  );
}
