import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Battery as BatteryIcon, BatteryCharging, BatteryWarning, Zap } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Card, CardContent } from '@/components/ui/card';
import { TestPageHeader } from '@/components/TestPageHeader';

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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col max-w-4xl mx-auto w-full min-h-[calc(100dvh-12rem)] justify-center">
      <TestPageHeader
        testId="T-07"
        title="Battery"
        description="Check battery health, level, and charging status."
        onMarkIssue={() => setResult('battery', 'issue')}
        onMarkWorking={() => setResult('battery', 'working')}
        showActions={supported !== false}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col justify-center shadow-none border-border/60 bg-card">
          <CardContent className="p-10 flex flex-col items-center justify-center gap-8">
            {supported === false ? (
              <div className="text-center flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary">
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
                  <div className="w-64">
                    <div className="relative h-40 rounded-t-xl border-[6px] border-foreground bg-background p-4 shadow-inner">
                      <span className="absolute top-2 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-foreground/20" aria-hidden="true" />
                      <div className="flex h-full items-end overflow-hidden rounded-md border border-border bg-secondary/60 p-2">
                        <div
                          className={`h-full rounded-sm transition-all duration-1000 ease-out flex items-center justify-center relative overflow-hidden ${
                            batteryState.charging ? 'bg-status-pass' :
                            batteryState.level > 0.2 ? 'bg-primary' : 'bg-status-warn'
                          }`}
                          style={{ width: `${Math.max(5, batteryState.level * 100)}%` }}
                        >
                          {batteryState.charging && (
                            <Zap className="w-7 h-7 text-white/80 absolute animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mx-auto h-3 w-[18rem] rounded-b-xl bg-foreground/90" aria-hidden="true" />
                    <div className="mx-auto h-1 w-16 rounded-b bg-foreground/40" aria-hidden="true" />
                  </div>

                <div className="text-center">
                  <div className="text-6xl font-black tracking-tight mb-2 font-mono">
                    {Math.round(batteryState.level * 100)}%
                  </div>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground font-semibold">
                    {batteryState.charging ? (
                      <><BatteryCharging className="w-5 h-5 text-status-pass" /> Plugged In</>
                    ) : (
                      <><BatteryIcon className="w-5 h-5" /> On Battery</>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-pulse flex flex-col items-center gap-4 py-16">
                <div className="h-40 w-64 rounded-t-xl bg-secondary" />
                <div className="h-3 w-72 rounded-b-xl bg-secondary" />
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
