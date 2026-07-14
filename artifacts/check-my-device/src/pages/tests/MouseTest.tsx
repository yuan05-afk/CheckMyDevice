import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Check, MousePointer2 } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Card, CardContent } from '@/components/ui/card';
import { TestPageHeader } from '@/components/TestPageHeader';
import { MetricTile, PanelHeading, TestStatusBadge } from '@/components/DiagnosticPrimitives';

interface MouseEventLog {
  id: string;
  type: string;
  timestamp: Date;
  details: string;
}

const actionLabels = [
  ['movement', 'Movement'],
  ['leftClick', 'Left click'],
  ['rightClick', 'Right click'],
  ['middleClick', 'Middle click'],
  ['scroll', 'Scroll'],
] as const;

export function MouseTest() {
  const { results, setResult } = useTestContext();
  const [logs, setLogs] = useState<MouseEventLog[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [testsPassed, setTestsPassed] = useState({
    leftClick: false,
    rightClick: false,
    middleClick: false,
    scroll: false,
    movement: false,
  });

  const addLog = (type: string, details: string) => {
    setLogs((previous) => {
      const newLog = { id: Math.random().toString(36).slice(2), type, timestamp: new Date(), details };
      return [newLog, ...previous].slice(0, 10);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let points: { x: number; y: number; alpha: number }[] = [];
    let animationFrameId: number;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      points.forEach((point) => {
        context.beginPath();
        context.arc(point.x, point.y, 4, 0, Math.PI * 2);
        context.fillStyle = `hsl(${primary} / ${point.alpha})`;
        context.fill();
        point.alpha -= 0.02;
      });
      points = points.filter((point) => point.alpha > 0);
      animationFrameId = requestAnimationFrame(render);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      points.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, alpha: 1 });
      setTestsPassed((previous) => ({ ...previous, movement: true }));
    };

    const handleMouseDown = (event: MouseEvent) => {
      const buttons = ['Left', 'Middle', 'Right'];
      const button = buttons[event.button] || 'Unknown';
      addLog(`${button} click`, `Button ${event.button}`);
      setTestsPassed((previous) => ({
        ...previous,
        leftClick: previous.leftClick || event.button === 0,
        middleClick: previous.middleClick || event.button === 1,
        rightClick: previous.rightClick || event.button === 2,
      }));
    };

    const handleWheel = (event: WheelEvent) => {
      addLog('Scroll', `Delta Y ${event.deltaY.toFixed(0)}`);
      setTestsPassed((previous) => ({ ...previous, scroll: true }));
      event.preventDefault();
    };

    const handleContextMenu = (event: MouseEvent) => event.preventDefault();
    resizeCanvas();
    render();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (testsPassed.leftClick && testsPassed.scroll && testsPassed.movement && results.mouse !== 'working') {
      setResult('mouse', 'working');
    }
  }, [testsPassed, results.mouse, setResult]);

  const verifiedCount = Object.values(testsPassed).filter(Boolean).length;
  const latestEvent = logs[0];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="test-page mx-auto flex w-full max-w-[90rem] flex-col">
      <TestPageHeader
        testId="T-02"
        title="Mouse & Trackpad"
        description="Move, click, and scroll inside the test area. Every detected action stays recorded."
        onMarkIssue={() => setResult('mouse', 'issue')}
        onMarkWorking={() => setResult('mouse', 'working')}
      />

      <div className="mb-5 grid items-start gap-4 md:grid-cols-3">
        <Card className="instrument-panel">
          <CardContent className="p-5">
            <PanelHeading label="Detected actions" description={`${verifiedCount} of ${actionLabels.length} inputs verified`} className="mb-4" />
            <div className="grid grid-cols-2 gap-2">
              {actionLabels.map(([key, label]) => (
                <div key={key} className="metric-tile flex items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold">
                  <span>{label}</span>
                  {testsPassed[key] ? <Check className="h-4 w-4 shrink-0 text-status-pass" /> : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="instrument-panel">
          <CardContent className="p-5">
            <PanelHeading label="Recent input" description="Latest captured browser event" className="mb-4" />
            <div className="live-readout flex min-h-32 items-center p-4">
              {latestEvent ? (
                <div className="relative z-10 min-w-0">
                  <span className="spec-item">{latestEvent.timestamp.toLocaleTimeString()}</span>
                  <p className="readout-value mt-2 truncate text-2xl text-primary">{latestEvent.type}</p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">{latestEvent.details}</p>
                </div>
              ) : (
                <div className="relative z-10 flex items-center gap-3 text-sm text-muted-foreground"><Activity className="h-5 w-5 text-primary" /> Waiting for a click or scroll</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="instrument-panel">
          <CardContent className="p-5">
            <div className="flex items-center justify-between"><span className="panel-label">Result</span><TestStatusBadge status={results.mouse} /></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricTile label="Verified" value={verifiedCount} accent={verifiedCount > 0} />
              <MetricTile label="Remaining" value={actionLabels.length - verifiedCount} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="instrument-panel overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
            <div><h2 className="panel-label">Interactive surface</h2><p className="mt-2 text-sm text-muted-foreground">Move across the surface, click each button, and scroll in either direction.</p></div>
            <div className="hidden items-center gap-2 rounded-md border border-primary/15 bg-primary/6 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-primary sm:flex"><MousePointer2 className="h-4 w-4" /> Input active</div>
          </div>
          <div className="relative h-[clamp(26rem,52vh,38rem)] min-h-[420px]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center text-muted-foreground/70">
              <MousePointer2 className="h-7 w-7 text-primary/55" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Test mouse or trackpad here</span>
            </div>
            <canvas ref={canvasRef} className="h-full w-full cursor-crosshair touch-none bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_58%)]" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
