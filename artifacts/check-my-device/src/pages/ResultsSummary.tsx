import { useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

const testMeta: Record<string, { num: string; label: string; title: string }> = {
  keyboard:   { num: 'T-01', label: 'KEYBOARD',  title: 'Keyboard' },
  mouse:      { num: 'T-02', label: 'MOUSE',     title: 'Mouse & Trackpad' },
  camera:     { num: 'T-03', label: 'CAMERA',    title: 'Camera' },
  microphone: { num: 'T-04', label: 'MIC',       title: 'Microphone' },
  speaker:    { num: 'T-05', label: 'SPEAKER',   title: 'Speaker' },
  display:    { num: 'T-06', label: 'DISPLAY',   title: 'Display' },
  battery:    { num: 'T-07', label: 'BATTERY',   title: 'Battery' },
  network:    { num: 'T-08', label: 'NETWORK',   title: 'Network' },
  sensors:    { num: 'T-09', label: 'SENSORS',   title: 'Sensors' },
};

const STATUS_CONFIG = {
  working:     { label: 'PASS',     color: 'var(--color-status-pass)', ledColor: 'var(--color-status-pass)' },
  issue:       { label: 'FAIL',     color: 'var(--color-status-fail)', ledColor: 'var(--color-status-fail)' },
  unsupported: { label: 'N/A',      color: 'var(--color-status-idle)', ledColor: 'var(--color-status-idle)' },
  untested:    { label: 'UNTESTED', color: 'var(--color-status-idle)', ledColor: 'var(--color-status-idle)' },
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export function ResultsSummary() {
  const { results, resetAll } = useTestContext();

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(v => v === 'working').length;
  const failed = Object.values(results).filter(v => v === 'issue').length;
  const unsupported = Object.values(results).filter(v => v === 'unsupported').length;
  const untested = Object.values(results).filter(v => v === 'untested').length;
  const tested = total - untested;
  const score = tested > 0 ? Math.round((passed / (tested - unsupported || tested)) * 100) : 0;

  useEffect(() => {
    if (passed > 0 && failed === 0 && untested === 0) {
      const end = Date.now() + 3000;
      const frame = () => {
        confetti({ particleCount: 4, angle: 60,  spread: 55, origin: { x: 0 }, colors: ['#0F8B8D', '#2FA84F'] });
        confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#0F8B8D', '#2FA84F'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [passed, failed, untested]);

  // SVG ring
  const radius = 58;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (score / 100) * circ;

  const stats = [
    { key: 'PASS',      value: passed,      color: 'var(--color-status-pass)' },
    { key: 'FAIL',      value: failed,      color: 'var(--color-status-fail)' },
    { key: 'N/A',       value: unsupported, color: 'var(--color-status-idle)' },
    { key: 'UNTESTED',  value: untested,    color: 'var(--color-status-idle)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 max-w-4xl mx-auto w-full"
    >
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-start gap-3 pb-5 border-b border-border">
        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5 h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/dashboard"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase block mb-0.5">
            DIAGNOSTICS REPORT
          </span>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Results Summary
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generated {new Date().toLocaleString()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetAll}
          className="h-8 px-3 text-xs font-medium gap-1.5 shrink-0 mt-0.5"
        >
          <RefreshCw className="w-3 h-3" /> Reset All
        </Button>
      </div>

      {/* ── Score + Stats ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center p-6 rounded-lg border border-border bg-card">
        {/* SVG ring */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center" style={{ width: 128, height: 128 }}>
            <svg
              width="128" height="128"
              viewBox="0 0 128 128"
              className="-rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="64" cy="64" r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-border"
              />
              <circle
                cx="64" cy="64" r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circ}
                strokeDashoffset={dashOffset}
                className="text-primary transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-bold text-foreground leading-none">
                {score}
              </span>
              <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mt-0.5">
                SCORE
              </span>
            </div>
          </div>
        </div>

        {/* Stats readout strip */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {untested > 0
                ? `${untested} test${untested > 1 ? 's' : ''} still pending — run them for a complete report.`
                : failed > 0
                  ? `Issues detected in ${failed} component${failed > 1 ? 's' : ''}. Review each test for details.`
                  : 'All supported components passed successfully.'}
            </p>
          </div>

          {/* Stats as horizontal readout */}
          <div className="grid grid-cols-4 divide-x divide-border border border-border rounded-lg overflow-hidden">
            {stats.map(stat => (
              <div key={stat.key} className="flex flex-col items-center py-4 px-3 bg-background">
                <span
                  className="font-mono text-2xl font-bold leading-none"
                  style={{ color: stat.value > 0 ? stat.color : 'hsl(var(--muted-foreground))' }}
                >
                  {stat.value}
                </span>
                <span className="font-mono text-[9px] tracking-[0.15em] text-muted-foreground uppercase mt-1.5">
                  {stat.key}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Detailed results table ──────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border bg-secondary/40">
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase col-span-2">Module</span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase hidden sm:block">Status</span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">Action</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {Object.entries(results).map(([key, status]) => {
            const meta = testMeta[key];
            const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.untested;
            if (!meta) return null;
            return (
              <div
                key={key}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-secondary/30 transition-colors"
              >
                {/* LED + ID */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: cfg.ledColor }}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase hidden sm:block select-none">
                    {meta.num}
                  </span>
                </div>

                {/* Title */}
                <span
                  className="font-semibold text-sm text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {meta.title}
                </span>

                {/* Status label */}
                <span
                  className="font-mono text-[10px] tracking-[0.14em] uppercase font-medium hidden sm:block"
                  style={{ color: cfg.color }}
                >
                  {cfg.label}
                </span>

                {/* Review link */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs font-mono tracking-wider"
                  asChild
                >
                  <Link href={`/test/${key}`}>REVIEW</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
