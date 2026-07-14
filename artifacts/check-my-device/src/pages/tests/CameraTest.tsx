import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera as CameraIcon, Eye, LockKeyhole, ShieldAlert, Video } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestPageHeader } from '@/components/TestPageHeader';
import { MetricTile, PanelHeading, TestStatusBadge, WaitingReadout } from '@/components/DiagnosticPrimitives';

export function CameraTest() {
  const { results, setResult } = useTestContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{ width: number; height: number } | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  };

  const startCamera = async (deviceId?: string) => {
    stopStream();
    setError(null);
    setVideoInfo(null);
    try {
      const constraints: MediaStreamConstraints = { video: deviceId ? { deviceId: { exact: deviceId } } : true };
      const nextStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = nextStream;
      setStream(nextStream);
      if (videoRef.current) videoRef.current.srcObject = nextStream;
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter((device) => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (!selectedDeviceId && videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
      setResult('camera', 'working');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Failed to access camera';
      console.error('Camera access error:', caught);
      setError(message);
      setResult('camera', 'issue');
    }
  };

  useEffect(() => () => stopStream(), []);

  const handleLoadedMetadata = () => {
    if (videoRef.current) setVideoInfo({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera(deviceId);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="test-page mx-auto flex w-full max-w-5xl flex-col">
      <TestPageHeader
        testId="T-03"
        title="Camera"
        description="Verify the live image, framing, resolution, and selected camera."
        onMarkIssue={() => setResult('camera', 'issue')}
        onMarkWorking={() => setResult('camera', 'working')}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="instrument-panel">
          <CardContent className="p-5 sm:p-6">
            <PanelHeading label="Live camera" description="The preview stays on this device and is never uploaded." trailing={<TestStatusBadge status={results.camera} />} className="mb-5" />
            <div className="live-readout relative flex aspect-video min-h-[320px] items-center justify-center overflow-hidden">
              {!stream && !error && (
                <div className="relative z-10 flex max-w-md flex-col items-center gap-5 px-6 text-center">
                  <div className="test-hero-icon"><CameraIcon className="h-8 w-8" /></div>
                  <div>
                    <h3 className="font-display text-lg font-bold">Ready for camera access</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Grant one-time browser permission to start a local live preview.</p>
                  </div>
                  <Button onClick={() => startCamera()} className="h-11 min-w-48 gap-2 font-semibold"><Video className="h-4 w-4 shrink-0" /> Start Camera Test</Button>
                </div>
              )}
              {error && (
                <div className="relative z-10 flex max-w-md flex-col items-center gap-5 px-6 text-center">
                  <div className="test-hero-icon border-status-fail/25 bg-status-fail/10 text-status-fail"><ShieldAlert className="h-8 w-8" /></div>
                  <div>
                    <h3 className="font-display text-lg font-bold">Camera unavailable</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{error}. Check browser permissions, then retry.</p>
                  </div>
                  <Button variant="outline" onClick={() => startCamera()} className="h-11 font-semibold">Retry Camera</Button>
                </div>
              )}
              <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={handleLoadedMetadata} className={`absolute inset-0 h-full w-full object-cover ${stream ? 'block' : 'hidden'}`} />
              {stream && (
                <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-white/15 bg-black/45 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-pass [animation:led-pulse_2s_ease-in-out_infinite]" /> Live preview
                </div>
              )}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MetricTile label="Stream" value={stream ? 'Active' : 'Idle'} accent={Boolean(stream)} />
              <MetricTile label="Resolution" value={videoInfo ? `${videoInfo.width}×${videoInfo.height}` : '—'} />
              <MetricTile label="Cameras" value={devices.length || '—'} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Device source" description="Choose the camera used for this preview." className="mb-5" />
              <label className="mb-2 block text-xs font-semibold text-foreground">Camera</label>
              <Select value={selectedDeviceId} onValueChange={handleDeviceChange} disabled={devices.length === 0}>
                <SelectTrigger className="h-11 bg-background/70 font-medium"><SelectValue placeholder="No camera detected" /></SelectTrigger>
                <SelectContent>
                  {devices.map((device, index) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="mt-5 space-y-3 border-t border-border/70 pt-4">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Aspect ratio</span><span className="readout-value text-xs">{videoInfo ? (videoInfo.width / videoInfo.height).toFixed(2) : '—'}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Permission</span><span className="readout-value text-xs">{error ? 'Denied' : stream ? 'Granted' : 'Pending'}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="instrument-panel">
            <CardContent className="p-5">
              <PanelHeading label="Privacy receipt" className="mb-4" />
              <div className="live-readout flex min-h-32 items-center justify-center p-4">
                {stream ? (
                  <div className="relative z-10 space-y-3 text-center"><Eye className="mx-auto h-5 w-5 text-primary" /><p className="font-mono text-xs font-semibold uppercase tracking-wide">Preview active</p><p className="text-xs text-muted-foreground">Video remains local to this tab.</p></div>
                ) : <WaitingReadout title="No stream" detail="Camera is currently off" />}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4 text-primary" /> Nothing recorded or transmitted</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}