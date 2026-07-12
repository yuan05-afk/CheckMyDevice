import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera as CameraIcon, ShieldAlert } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CameraTest() {
  const { results, setResult } = useTestContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{ width: number, height: number } | null>(null);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (deviceId?: string) => {
    stopStream();
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (!selectedDeviceId && videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
      
      setResult('camera', 'working');
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError(err.message || "Failed to access camera");
      setResult('camera', 'issue');
    }
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoInfo({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera(deviceId);
  };

  const handleMarkIssue = () => setResult('camera', 'issue');
  const handleMarkWorking = () => setResult('camera', 'working');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 pb-6 border-b border-border/50 mb-6">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Camera</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">Verify your webcam is working and aligned.</p>
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
            <div className="aspect-video bg-[#0D0D0D] rounded-xl overflow-hidden relative flex items-center justify-center border border-border/50 shadow-inner">
              {!stream && !error && (
                <div className="text-center p-6 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                    <CameraIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-white">Camera Access Required</h3>
                    <p className="text-sm text-gray-400 max-w-sm">
                      To test your camera, the browser needs permission. No video is recorded or sent anywhere.
                    </p>
                  </div>
                  <Button onClick={() => startCamera()} size="lg" className="font-semibold mt-2">
                    Request Permission
                  </Button>
                </div>
              )}
              
              {error && (
                <div className="text-center p-6 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center text-destructive">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-white">Access Denied</h3>
                    <p className="text-sm text-gray-400 max-w-sm">
                      {error}. Please check your browser settings and try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => startCamera()} className="mt-2 font-semibold">
                    Retry
                  </Button>
                </div>
              )}
              
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                onLoadedMetadata={handleLoadedMetadata}
                className={`w-full h-full object-cover ${stream ? 'block' : 'hidden'}`} 
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="shadow-none border-border/60">
            <CardContent className="p-6 flex flex-col gap-5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Device Info</h3>
              
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold">Select Camera</label>
                <Select value={selectedDeviceId} onValueChange={handleDeviceChange} disabled={devices.length === 0}>
                  <SelectTrigger className="bg-card font-medium">
                    <SelectValue placeholder="No cameras found" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device, i) => (
                      <SelectItem key={device.deviceId} value={device.deviceId} className="font-medium">
                        {device.label || `Camera ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {videoInfo && (
                <div className="mt-2 flex flex-col gap-3 text-sm">
                  <div className="flex justify-between border-b border-border/50 pb-3">
                    <span className="text-muted-foreground font-semibold">Resolution</span>
                    <span className="font-mono font-bold">{videoInfo.width} × {videoInfo.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Aspect Ratio</span>
                    <span className="font-mono font-bold">{(videoInfo.width / videoInfo.height).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
