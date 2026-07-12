import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TestPageHeader } from '@/components/TestPageHeader';

// Standard QWERTY layout
const keyRows = [
  ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
  ['Control', 'Alt', 'Meta', ' ', 'Meta', 'Alt', 'Control']
];

const keyLabels: Record<string, string> = {
  Escape: 'Esc',
  Backspace: 'Backspace',
  Tab: 'Tab',
  CapsLock: 'Caps',
  Enter: 'Enter',
  Shift: 'Shift',
  Control: 'Ctrl',
  Alt: 'Alt',
  Meta: 'Cmd',
  ' ': 'Space',
};

const getTotalKeysToTest = () => {
  let count = 0;
  keyRows.forEach(row => count += row.length);
  return count;
};

export function KeyboardTest() {
  const { results, setResult } = useTestContext();
  const [testedKeys, setTestedKeys] = useState<Set<string>>(new Set());
  const [lastEvent, setLastEvent] = useState<{ key: string, code: string } | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault(); // Prevent default browser actions for shortcuts
    const key = e.key;
    const code = e.code;
    
    setLastEvent({ key, code });
    
    // Normalize key for matching our layout, simple approach
    let matchKey = key;
    if (key.length === 1) matchKey = key.toLowerCase();
    if (code === 'Space') matchKey = ' ';
    
    setTestedKeys(prev => {
      const next = new Set(prev);
      next.add(matchKey);
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const totalKeys = getTotalKeysToTest();
  
  const handleMarkWorking = () => setResult('keyboard', 'working');
  const handleMarkIssue = () => setResult('keyboard', 'issue');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col max-w-4xl mx-auto w-full">
      <TestPageHeader
        testId="T-01"
        title="Keyboard"
        description="Press keys on your keyboard to test them."
        onMarkIssue={handleMarkIssue}
        onMarkWorking={handleMarkWorking}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-none border-border/60">
          <CardContent className="p-6 bg-card/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Interactive Layout</h3>
              <span className="font-mono text-xs bg-secondary px-2.5 py-1 rounded-md font-semibold text-foreground">
                {testedKeys.size} / {totalKeys}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {keyRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1.5 w-full">
                  {row.map((key, keyIndex) => {
                    const isTested = testedKeys.has(key) || (key.length === 1 && testedKeys.has(key.toLowerCase()));
                    const label = keyLabels[key] || key;
                    let widthClass = "w-10 sm:w-12"; 
                    
                    if (key === 'Backspace' || key === 'Tab' || key === 'CapsLock' || key === 'Enter' || key === 'Shift') {
                      widthClass = "w-16 sm:w-20";
                    }
                    if (key === ' ') {
                      widthClass = "w-48 sm:w-64";
                    }

                    return (
                      <div
                        key={`${rowIndex}-${keyIndex}`}
                        className={`h-10 sm:h-12 flex items-center justify-center rounded-lg border text-xs sm:text-sm font-semibold transition-all duration-200
                          ${widthClass}
                          ${isTested ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(79,70,229,0.3)]' : 'bg-secondary text-secondary-foreground border-border/50'}`}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-center items-center flex-col gap-2">
               <p className="text-xs font-medium text-muted-foreground text-center max-w-sm">
                 Don't worry if you can't test every key (e.g. F-keys hijacked by browser). If the main keys work, you can mark it as Working.
               </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="shadow-none border-border/60">
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Live Output</h3>
              <div className="bg-[#0D0D0D] text-emerald-400 font-mono text-sm p-4 rounded-xl h-32 flex flex-col justify-end gap-1.5 shadow-inner border border-white/5">
                {lastEvent ? (
                  <>
                    <div className="flex justify-between">
                      <span className="opacity-50">Key</span>
                      <span className="text-white font-bold">{lastEvent.key}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-50">Code</span>
                      <span className="text-white font-bold">{lastEvent.code}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-emerald-400/40 italic flex items-center justify-center h-full">Waiting for input...</div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-none border-border/60">
            <CardContent className="p-6 flex flex-col gap-4">
               <div className="flex justify-between items-center">
                 <span className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Status</span>
                 {results.keyboard === 'working' ? (
                    <span className="text-sm font-bold text-status-pass">Working</span>
                 ) : results.keyboard === 'issue' ? (
                    <span className="text-sm font-bold text-status-warn">Issue</span>
                 ) : (
                   <span className="text-sm font-bold text-muted-foreground">Untested</span>
                 )}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
