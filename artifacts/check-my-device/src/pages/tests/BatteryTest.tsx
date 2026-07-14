import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Battery as BatteryIcon, BatteryCharging, BatteryWarning, Clock3, PlugZap, Zap } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Card, CardContent } from '@/components/ui/card';
import { TestPageHeader } from '@/components/TestPageHeader';
import { MetricTile, PanelHeading, TestStatusBadge, WaitingReadout } from '@/components/DiagnosticPrimitives';

type BatteryState = { level: number; charging: boolean; chargingTime: number; dischargingTime: number };
type BatteryManagerLike = BatteryState & { addEventListener: (name: string, listener: () => void) => void; removeEventListener: (name: string, listener: () => void) => void };

export function BatteryTest() {
  const { results, setResult } = useTestContext();
  const [batteryState, setBatteryState] = useState<BatteryState | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let battery: BatteryManagerLike | undefined;
    const updateBatteryInfo = () => {
      if (battery) setBatteryState({ level: battery.level, charging: battery.charging, chargingTime: battery.chargingTime, dischargingTime: battery.dischargingTime });
    };
    const navigatorWithBattery = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (navigatorWithBattery.getBattery) {
      setSupported(true);
      navigatorWithBattery.getBattery().then((manager) => {
        battery = manager;
        updateBatteryInfo();
        ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach((event) => manager.addEventListener(event, updateBatteryInfo));
        setResult('battery', 'working');
      });
    } else {
      setSupported(false);
      setResult('battery', 'unsupported');
    }
    return () => { if (battery) ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach((event) => battery?.removeEventListener(event, updateBatteryInfo)); };
  }, [setResult]);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return 'Calculating';
    if (seconds === 0) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  };

  const percent = batteryState ? Math.round(batteryState.level * 100) : 0;
  const estimate = batteryState ? formatTime(batteryState.charging ? batteryState.chargingTime : batteryState.dischargingTime) : '—';
  const levelColor = percent <= 20 ? 'bg-status-warn' : batteryState?.charging ? 'bg-status-pass' : 'bg-primary';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="test-page mx-auto flex w-full max-w-[90rem] flex-col">
      <TestPageHeader testId="T-07" title="Battery" description="Monitor charge level, power source, and remaining time in real time." onMarkIssue={() => setResult('battery', 'issue')} onMarkWorking={() => setResult('battery', 'working')} showActions={supported !== false} />

      <div className="flex flex-col gap-5">
        <Card className="order-2 instrument-panel">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading label="Live power" description="Readings update automatically when charging state changes." className="mb-5" />
            <div className="live-readout relative flex min-h-[340px] items-center justify-center overflow-hidden p-6">
              {supported === false ? (
                <div className="relative z-10 flex max-w-md flex-col items-center gap-5 text-center">
                  <div className="test-hero-icon border-status-idle/25 bg-status-idle/10 text-status-idle"><BatteryWarning className="h-8 w-8" /></div>
                  <div><h3 className="font-display text-lg font-bold">Battery API unavailable</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">This browser does not expose live battery data. Other diagnostics remain available.</p></div>
                </div>
              ) : batteryState ? (
                <div className="relative z-10 w-full max-w-xl">
                  <div className="flex flex-col items-center text-center">
                    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${batteryState.charging ? 'bg-status-pass/12 text-status-pass' : 'bg-primary/10 text-primary'}`}>{batteryState.charging ? <BatteryCharging className="h-8 w-8" /> : <BatteryIcon className="h-8 w-8" />}</div>
                    <span className="spec-item">Current charge</span>
                    <div className="readout-value mt-2 text-7xl tracking-[-0.07em]">{percent}<span className="ml-1 text-2xl text-muted-foreground">%</span></div>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">{batteryState.charging ? <><PlugZap className="h-4 w-4 text-status-pass" /> Connected to AC power</> : <><BatteryIcon className="h-4 w-4" /> Running on battery</>}</p>
                  </div>
                  <div className="mt-8 rounded-xl border border-border/80 bg-card/70 p-3 shadow-sm">
                    <div className="relative h-12 overflow-hidden rounded-md bg-secondary"><div className={`h-full rounded-md transition-[width] duration-700 ${levelColor}`} style={{ width: `${Math.max(3, percent)}%` }} />{batteryState.charging && <Zap className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-white" />}</div>
                  </div>
                </div>
              ) : <WaitingReadout title="Reading battery" detail="Waiting for browser telemetry" />}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MetricTile label="Level" value={batteryState ? `${percent}%` : '—'} accent={Boolean(batteryState)} />
              <MetricTile label="Source" value={batteryState ? batteryState.charging ? 'AC' : 'Battery' : '—'} />
              <MetricTile label="Estimate" value={estimate} />
            </div>
          </CardContent>
        </Card>

        <div className="order-1 grid items-start gap-4 md:grid-cols-3">
          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Power telemetry" description="Live browser readings" className="mb-5" />
              {batteryState ? (
                <div className="grid grid-cols-2 gap-3">
                  <MetricTile label="Charge" value={`${percent}%`} accent />
                  <MetricTile label="State" value={batteryState.charging ? 'Charging' : 'Draining'} />
                  <MetricTile label={batteryState.charging ? 'Until full' : 'Remaining'} value={estimate} />
                  <MetricTile label="API" value="Active" detail="Live updates" />
                </div>
              ) : <div className="live-readout flex min-h-32 items-center justify-center p-4"><WaitingReadout title={supported === false ? 'Unsupported' : 'Loading'} detail={supported === false ? 'No battery telemetry' : 'Fetching power state'} /></div>}
            </CardContent>
          </Card>

          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Power event" className="mb-4" />
              <div className="flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/6 p-4"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-xs leading-relaxed text-muted-foreground">Plug in or unplug the device to verify that source and time estimates update instantly.</p></div>
            </CardContent>
          </Card>

          <Card className="instrument-panel"><CardContent className="flex items-center justify-between p-5"><span className="panel-label">Result</span><TestStatusBadge status={results.battery} /></CardContent></Card>
        </div>
      </div>
    </motion.div>
  );
}