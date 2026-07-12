import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Play, Square } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { TestPageHeader } from '@/components/TestPageHeader';

export function SpeakerTest() {
  const { results, setResult } = useTestContext();
  const [playing, setPlaying] = useState<'left' | 'right' | 'both' | 'sweep' | null>(null);
  const [volume, setVolume] = useState([50]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
  };

  const stopTone = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {
      }
      oscillatorRef.current = null;
    }
    setPlaying(null);
  };

  const playTone = (channel: 'left' | 'right' | 'both') => {
    stopTone();
    initAudio();
    
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    
    osc.type = 'sine';
    osc.frequency.value = 440; 
    
    gainNode.gain.value = (volume[0] / 100) * 0.5; 
    
    if (panner) {
      panner.pan.value = channel === 'left' ? -1 : channel === 'right' ? 1 : 0;
      osc.connect(panner);
      panner.connect(gainNode);
    } else {
      osc.connect(gainNode);
    }
    
    gainNode.connect(ctx.destination);
    
    osc.start();
    oscillatorRef.current = osc;
    setPlaying(channel);
    
    setTimeout(() => {
      if (oscillatorRef.current === osc) {
        stopTone();
      }
    }, 3000);
    
    if (results.speaker === 'untested') {
      setResult('speaker', 'working');
    }
  };

  const playSweep = () => {
    stopTone();
    initAudio();
    
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 2);
    
    gainNode.gain.value = (volume[0] / 100) * 0.5;
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    oscillatorRef.current = osc;
    setPlaying('sweep');
    
    setTimeout(() => {
      if (oscillatorRef.current === osc) {
        stopTone();
      }
    }, 2000);
    
    if (results.speaker === 'untested') {
      setResult('speaker', 'working');
    }
  };

  useEffect(() => {
    return () => {
      stopTone();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleMarkIssue = () => setResult('speaker', 'issue');
  const handleMarkWorking = () => setResult('speaker', 'working');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col max-w-4xl mx-auto w-full min-h-[calc(100dvh-12rem)] justify-center">
      <TestPageHeader
        testId="T-05"
        title="Speaker"
        description="Test stereo channels and audio output."
        onMarkIssue={handleMarkIssue}
        onMarkWorking={handleMarkWorking}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-none border-border/60 bg-card">
          <CardContent className="p-10 flex flex-col items-center justify-center gap-10 min-h-[350px]">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary relative">
              <Volume2 className="w-8 h-8 relative z-10" />
              {playing && (
                <span className="absolute flex h-full w-full">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-20 duration-1000"></span>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-10 delay-300 duration-1000"></span>
                </span>
              )}
            </div>

            <div className="flex gap-4 w-full justify-center">
              <Button 
                variant={playing === 'left' ? 'default' : 'outline'} 
                className="w-24 font-semibold shadow-sm"
                onClick={() => playing === 'left' ? stopTone() : playTone('left')}
              >
                Left
              </Button>
              <Button 
                variant={playing === 'both' ? 'default' : 'outline'} 
                className="w-24 font-semibold shadow-sm"
                onClick={() => playing === 'both' ? stopTone() : playTone('both')}
              >
                Both
              </Button>
              <Button 
                variant={playing === 'right' ? 'default' : 'outline'} 
                className="w-24 font-semibold shadow-sm"
                onClick={() => playing === 'right' ? stopTone() : playTone('right')}
              >
                Right
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="shadow-none border-border/60">
            <CardContent className="p-6 flex flex-col gap-5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Volume Control</h3>
              <div className="flex items-center gap-5">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <Slider 
                  value={volume} 
                  onValueChange={setVolume} 
                  max={100} 
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-right font-mono font-bold text-sm bg-secondary px-2 py-1 rounded-md">{volume[0]}%</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Adjusts test tone volume. Ensure your system volume is also turned up.
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-none border-border/60">
            <CardContent className="p-6 flex flex-col gap-5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Frequency Sweep</h3>
              <p className="text-sm font-medium text-muted-foreground">
                Plays a continuous tone that rises in pitch to test speaker range.
              </p>
              <Button 
                variant="secondary" 
                className="w-full justify-center gap-2 font-semibold h-12"
                onClick={() => playing === 'sweep' ? stopTone() : playSweep()}
              >
                {playing === 'sweep' ? <Square className="w-5 h-5 text-foreground" /> : <Play className="w-5 h-5 text-primary" />}
                {playing === 'sweep' ? 'Stop Sweep' : 'Play Sweep (200Hz - 2kHz)'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
