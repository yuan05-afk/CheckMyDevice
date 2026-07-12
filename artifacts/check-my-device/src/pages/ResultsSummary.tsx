import { useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, HelpCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import confetti from 'canvas-confetti';

const testNames = {
  keyboard: 'Keyboard',
  mouse: 'Mouse & Trackpad',
  camera: 'Camera',
  microphone: 'Microphone',
  speaker: 'Speaker',
  display: 'Display',
  battery: 'Battery',
  network: 'Network',
  sensors: 'Sensors',
};

export function ResultsSummary() {
  const { results, resetAll } = useTestContext();

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(v => v === 'working').length;
  const failed = Object.values(results).filter(v => v === 'issue').length;
  const unsupported = Object.values(results).filter(v => v === 'unsupported').length;
  const untested = Object.values(results).filter(v => v === 'untested').length;

  const score = Math.round((passed / (total - unsupported - untested || 1)) * 100) || 0;
  
  useEffect(() => {
    if (passed > 0 && failed === 0 && untested === 0) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#4F46E5', '#10b981']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#4F46E5', '#10b981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [passed, failed, untested]);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'working': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'issue': return <XCircle className="w-5 h-5 text-amber-500" />;
      case 'unsupported': return <AlertCircle className="w-5 h-5 text-slate-400" />;
      default: return <HelpCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'working': return <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm uppercase tracking-wide">Passed</span>;
      case 'issue': return <span className="text-amber-600 dark:text-amber-500 font-semibold text-sm uppercase tracking-wide">Issue</span>;
      case 'unsupported': return <span className="text-slate-500 font-semibold text-sm uppercase tracking-wide">Unsupported</span>;
      default: return <span className="text-muted-foreground font-semibold text-sm uppercase tracking-wide">Untested</span>;
    }
  };

  // SVG Progress Ring calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between border-b border-border/50 pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Diagnostics Report</h1>
            <p className="text-muted-foreground font-medium text-sm mt-1">Generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetAll} className="gap-2 font-semibold hidden sm:flex">
          <RefreshCw className="w-4 h-4" /> Reset All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="sm:col-span-2 md:col-span-4 bg-card overflow-hidden">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2">Device Health Score</h2>
              <p className="text-muted-foreground font-medium max-w-md">
                {untested > 0 
                  ? `You have ${untested} tests remaining to complete a full diagnostic.`
                  : failed > 0 
                    ? `Issues detected in ${failed} component(s).`
                    : `All supported components passed successfully.`}
              </p>
            </div>
            
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
                <circle 
                  cx="72" cy="72" r={radius} 
                  stroke="currentColor" 
                  strokeWidth="10" 
                  fill="transparent" 
                  className="text-muted opacity-20"
                />
                <circle 
                  cx="72" cy="72" r={radius} 
                  stroke="currentColor" 
                  strokeWidth="10" 
                  fill="transparent" 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="text-primary transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-black">{score}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-black text-foreground mb-1">{passed}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Passed</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-black text-foreground mb-1">{failed}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Failed</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-black text-foreground mb-1">{unsupported}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unsupported</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-muted-foreground/30">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-black text-foreground mb-1">{untested}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Untested</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-lg font-bold">Detailed Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {Object.entries(results).map(([key, status]) => (
              <div key={key} className="p-4 sm:px-6 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-4">
                  <StatusIcon status={status} />
                  <span className="font-semibold">{testNames[key as keyof typeof testNames]}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden sm:block">
                    {getStatusText(status)}
                  </div>
                  <Button variant="secondary" size="sm" className="gap-1 font-semibold" asChild>
                    <Link href={`/test/${key}`}>
                      Review <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
