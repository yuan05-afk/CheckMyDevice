import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AudioLines, Play, Square, Volume1, Volume2 } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { TestPageHeader } from '@/components/TestPageHeader';
import { MetricTile, PanelHeading, TestStatusBadge, WaitingReadout } from '@/components/DiagnosticPrimitives';

export function SpeakerTest() {
  const { results, setResult } = useTestContext();
  const [playing, setPlaying] = useState<'left' | 'right' | 'both' | 'sweep' | null>(null);
  const [volume, setVolume] = useState([50]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const timerRef = useRef<number | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
  };

  const stopTone = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); oscillatorRef.current.disconnect(); } catch { /* already stopped */ }
      oscillatorRef.current = null;
    }
    setPlaying(null);
  };

  const playTone = (channel: 'left' | 'right' | 'both') => {
    stopTone();
    initAudio();
    const context = audioContextRef.current;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner ? context.createStereoPanner() : null;
    oscillator.type = 'sine';
    oscillator.frequency.value = 440;
    gain.gain.value = (volume[0] / 100) * 0.5;
    if (panner) {
      panner.pan.value = channel === 'left' ? -1 : channel === 'right' ? 1 : 0;
      oscillator.connect(panner); panner.connect(gain);
    } else oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillatorRef.current = oscillator;
    setPlaying(channel);
    timerRef.current = window.setTimeout(() => { if (oscillatorRef.current === oscillator) stopTone(); }, 3000);
    if (results.speaker === 'untested') setResult('speaker', 'working');
  };

  const playSweep = () => {
    stopTone();
    initAudio();
    const context = audioContextRef.current;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(2000, context.currentTime + 2);
    gain.gain.value = (volume[0] / 100) * 0.5;
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start();
    oscillatorRef.current = oscillator;
    setPlaying('sweep');
    timerRef.current = window.setTimeout(() => { if (oscillatorRef.current === oscillator) stopTone(); }, 2000);
    if (results.speaker === 'untested') setResult('speaker', 'working');
  };

  useEffect(() => () => { stopTone(); audioContextRef.current?.close(); }, []);

  const activeLabel = playing === 'left' ? 'Left channel' : playing === 'right' ? 'Right channel' : playing === 'both' ? 'Stereo pair' : playing === 'sweep' ? 'Frequency sweep' : 'No tone';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="test-page mx-auto flex w-full max-w-[90rem] flex-col">
      <TestPageHeader testId="T-05" title="Speaker" description="Verify left, right, stereo, volume, and frequency response." onMarkIssue={() => setResult('speaker', 'issue')} onMarkWorking={() => setResult('speaker', 'working')} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)]">
        <Card className="instrument-panel">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading label="Stereo output" description="Each tone plays for up to three seconds." className="mb-5" />
            <div className="live-readout relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden p-6">
              <div className="relative z-10 flex h-32 w-32 items-center justify-center">
                {playing && <><span className="absolute h-full w-full rounded-full border border-primary/15 [animation:trace-pulse_1.8s_ease-in-out_infinite]" /><span className="absolute h-24 w-24 rounded-full border border-primary/25 [animation:trace-pulse_1.4s_ease-in-out_infinite]" /></>}
                <div className="test-hero-icon"><Volume2 className="h-8 w-8" /></div>
              </div>
              <div className="relative z-10 mt-5 text-center">
                <span className="spec-item">Current output</span>
                <div className="readout-value mt-2 text-2xl">{activeLabel}</div>
                <p className="mt-2 text-sm text-muted-foreground">{playing ? 'Tone is playing now' : 'Select a channel below to begin'}</p>
              </div>
              <div className="relative z-10 mt-7 grid w-full max-w-lg grid-cols-3 gap-3">
                {(['left', 'both', 'right'] as const).map((channel) => (
                  <Button key={channel} variant={playing === channel ? 'default' : 'outline'} className="h-auto flex-col gap-1 py-3 font-semibold" onClick={() => playing === channel ? stopTone() : playTone(channel)}>
                    <span>{channel === 'both' ? 'Both' : channel[0].toUpperCase() + channel.slice(1)}</span>
                    <span className={`font-mono text-[9px] uppercase tracking-wider ${playing === channel ? 'text-white/70' : 'text-muted-foreground'}`}>{channel === 'left' ? 'L / −1.0' : channel === 'right' ? 'R / +1.0' : 'L + R / 0'}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MetricTile label="Output" value={playing ? 'Active' : 'Idle'} accent={Boolean(playing)} />
              <MetricTile label="Tone" value={playing === 'sweep' ? '200–2k' : '440 Hz'} />
              <MetricTile label="Volume" value={`${volume[0]}%`} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Output level" description="Test-tone volume" className="mb-5" />
              <div className="flex items-center gap-3"><Volume1 className="h-4 w-4 text-muted-foreground" /><Slider value={volume} onValueChange={setVolume} max={100} step={1} className="flex-1" /><span className="readout-value w-12 text-right text-sm">{volume[0]}%</span></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${volume[0]}%` }} /></div>
            </CardContent>
          </Card>

          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Frequency sweep" description="Rises from 200 Hz to 2 kHz." className="mb-5" />
              <div className="live-readout flex min-h-32 items-center justify-center p-4">
                {playing === 'sweep' ? <div className="relative z-10 space-y-3 text-center"><AudioLines className="mx-auto h-6 w-6 text-primary [animation:trace-pulse_1s_ease-in-out_infinite]" /><p className="readout-value text-sm">200 Hz → 2 kHz</p></div> : <WaitingReadout title="Sweep ready" detail="Listen for a smooth rise" />}
              </div>
              <Button variant={playing === 'sweep' ? 'outline' : 'secondary'} className="mt-4 h-11 w-full gap-2 font-semibold" onClick={() => playing === 'sweep' ? stopTone() : playSweep()}>{playing === 'sweep' ? <Square className="h-4 w-4 shrink-0" /> : <Play className="h-4 w-4 shrink-0 text-primary" />}{playing === 'sweep' ? 'Stop Sweep' : 'Play Sweep'}</Button>
            </CardContent>
          </Card>

          <Card className="instrument-panel">
            <CardContent className="flex items-center justify-between p-5"><span className="panel-label">Result</span><TestStatusBadge status={results.speaker} /></CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}