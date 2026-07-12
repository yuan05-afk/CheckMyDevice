import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Wifi, WifiOff, Globe, Download } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function NetworkTest() {
  const { results, setResult } = useTestContext();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  
  const [speedTest, setSpeedTest] = useState<{
    status: 'idle' | 'running' | 'done' | 'error';
    progress: number;
    mbps: number | null;
    error?: string;
  }>({ status: 'idle', progress: 0, mbps: null });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const updateConnectionStatus = () => {
        setConnectionInfo({
          type: connection.type,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      };
      updateConnectionStatus();
      connection.addEventListener('change', updateConnectionStatus);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', updateConnectionStatus);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const runSpeedTest = async () => {
    setSpeedTest({ status: 'running', progress: 0, mbps: null });
    
    try {
      const url = `https://speed.cloudflare.com/__down?bytes=5000000&v=${Date.now()}`;
      const startTime = performance.now();
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const reader = response.body?.getReader();
      const contentLength = 5000000;
      
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      let receivedLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        receivedLength += value.length;
        const progress = Math.min(100, Math.round((receivedLength / contentLength) * 100));
        setSpeedTest(prev => ({ ...prev, progress }));
      }
      
      const endTime = performance.now();
      const durationInSeconds = (endTime - startTime) / 1000;
      const bitsLoaded = receivedLength * 8;
      const speedBps = bitsLoaded / durationInSeconds;
      const speedMbps = speedBps / 1000000;
      
      setSpeedTest({ 
        status: 'done', 
        progress: 100, 
        mbps: Number(speedMbps.toFixed(1)) 
      });
      setResult('network', 'working');
      
    } catch (err: any) {
      setSpeedTest({ 
        status: 'error', 
        progress: 0, 
        mbps: null,
        error: err.message || 'Speed test failed' 
      });
      setResult('network', 'issue');
    }
  };

  const handleMarkIssue = () => setResult('network', 'issue');
  const handleMarkWorking = () => setResult('network', 'working');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 pb-6 border-b border-border/50 mb-6">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Network</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Test connectivity and approximate download speed.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col h-full shadow-none border-border/60">
          <CardContent className="p-8 flex-1 flex flex-col items-center justify-center gap-8">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-colors ${isOnline ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
              {isOnline ? <Wifi className="w-14 h-14" /> : <WifiOff className="w-14 h-14" />}
            </div>
            
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">
                {isOnline ? 'Online' : 'Offline'}
              </h2>
              <p className="text-muted-foreground font-medium">
                {isOnline ? 'Device is connected to the internet' : 'No internet connection detected'}
              </p>
            </div>
            
            {connectionInfo && isOnline && (
              <div className="w-full bg-secondary rounded-xl p-5 flex justify-between items-center border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-background rounded-lg text-muted-foreground shadow-sm">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Connection</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                      {connectionInfo.type || 'unknown'} / {connectionInfo.effectiveType || 'unknown'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">Downlink</div>
                  <div className="text-sm font-bold font-mono mt-0.5 text-primary">
                    {connectionInfo.downlink ? `${connectionInfo.downlink} Mbps` : 'N/A'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none border-border/60">
          <CardContent className="p-8 h-full flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Speed Test</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Approximate download throughput
                </p>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center bg-card rounded-2xl border border-border/50 p-8 shadow-inner">
              {speedTest.status === 'idle' && (
                <div className="text-center">
                  <Button onClick={runSpeedTest} disabled={!isOnline} className="w-full h-14 text-base font-bold shadow-sm">
                    Start Speed Test
                  </Button>
                </div>
              )}
              
              {speedTest.status === 'running' && (
                <div className="space-y-6 w-full text-center">
                  <div className="text-5xl font-black text-muted-foreground/30 font-mono tracking-tighter">
                    --- <span className="text-2xl">Mbps</span>
                  </div>
                  <Progress value={speedTest.progress} className="h-3" />
                  <p className="text-sm font-bold text-primary animate-pulse uppercase tracking-widest">Testing download...</p>
                </div>
              )}
              
              {speedTest.status === 'done' && (
                <div className="space-y-8 w-full text-center animate-in fade-in zoom-in duration-300">
                  <div className="text-6xl font-black text-primary font-mono tracking-tighter drop-shadow-sm">
                    {speedTest.mbps} <span className="text-2xl text-muted-foreground font-bold">Mbps</span>
                  </div>
                  <Button onClick={runSpeedTest} variant="outline" className="w-full font-bold">
                    Test Again
                  </Button>
                </div>
              )}
              
              {speedTest.status === 'error' && (
                <div className="space-y-5 w-full text-center">
                  <div className="text-amber-500 font-bold text-lg">Test failed</div>
                  <p className="text-sm font-medium text-muted-foreground">{speedTest.error}</p>
                  <Button onClick={runSpeedTest} variant="outline" className="font-bold">
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
