import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Mic as MicIcon, ShieldAlert } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function MicrophoneTest() {
  const { results, setResult } = useTestContext();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    cancelAnimationFrame(animationFrameRef.current);
  };

  const startMic = async () => {
    stopStream();
    setError(null);
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(newStream);
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(newStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      analyserRef.current = analyser;
      
      drawWaveform();
      setResult('microphone', 'working');
    } catch (err: any) {
      console.error("Mic access error:", err);
      setError(err.message || "Failed to access microphone");
      setResult('microphone', 'issue');
    }
  };

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyser.getByteTimeDomainData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setVolume(Math.min(100, Math.floor(rms * 400)));
      
      // Always draw on a dark background for the oscilloscope vibe
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#4F46E5'; // primary indigo
      ctx.beginPath();
      
      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    
    draw();
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          canvasRef.current.width = parent.clientWidth;
          canvasRef.current.height = parent.clientHeight;
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 0); 
    
    return () => {
      window.removeEventListener('resize', handleResize);
      stopStream();
    };
  }, []);

  const handleMarkIssue = () => setResult('microphone', 'issue');
  const handleMarkWorking = () => setResult('microphone', 'working');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 pb-6 border-b border-border/50 mb-6">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Microphone</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Test audio input and levels.</p>
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
            <div className="aspect-[21/9] bg-[#0D0D0D] rounded-xl overflow-hidden relative flex items-center justify-center border border-border/50 shadow-inner">
              {!stream && !error && (
                <div className="text-center p-6 flex flex-col items-center gap-4 z-10 absolute inset-0 bg-[#0D0D0D]/90 backdrop-blur-sm justify-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                    <MicIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-white">Microphone Access Required</h3>
                    <p className="text-sm text-gray-400 max-w-sm">
                      To test your microphone, the browser needs permission. Audio is processed locally.
                    </p>
                  </div>
                  <Button onClick={() => startMic()} size="lg" className="font-semibold mt-2">
                    Request Permission
                  </Button>
                </div>
              )}
              
              {error && (
                <div className="text-center p-6 flex flex-col items-center gap-4 z-10 absolute inset-0 bg-[#0D0D0D]/90 backdrop-blur-sm justify-center">
                  <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center text-destructive">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-white">Access Denied</h3>
                    <p className="text-sm text-gray-400 max-w-sm">
                      {error}. Please check your browser settings and try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => startMic()} className="font-semibold mt-2">
                    Retry
                  </Button>
                </div>
              )}
              
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="shadow-none border-border/60">
            <CardContent className="p-6 flex flex-col gap-5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Input Level</h3>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden flex border border-border/50">
                  <div 
                    className="h-full bg-primary transition-all duration-75 ease-out"
                    style={{ width: `${volume}%` }}
                  />
                </div>
                <div className="w-12 text-right font-mono font-bold text-sm tabular-nums text-foreground">
                  {volume}%
                </div>
              </div>
              
              <div className="text-sm font-medium text-muted-foreground bg-secondary p-4 rounded-xl">
                <p>Speak into your microphone. The bar and waveform should move when you make noise.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
