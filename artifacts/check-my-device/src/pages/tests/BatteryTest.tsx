import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Battery as BatteryIcon, BatteryCharging, BatteryWarning, Zap } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function BatteryTest() {
  const { results, setResult } = useTestContext();
  const [batteryState, setBatteryState] = useState<any>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let battery: any;

    const updateBatteryInfo = () => {
      if (battery) {
        setBatteryState({
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        });
      }
    };

    if ('getBattery' in navigator) {
      setSupported(true);
      (navigator as any).getBattery().then((b: any) => {
        battery = b;
        updateBatteryInfo();

        b.addEventListener('levelchange', updateBatteryInfo);
        b.addEventListener('chargingchange', updateBatteryInfo);
        b.addEventListener('chargingtimechange', updateBatteryInfo);
        b.addEventListener('dischargingtimechange', updateBatteryInfo);
        
        setResult('battery', 'working');
      });
    } else {
      setSupported(false);
      setResult('battery', 'unsupported');
    }

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', updateBatteryInfo);
        battery.removeEventListener('chargingchange', updateBatteryInfo);
        battery.removeEventListener('chargingtimechange', updateBatteryInfo);
        battery.removeEventListener('dischargingtimechange', updateBatteryInfo);
      }
    };
  }, [setResult]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return 'Calculating...';
    if (seconds === 0) return '0 minutes';
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours} hr ${mins} min`;
    return `${mins} min`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 pb-6 border-b border-border/50 mb-6">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Battery</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Check battery health, level, and charging status.</p>
        </div>
        <div className="flex gap-3">
          {supported !== false && (
            <>
              <Button variant="outline" size="sm" className="text-amber-600 border-amber-600/20 hover:bg-amber-600/10 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 font-semibold" onClick={() => setResult('battery', 'issue')}>
                Mark Issue
              </Button>
              <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => setResult('battery', 'working')}>
                Mark Working
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col justify-center shadow-none border-border/60 bg-card">
          <CardContent className="p-10 flex flex-col items-center justify-center gap-8">
            {supported === false ? (
              <div className="text-center flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center text-muted-foreground">
                  <BatteryWarning className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Not Supported</h3>
                  <p className="text-muted-foreground font-medium max-w-xs text-sm mx-auto">
                    The Battery Status API is not supported on this browser or device (e.g. Firefox, Safari, iOS).
                  </p>
                </div>
              </div>
            ) : batteryState ? (
              <>
                <div className="relative">
                  <div className="w-36 h-72 border-8 border-foreground rounded-[2rem] p-2.5 relative flex flex-col justify-end overflow-hidden shadow-inner bg-background">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-5 bg-foreground rounded-t-xl" />
                    
                    <div 
                      className={`w-full rounded-[1.2rem] transition-all duration-1000 ease-out flex items-center justify-center relative overflow-hidden ${
                        batteryState.charging ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 
                        batteryState.level > 0.2 ? 'bg-primary shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-destructive'
                      }`}
                      style={{ height: `${Math.max(5, batteryState.level * 100)}%` }}
                    >
                      {batteryState.charging && (
                        <Zap className="w-14 h-14 text-white/60 absolute animate-pulse drop-shadow-md" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-6xl font-black tracking-tight mb-2 font-mono">
                    {Math.round(batteryState.level * 100)}%
                  </div>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground font-semibold">
                    {batteryState.charging ? (
                      <><BatteryCharging className="w-5 h-5 text-emerald-500" /> Plugged In</>
                    ) : (
                      <><BatteryIcon className="w-5 h-5" /> On Battery</>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-pulse flex flex-col items-center gap-4 py-16">
                <div className="w-36 h-72 bg-secondary rounded-[2rem]" />
                <div className="h-12 w-32 bg-secondary rounded-xl" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="shadow-none border-border/60">
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-5">Diagnostics</h3>
              {batteryState ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Current Level</span>
                    <span className="font-bold text-lg">{Math.round(batteryState.level * 100)}%</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Power Source</span>
                    <span className="font-bold text-lg">{batteryState.charging ? 'AC Power' : 'Battery'}</span>
                  </div>
                  
                  {batteryState.charging && (
                    <div className="flex justify-between items-center pb-4 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">Time until full</span>
                      <span className="font-bold text-lg">{formatTime(batteryState.chargingTime)}</span>
                    </div>
                  )}
                  
                  {!batteryState.charging && (
                    <div className="flex justify-between items-center pb-4 border-b border-border/50">
                      <span className="text-muted-foreground font-medium">Time remaining</span>
                      <span className="font-bold text-lg">{formatTime(batteryState.dischargingTime)}</span>
                    </div>
                  )}
                  
                  <div className="mt-6 text-sm font-semibold text-primary bg-primary/10 p-4 rounded-xl border border-primary/20">
                    Unplug or plug in your device to see the status update in real-time.
                  </div>
                </div>
              ) : supported === false ? (
                <p className="text-sm font-medium text-muted-foreground">
                  Diagnostic data unavailable.
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">Loading...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
