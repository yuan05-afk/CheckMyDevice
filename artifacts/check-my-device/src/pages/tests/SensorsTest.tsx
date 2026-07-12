import { useEffect, useState, useRef } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Smartphone, Fingerprint, Compass, Move3D } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function SensorsTest() {
  const { results, setResult } = useTestContext();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  
  const [orientation, setOrientation] = useState<{ alpha: number, beta: number, gamma: number } | null>(null);
  const [motionData, setMotionData] = useState<{ x: number, y: number, z: number } | null>(null);
  const [touches, setTouches] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          startSensors();
        } else {
          setPermissionGranted(false);
          setResult('sensors', 'issue');
        }
      } catch (error) {
        setPermissionGranted(false);
      }
    } else {
      setPermissionGranted(true);
      startSensors();
    }
  };

  const startSensors = () => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        setOrientation({ alpha: e.alpha, beta: e.beta, gamma: e.gamma });
        if (results.sensors === 'untested') setResult('sensors', 'working');
      }
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.x !== null) {
        setMotionData({
          x: e.accelerationIncludingGravity.x || 0,
          y: e.accelerationIncludingGravity.y || 0,
          z: e.accelerationIncludingGravity.z || 0
        });
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  };

  useEffect(() => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setPermissionGranted(null);
    } else if (window.DeviceOrientationEvent) {
      setPermissionGranted(true);
      startSensors();
    } else {
      setPermissionGranted(false); 
    }

    return () => {
      window.removeEventListener('deviceorientation', () => {});
      window.removeEventListener('devicemotion', () => {});
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const colors = ['#4F46E5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const updateTouches = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const newTouches = [];
      
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        newTouches.push({
          id: t.identifier,
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
          color: colors[t.identifier % colors.length]
        });
      }
      setTouches(newTouches);
      if (newTouches.length > 0 && results.sensors === 'untested') {
        setResult('sensors', 'working');
      }
    };

    const clearTouches = (e: TouchEvent) => {
      e.preventDefault();
      updateTouches(e);
    };

    canvas.addEventListener('touchstart', updateTouches, { passive: false });
    canvas.addEventListener('touchmove', updateTouches, { passive: false });
    canvas.addEventListener('touchend', clearTouches, { passive: false });
    canvas.addEventListener('touchcancel', clearTouches, { passive: false });

    const ctx = canvas.getContext('2d');
    let animationFrame: number;

    const render = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      for(let x=0; x<canvas.width; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
      for(let y=0; y<canvas.height; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

      touches.forEach(t => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 50, 0, 2 * Math.PI);
        ctx.fillStyle = `${t.color}22`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(t.x, t.y, 30, 0, 2 * Math.PI);
        ctx.fillStyle = t.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${t.id}`, t.x, t.y);
      });

      if (touches.length === 0) {
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#555' : '#aaa';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Touch here (supports multi-touch)', canvas.width/2, canvas.height/2);
      }

      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('touchstart', updateTouches);
      canvas.removeEventListener('touchmove', updateTouches);
      canvas.removeEventListener('touchend', clearTouches);
      canvas.removeEventListener('touchcancel', clearTouches);
      cancelAnimationFrame(animationFrame);
    };
  }, [touches, results.sensors, setResult]);

  const handleMarkIssue = () => setResult('sensors', 'issue');
  const handleMarkWorking = () => setResult('sensors', 'working');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 pb-6 border-b border-border/50 mb-6">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Sensors & Touch</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Test gyroscope, accelerometer, and multi-touch capabilities.</p>
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
        <Card className="flex flex-col shadow-none border-border/60">
          <CardContent className="p-6 flex-1 flex flex-col gap-6">
            <div className="flex items-center gap-4 border-b border-border/50 pb-5">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Device Orientation</h3>
                <p className="text-sm font-medium text-muted-foreground">Gyroscope telemetry</p>
              </div>
            </div>
            
            {permissionGranted === null ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 py-10 bg-secondary/50 rounded-2xl border border-border/50">
                <Smartphone className="w-14 h-14 text-muted-foreground opacity-50" />
                <Button onClick={requestPermission} className="font-bold shadow-sm">Request Sensor Access</Button>
                <p className="text-xs font-medium text-muted-foreground text-center max-w-xs">iOS requires explicit permission to access motion and orientation sensors.</p>
              </div>
            ) : permissionGranted === false ? (
              <div className="flex-1 flex items-center justify-center font-bold text-muted-foreground bg-secondary/50 rounded-2xl border border-border/50">
                Sensors unavailable or denied.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 flex-1 items-center">
                <div className="text-center p-5 bg-card border border-border/50 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Alpha (Z)</div>
                  <div className="font-mono font-black text-2xl text-primary">{orientation?.alpha ? Math.round(orientation.alpha) : 0}°</div>
                </div>
                <div className="text-center p-5 bg-card border border-border/50 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Beta (X)</div>
                  <div className="font-mono font-black text-2xl text-primary">{orientation?.beta ? Math.round(orientation.beta) : 0}°</div>
                </div>
                <div className="text-center p-5 bg-card border border-border/50 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Gamma (Y)</div>
                  <div className="font-mono font-black text-2xl text-primary">{orientation?.gamma ? Math.round(orientation.gamma) : 0}°</div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center pt-2">
               {orientation && (
                 <div 
                   className="w-28 h-56 border-8 border-foreground rounded-[2rem] relative shadow-xl transition-transform duration-75 ease-linear flex items-center justify-center bg-card"
                   style={{ 
                     transform: `perspective(600px) rotateX(${-(orientation.beta || 0)}deg) rotateY(${(orientation.gamma || 0)}deg) rotateZ(${0}deg)`,
                     transformStyle: 'preserve-3d'
                   }}
                 >
                   <div className="w-12 h-1.5 bg-foreground/20 rounded-full absolute top-3" />
                   <Move3D className="w-10 h-10 text-muted-foreground/30" />
                 </div>
               )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col overflow-hidden shadow-none border-border/60">
          <CardContent className="p-0 flex-1 relative min-h-[450px]">
            <div className="absolute top-5 left-5 z-10 bg-background/80 backdrop-blur-md px-4 py-2 rounded-xl border border-border/50 shadow-sm flex items-center gap-3 pointer-events-none">
              <Fingerprint className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold">{touches.length} points detected</span>
            </div>
            <canvas 
              ref={canvasRef} 
              className="w-full h-full bg-secondary/30 touch-none cursor-crosshair"
            />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
