import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LockKeyhole, Mic as MicIcon, ShieldAlert, Waves } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TestPageHeader } from '@/components/TestPageHeader';
import { MetricTile, PanelHeading, TestStatusBadge, WaitingReadout } from '@/components/DiagnosticPrimitives';

export function MicrophoneTest() {
  const { results, setResult } = useTestContext();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [peak, setPeak] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef(0);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    cancelAnimationFrame(animationFrameRef.current);
  };

  const drawWaveform = () => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!analyser || !canvas || !ctx) return;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let index = 0; index < data.length; index++) {
        const normalized = (data[index] - 128) / 128;
        sum += normalized * normalized;
      }
      const level = Math.min(100, Math.floor(Math.sqrt(sum / data.length) * 400));
      setVolume(level);
      setPeak((previous) => Math.max(level, Math.floor(previous * 0.995)));

      const isDark = document.documentElement.classList.contains('dark');
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      ctx.fillStyle = isDark ? '#181C24' : '#F7F8FA';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.045)';
      ctx.lineWidth = 1;
      for (let y = 24; y < canvas.height; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
      ctx.strokeStyle = `hsl(${primary})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const sliceWidth = canvas.width / data.length;
      data.forEach((sample, index) => {
        const x = index * sliceWidth;
        const y = (sample / 128) * canvas.height / 2;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    draw();
  };

  const startMic = async () => {
    stopStream();
    setError(null);
    setPeak(0);
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = nextStream;
      setStream(nextStream);
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      audioContext.createMediaStreamSource(nextStream).connect(analyser);
      analyserRef.current = analyser;
      drawWaveform();
      setResult('microphone', 'working');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Failed to access microphone';
      console.error('Microphone access error:', caught);
      setError(message);
      setResult('microphone', 'issue');
    }
  };

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (canvas && parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => { window.removeEventListener('resize', resizeCanvas); stopStream(); };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="test-page mx-auto flex w-full max-w-5xl flex-col">
      <TestPageHeader
        testId="T-04"
        title="Microphone"
        description="Watch the waveform, input level, and peak response while you speak."
        onMarkIssue={() => setResult('microphone', 'issue')}
        onMarkWorking={() => setResult('microphone', 'working')}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="instrument-panel">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading label="Live waveform" description="Sound is analyzed in real time and never leaves this tab." trailing={<TestStatusBadge status={results.microphone} />} className="mb-5" />
            <div className="live-readout relative flex min-h-[350px] items-center justify-center overflow-hidden">
              {!stream && !error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-card/92 px-6 text-center backdrop-blur-md">
                  <div className="test-hero-icon"><MicIcon className="h-8 w-8" /></div>
                  <div><h3 className="font-display text-lg font-bold">Ready to listen locally</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Grant microphone permission, then speak to see the signal trace react.</p></div>
                  <Button onClick={startMic} className="h-11 min-w-48 gap-2 font-semibold"><Waves className="h-4 w-4 shrink-0" /> Start Microphone Test</Button>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-card/92 px-6 text-center backdrop-blur-md">
                  <div className="test-hero-icon border-status-fail/25 bg-status-fail/10 text-status-fail"><ShieldAlert className="h-8 w-8" /></div>
                  <div><h3 className="font-display text-lg font-bold">Microphone unavailable</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{error}. Check browser permissions, then retry.</p></div>
                  <Button variant="outline" onClick={startMic} className="h-11 font-semibold">Retry Microphone</Button>
                </div>
              )}
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
              {stream && <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-primary/20 bg-card/75 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] backdrop-blur-md"><span className="signal-status-dot" /> Listening</div>}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MetricTile label="Input" value={stream ? 'Active' : 'Idle'} accent={Boolean(stream)} />
              <MetricTile label="Level" value={`${volume}%`} />
              <MetricTile label="Peak" value={`${peak}%`} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Input level" description="Live signal intensity" className="mb-5" />
              <div className="live-readout p-5">
                <div className="relative z-10 flex items-end justify-between"><span className="spec-item">Current</span><span className="readout-value text-4xl text-primary">{volume}<span className="ml-1 text-base text-muted-foreground">%</span></span></div>
                <div className="relative z-10 mt-5 grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }, (_, index) => <span key={index} className={`h-12 rounded-sm transition-colors ${volume >= (index + 1) * 10 ? index >= 8 ? 'bg-status-warn' : 'bg-primary' : 'bg-secondary'}`} />)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Signal check" className="mb-4" />
              {stream ? <div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Response</span><span className="readout-value text-xs">{peak > 3 ? 'Detected' : 'Waiting'}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Processing</span><span className="readout-value text-xs">Local</span></div></div> : <div className="live-readout flex min-h-28 items-center justify-center p-4"><WaitingReadout title="Awaiting input" detail="Start the microphone test" /></div>}
              <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4 text-primary" /> Audio is not saved</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}