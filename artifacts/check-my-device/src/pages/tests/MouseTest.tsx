import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, Check } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TestPageHeader } from '@/components/TestPageHeader';

interface MouseEventLog {
  id: string;
  type: string;
  timestamp: Date;
  details: string;
}

export function MouseTest() {
  const { results, setResult } = useTestContext();
  const [logs, setLogs] = useState<MouseEventLog[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [testsPassed, setTestsPassed] = useState({
    leftClick: false,
    rightClick: false,
    middleClick: false,
    scroll: false,
    movement: false
  });

  const addLog = (type: string, details: string) => {
    setLogs(prev => {
      const newLog = { id: Math.random().toString(36).slice(2), type, timestamp: new Date(), details };
      return [newLog, ...prev].slice(0, 10);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let points: { x: number, y: number, alpha: number }[] = [];
    let animationFrameId: number;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        ctx.fillStyle = `hsl(${primary} / ${p.alpha})`;
        ctx.fill();
        p.alpha -= 0.02; // fade out
      }
      
      points = points.filter(p => p.alpha > 0);
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      points.push({ x, y, alpha: 1 });
      setTestsPassed(p => ({ ...p, movement: true }));
    };

    const handleMouseDown = (e: MouseEvent) => {
      const buttons = ['Left', 'Middle', 'Right'];
      const btn = buttons[e.button] || 'Unknown';
      addLog(`${btn} Click`, `Button: ${e.button}`);
      
      setTestsPassed(p => ({
        ...p,
        leftClick: p.leftClick || e.button === 0,
        middleClick: p.middleClick || e.button === 1,
        rightClick: p.rightClick || e.button === 2,
      }));
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleWheel = (e: WheelEvent) => {
      addLog('Scroll', `Delta Y: ${e.deltaY.toFixed(0)}`);
      setTestsPassed(p => ({ ...p, scroll: true }));
      e.preventDefault(); // prevent page scroll in the test area
    };

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
    if (testsPassed.leftClick && testsPassed.scroll && testsPassed.movement) {
      if (results.mouse !== 'working') {
        setResult('mouse', 'working');
      }
    }
  }, [testsPassed, results.mouse, setResult]);

  const handleMarkWorking = () => setResult('mouse', 'working');
  const handleMarkIssue = () => setResult('mouse', 'issue');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="test-page mx-auto flex w-full max-w-5xl flex-col">
      <TestPageHeader
        testId="T-02"
        title="Mouse & Trackpad"
        description="Move, click, and scroll inside the test area."
        onMarkIssue={handleMarkIssue}
        onMarkWorking={handleMarkWorking}
      />

      <div className="grid min-h-[520px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="relative flex min-h-[420px] flex-col overflow-hidden instrument-panel">
          <div className="absolute left-5 top-5 z-10 rounded-lg border border-border/70 bg-card/85 px-3 py-2 shadow-sm backdrop-blur-md pointer-events-none">
            <h3 className="panel-label">Interactive Area</h3>
          </div>
          <canvas 
            ref={canvasRef} 
            className="flex-1 w-full cursor-crosshair touch-none bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_58%)]"
          />
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="instrument-panel">
            <CardContent className="p-5 flex flex-col gap-3">
              <h3 className="panel-label mb-2">Detected Actions</h3>
              
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Movement</span>
                {testsPassed.movement ? <Check className="w-4 h-4 text-status-pass" /> : <div className="w-4 h-4 rounded-full border border-border" />}
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Left Click</span>
                {testsPassed.leftClick ? <Check className="w-4 h-4 text-status-pass" /> : <div className="w-4 h-4 rounded-full border border-border" />}
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Right Click</span>
                {testsPassed.rightClick ? <Check className="w-4 h-4 text-status-pass" /> : <div className="w-4 h-4 rounded-full border border-border" />}
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Middle Click</span>
                {testsPassed.middleClick ? <Check className="w-4 h-4 text-status-pass" /> : <div className="w-4 h-4 rounded-full border border-border" />}
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Scroll</span>
                {testsPassed.scroll ? <Check className="w-4 h-4 text-status-pass" /> : <div className="w-4 h-4 rounded-full border border-border" />}
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 overflow-hidden flex flex-col instrument-panel">
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="p-5 pb-3">
                <h3 className="panel-label">Event Log</h3>
              </div>
              <div className="live-readout m-2 flex flex-1 flex-col gap-1 overflow-y-auto p-4 font-mono text-xs text-primary">
                {logs.length === 0 && <span className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground"><Activity className="h-5 w-5 text-primary/55" /> Waiting for events</span>}
                {logs.map((log) => (
                  <div key={log.id} className="animate-in fade-in slide-in-from-left-2 py-1">
                    <span className="opacity-50 mr-3">[{log.timestamp.toISOString().substring(11, 23)}]</span>
                    <span className="mr-2 font-semibold text-foreground">{log.type}</span>
                    <span className="opacity-80">{log.details}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
