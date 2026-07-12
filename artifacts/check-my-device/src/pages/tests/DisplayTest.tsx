import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Maximize2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const testPatterns = [
  { id: 'red', name: 'Red', bg: '#FF0000', textColor: '#ffffff' },
  { id: 'green', name: 'Green', bg: '#00C040', textColor: '#ffffff' },
  { id: 'blue', name: 'Blue', bg: '#0050FF', textColor: '#ffffff' },
  { id: 'white', name: 'White', bg: '#FFFFFF', textColor: '#000000' },
  { id: 'black', name: 'Black', bg: '#000000', textColor: '#ffffff' },
  {
    id: 'gradient',
    name: 'Gradient',
    bg: 'linear-gradient(to right, #000000, #ffffff)',
    textColor: '#888',
    isGradient: true,
  },
  {
    id: 'grid',
    name: 'Sharpness',
    bg: '#ffffff',
    textColor: '#000000',
    isPattern: true,
    patternStyle: {
      backgroundImage:
        'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
      backgroundSize: '20px 20px',
      backgroundColor: '#ffffff',
    },
  },
  {
    id: 'checker',
    name: 'Checkerboard',
    bg: '#ffffff',
    textColor: '#000000',
    isPattern: true,
    patternStyle: {
      backgroundImage:
        'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)',
      backgroundPosition: '0 0, 10px 10px',
      backgroundSize: '20px 20px',
    },
  },
];

export function DisplayTest() {
  const { results, setResult } = useTestContext();
  const [activePatternId, setActivePatternId] = useState<string | null>(null);

  const activePattern = testPatterns.find((p) => p.id === activePatternId) ?? null;

  const enterFullscreen = async (pattern: (typeof testPatterns)[0]) => {
    setActivePatternId(pattern.id);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      }
    } catch {
    }
  };

  const exitFullscreen = async () => {
    setActivePatternId(null);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitFullscreenElement && (document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch {
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        setActivePatternId(null);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const handleMarkWorking = () => setResult('display', 'working');
  const handleMarkIssue = () => setResult('display', 'issue');

  return (
    <>
      <AnimatePresence>
        {activePattern && (
          <motion.div
            key="fs-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col"
            style={
              activePattern.isPattern
                ? activePattern.patternStyle
                : activePattern.isGradient
                  ? { background: activePattern.bg }
                  : { backgroundColor: activePattern.bg }
            }
            onClick={exitFullscreen}
          >
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-semibold pointer-events-none select-none border border-white/20 shadow-lg"
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#fff',
                backdropFilter: 'blur(12px)',
              }}
            >
              Click anywhere or press Escape to exit
            </div>

            <button
              className="absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center focus:outline-none border border-white/20 shadow-lg hover:scale-105 transition-transform"
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#fff',
                backdropFilter: 'blur(12px)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                exitFullscreen();
              }}
            >
              <X className="w-6 h-6" />
            </button>

            <div
              className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold border border-white/20 shadow-lg hover:scale-105 transition-transform"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', backdropFilter: 'blur(12px)' }}
                onClick={() => { handleMarkWorking(); exitFullscreen(); }}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Looks good
              </button>
              <button
                className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold border border-white/20 shadow-lg hover:scale-105 transition-transform"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', backdropFilter: 'blur(12px)' }}
                onClick={() => { handleMarkIssue(); exitFullscreen(); }}
              >
                <AlertTriangle className="w-5 h-5 text-amber-400" /> Issue found
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 pb-6 border-b border-border/50 mb-6">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Display & Color</h1>
            <p className="text-sm text-muted-foreground mt-0.5 font-medium">Check for dead pixels, color accuracy, and sharpness.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="text-amber-600 border-amber-600/20 hover:bg-amber-600/10 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 font-semibold" onClick={handleMarkIssue}>
              Mark Issue
            </Button>
            <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={handleMarkWorking}>
              Mark Working
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-none border-border/60">
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-5">Test Patterns</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {testPatterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => enterFullscreen(pattern)}
                    className="group flex flex-col gap-3 focus:outline-none focus-visible:ring-2 ring-primary rounded-xl"
                  >
                    <div
                      className="w-full aspect-square rounded-xl border border-border/50 shadow-sm flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-md overflow-hidden relative"
                      style={
                        pattern.isPattern
                          ? pattern.patternStyle
                          : pattern.isGradient
                            ? { background: pattern.bg }
                            : { backgroundColor: pattern.bg }
                      }
                    >
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <div className="opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 bg-black/50 text-white p-2.5 rounded-full backdrop-blur-md relative z-10">
                        <Maximize2 className="w-5 h-5" />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-center w-full">{pattern.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="shadow-none border-border/60">
              <CardContent className="p-6 flex flex-col gap-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Instructions</h3>
                <ul className="text-sm font-medium text-muted-foreground space-y-3 list-disc pl-4">
                  <li>Click any pattern to view it fullscreen.</li>
                  <li><strong>Solid Colors:</strong> Look for pixels that don't change color (dead or stuck).</li>
                  <li><strong>Gradient:</strong> Look for banding — distinct stripes instead of a smooth blend.</li>
                  <li><strong>Sharpness:</strong> Tests rendering artifacts and backlight bleed.</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-none border-border/60">
              <CardContent className="p-6 flex flex-col gap-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Result</h3>
                <div className="text-sm">
                  {results.display === 'working' && <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-md">Marked as working</span>}
                  {results.display === 'issue' && <span className="text-amber-600 dark:text-amber-500 font-bold bg-amber-500/10 px-3 py-1.5 rounded-md">Issue recorded</span>}
                  {results.display === 'untested' && <span className="text-muted-foreground font-semibold bg-secondary px-3 py-1.5 rounded-md">Not yet tested</span>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </>
  );
}
