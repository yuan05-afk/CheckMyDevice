import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Gauge, Globe2, Radio, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TestPageHeader } from '@/components/TestPageHeader';
import { MetricTile, PanelHeading, TestStatusBadge } from '@/components/DiagnosticPrimitives';

type ConnectionInfo = { type?: string; effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
type NetworkConnectionLike = ConnectionInfo & { addEventListener: (name: string, listener: () => void) => void; removeEventListener: (name: string, listener: () => void) => void };

export function NetworkTest() {
  const { results, setResult } = useTestContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [speedTest, setSpeedTest] = useState<{ status: 'idle' | 'running' | 'done' | 'error'; progress: number; mbps: number | null; error?: string }>({ status: 'idle', progress: 0, mbps: null });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const navigatorWithConnection = navigator as Navigator & { connection?: NetworkConnectionLike; mozConnection?: NetworkConnectionLike; webkitConnection?: NetworkConnectionLike };
    const connection = navigatorWithConnection.connection || navigatorWithConnection.mozConnection || navigatorWithConnection.webkitConnection;
    const updateConnection = () => { if (connection) setConnectionInfo({ type: connection.type, effectiveType: connection.effectiveType, downlink: connection.downlink, rtt: connection.rtt, saveData: connection.saveData }); };
    if (connection) { updateConnection(); connection.addEventListener('change', updateConnection); }
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); connection?.removeEventListener('change', updateConnection); };
  }, []);

  const runSpeedTest = async () => {
    setSpeedTest({ status: 'running', progress: 0, mbps: null });
    try {
      const response = await fetch(`https://speed.cloudflare.com/__down?bytes=5000000&v=${Date.now()}`);
      if (!response.ok) throw new Error('Network response was not successful');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming download is not supported');
      const startTime = performance.now();
      let receivedLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedLength += value.length;
        setSpeedTest((previous) => ({ ...previous, progress: Math.min(100, Math.round(receivedLength / 50000)) }));
      }
      const mbps = (receivedLength * 8) / ((performance.now() - startTime) / 1000) / 1_000_000;
      setSpeedTest({ status: 'done', progress: 100, mbps: Number(mbps.toFixed(1)) });
      setResult('network', 'working');
    } catch (caught) {
      setSpeedTest({ status: 'error', progress: 0, mbps: null, error: caught instanceof Error ? caught.message : 'Speed test failed' });
      setResult('network', 'issue');
    }
  };

  const effectiveType = connectionInfo?.effectiveType?.toUpperCase() || '—';
  const signalBars = connectionInfo?.effectiveType === '4g' ? 4 : connectionInfo?.effectiveType === '3g' ? 3 : connectionInfo?.effectiveType === '2g' ? 2 : isOnline ? 3 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="test-page mx-auto flex w-full max-w-5xl flex-col">
      <TestPageHeader testId="T-08" title="Network" description="Inspect connection state, link telemetry, latency, and download throughput." onMarkIssue={() => setResult('network', 'issue')} onMarkWorking={() => setResult('network', 'working')} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="instrument-panel">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading label="Connection monitor" description="Browser-reported status and link quality." trailing={<TestStatusBadge status={results.network} />} className="mb-5" />
            <div className="live-readout relative flex min-h-[340px] items-center justify-center overflow-hidden p-6">
              <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
                <div className={`flex h-20 w-20 items-center justify-center rounded-full border ${isOnline ? 'border-status-pass/20 bg-status-pass/10 text-status-pass' : 'border-status-warn/20 bg-status-warn/10 text-status-warn'}`}>{isOnline ? <Wifi className="h-9 w-9" /> : <WifiOff className="h-9 w-9" />}</div>
                <span className="spec-item mt-6">Network state</span>
                <div className="readout-value mt-2 text-5xl tracking-[-0.05em]">{isOnline ? 'Online' : 'Offline'}</div>
                <p className="mt-2 text-sm text-muted-foreground">{isOnline ? 'This device can reach the internet' : 'No internet connection detected'}</p>
                <div className="mt-7 flex h-10 items-end gap-2" aria-label={`${signalBars} of 4 link quality bars`}>
                  {[1, 2, 3, 4].map((bar) => <span key={bar} className={`w-3 rounded-sm transition-colors ${bar <= signalBars ? 'bg-primary' : 'bg-secondary'}`} style={{ height: `${bar * 9}px` }} />)}
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MetricTile label="Link" value={isOnline ? 'Active' : 'Down'} accent={isOnline} />
              <MetricTile label="Type" value={effectiveType} />
              <MetricTile label="Latency" value={connectionInfo?.rtt != null ? `${connectionInfo.rtt} ms` : '—'} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Speed test" description="5 MB download sample" className="mb-5" />
              <div className="live-readout flex min-h-52 items-center justify-center p-5">
                {speedTest.status === 'idle' && <div className="relative z-10 w-full text-center"><Gauge className="mx-auto h-7 w-7 text-primary" /><p className="mt-3 font-mono text-xs font-semibold uppercase tracking-wide">Ready to measure</p><Button onClick={runSpeedTest} disabled={!isOnline} className="mt-5 h-11 w-full gap-2 font-semibold"><Download className="h-4 w-4 shrink-0" /> Start Test</Button></div>}
                {speedTest.status === 'running' && <div className="relative z-10 w-full text-center"><div className="readout-value text-4xl text-primary">{speedTest.progress}<span className="text-base text-muted-foreground">%</span></div><Progress value={speedTest.progress} className="mt-5 h-2" /><p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-primary">Downloading sample</p></div>}
                {speedTest.status === 'done' && <div className="relative z-10 w-full text-center"><span className="spec-item">Measured speed</span><div className="readout-value mt-2 text-5xl text-primary">{speedTest.mbps}<span className="ml-1 text-base text-muted-foreground">Mbps</span></div><Button onClick={runSpeedTest} variant="outline" className="mt-5 h-10 w-full gap-2 font-semibold"><RotateCcw className="h-4 w-4 shrink-0" /> Test Again</Button></div>}
                {speedTest.status === 'error' && <div className="relative z-10 w-full text-center"><WifiOff className="mx-auto h-7 w-7 text-status-warn" /><p className="mt-3 font-semibold text-status-warn">Test interrupted</p><p className="mt-2 text-xs text-muted-foreground">{speedTest.error}</p><Button onClick={runSpeedTest} variant="outline" className="mt-5 h-10 w-full font-semibold">Retry</Button></div>}
              </div>
            </CardContent>
          </Card>

          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Link telemetry" className="mb-4" />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-muted-foreground"><Globe2 className="h-4 w-4" /> Downlink</span><span className="readout-value text-xs">{connectionInfo?.downlink != null ? `${connectionInfo.downlink} Mbps` : '—'}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-muted-foreground"><Radio className="h-4 w-4" /> Data saver</span><span className="readout-value text-xs">{connectionInfo ? connectionInfo.saveData ? 'On' : 'Off' : '—'}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="instrument-panel"><CardContent className="flex items-center justify-between p-5"><span className="panel-label">Result</span><TestStatusBadge status={results.network} /></CardContent></Card>
        </div>
      </div>
    </motion.div>
  );
}