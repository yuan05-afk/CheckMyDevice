import { useRef, useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Activity,
  Keyboard,
  MousePointer2,
  Camera,
  Mic,
  Volume2,
  Monitor,
  Battery,
  Wifi,
  Smartphone,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Signal Trace ─────────────────────────────────────────────── */
// EKG / oscilloscope path spanning full hero width
const TRACE_D =
  'M0,60 L60,60 L75,60 L82,12 L88,108 L94,60 L160,60 ' +
  'L168,60 L172,72 L176,48 L180,60 L260,60 ' +
  'L270,60 L278,8 L285,112 L292,60 L380,60 ' +
  'L388,60 L392,68 L396,52 L400,60 L510,60 ' +
  'L520,60 L528,15 L535,105 L542,60 L640,60 ' +
  'L648,60 L652,70 L656,50 L660,60 L780,60 ' +
  'L790,60 L797,18 L804,102 L811,60 L920,60 ' +
  'L928,60 L932,66 L936,54 L940,60 L1060,60 ' +
  'L1070,60 L1077,20 L1084,100 L1091,60 L1200,60 ' +
  'L1210,60 L1214,64 L1218,56 L1222,60 L1440,60';

function SignalTrace({ visible }: { visible: boolean }) {
  const shouldReduce = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(2000);

  useEffect(() => {
    if (pathRef.current) {
      setLen(pathRef.current.getTotalLength());
    }
  }, []);

  return (
    <svg
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-28 pointer-events-none"
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={TRACE_D}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary"
        style={
          shouldReduce
            ? { opacity: 0.25 }
            : {
                strokeDasharray: len,
                strokeDashoffset: visible ? 0 : len,
                transition: `stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)`,
                animation: visible ? `trace-pulse 4s ease-in-out 1.6s infinite` : 'none',
                opacity: 0.55,
              }
        }
      />
    </svg>
  );
}

/* ─── Spec strip ───────────────────────────────────────────────── */
const specs = [
  { label: 'LOCAL EXECUTION', value: '100%' },
  { label: 'PERMISSIONS', value: 'ON REQUEST' },
  { label: 'DATA COLLECTED', value: '0 BYTES' },
  { label: 'RESULTS', value: 'INSTANT' },
];

/* ─── Test modules ─────────────────────────────────────────────── */
const modules = [
  {
    id: 'keyboard', num: 'T-01', label: 'KEYBOARD', title: 'Keyboard',
    icon: Keyboard,
    desc: 'Live QWERTY visualizer tracks every key — including modifiers and the numpad.',
    preview: <KeyboardPreview />,
  },
  {
    id: 'mouse', num: 'T-02', label: 'MOUSE', title: 'Mouse & Trackpad',
    icon: MousePointer2,
    desc: 'Canvas trail plots movement, click detection, scroll delta, and button mapping.',
    preview: <MousePreview />,
  },
  {
    id: 'camera', num: 'T-03', label: 'CAMERA', title: 'Camera',
    icon: Camera,
    desc: 'Live preview with resolution readout and multi-source device switching.',
    preview: <CameraPreview />,
  },
  {
    id: 'microphone', num: 'T-04', label: 'MIC', title: 'Microphone',
    icon: Mic,
    desc: 'Web Audio waveform oscilloscope and peak-level meter, updated in real time.',
    preview: <MicPreview />,
  },
  {
    id: 'speaker', num: 'T-05', label: 'SPEAKER', title: 'Speaker & Audio',
    icon: Volume2,
    desc: 'Verify left channel, right channel, and stereo balance with generated tones.',
    preview: <SpeakerPreview />,
  },
  {
    id: 'display', num: 'T-06', label: 'DISPLAY', title: 'Display & Color',
    icon: Monitor,
    desc: 'Full-screen color patterns and sharpness grids to reveal dead or stuck pixels.',
    preview: <DisplayPreview />,
  },
  {
    id: 'battery', num: 'T-07', label: 'BATTERY', title: 'Battery',
    icon: Battery,
    desc: 'Live charge percentage, charging state, and estimated time remaining.',
    preview: <BatteryPreview />,
  },
  {
    id: 'network', num: 'T-08', label: 'NETWORK', title: 'Network',
    icon: Wifi,
    desc: 'Connection type, online status, and an in-browser download speed estimate.',
    preview: <NetworkPreview />,
  },
  {
    id: 'sensors', num: 'T-09', label: 'SENSORS', title: 'Sensors & Touch',
    icon: Smartphone,
    desc: 'Gyroscope, accelerometer axes, and a multi-touch canvas tracking every contact.',
    preview: <SensorsPreview />,
  },
];

/* ─── Inline hover preview components ─────────────────────────── */
function KeyboardPreview() {
  return (
    <svg viewBox="0 0 56 36" className="w-14 h-9" aria-hidden="true">
      {[
        [4,4,10,10],[16,4,10,10],[28,4,10,10],[40,4,10,10],
        [4,18,10,10],[16,18,22,10],[40,18,10,10],
      ].map(([x,y,w,h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="1.5"
          fill="currentColor" className="text-primary"
          style={{ opacity: 0.15 + (i % 3) * 0.25,
            animation: `trace-pulse ${1.2 + i*0.2}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s` }} />
      ))}
    </svg>
  );
}

function MousePreview() {
  return (
    <svg viewBox="0 0 56 56" className="w-14 h-14" aria-hidden="true">
      <path d="M8,48 Q20,30 28,20 T44,8" fill="none" stroke="currentColor"
        className="text-primary" strokeWidth="1.5" strokeLinecap="round"
        style={{ strokeDasharray: 70, strokeDashoffset: 70,
          animation: 'trace-draw 1s cubic-bezier(0.22,1,0.36,1) forwards infinite',
          animationDelay: '0s' }} />
      <circle cx="44" cy="8" r="3" fill="currentColor" className="text-primary" />
    </svg>
  );
}

function CameraPreview() {
  return (
    <svg viewBox="0 0 56 56" className="w-14 h-14" aria-hidden="true">
      <circle cx="28" cy="28" r="18" fill="none" stroke="currentColor"
        className="text-primary" strokeWidth="1" opacity="0.3" />
      <circle cx="28" cy="28" r="10" fill="none" stroke="currentColor"
        className="text-primary" strokeWidth="1" opacity="0.5" />
      <circle cx="28" cy="28" r="4" fill="currentColor" className="text-primary" />
      <line x1="10" y1="28" x2="46" y2="28" stroke="currentColor"
        className="text-primary" strokeWidth="1" opacity="0.5"
        style={{ animation: 'trace-pulse 1.5s ease-in-out infinite' }} />
    </svg>
  );
}

function MicPreview() {
  const bars = [4, 8, 14, 10, 18, 12, 6, 16, 8, 12, 5, 14];
  return (
    <svg viewBox="0 0 56 36" className="w-14 h-9" aria-hidden="true">
      {bars.map((h, i) => (
        <rect key={i} x={i * 4 + 2} y={(36 - h) / 2} width="2.5" height={h} rx="1"
          fill="currentColor" className="text-primary"
          style={{ opacity: 0.4 + (i % 3) * 0.2,
            animation: `trace-pulse ${0.8 + (i % 4) * 0.15}s ease-in-out infinite`,
            animationDelay: `${i * 0.07}s` }} />
      ))}
    </svg>
  );
}

function SpeakerPreview() {
  return (
    <svg viewBox="0 0 56 56" className="w-14 h-14" aria-hidden="true">
      {[8, 14, 20].map((r, i) => (
        <circle key={i} cx="28" cy="28" r={r} fill="none"
          stroke="currentColor" className="text-primary"
          strokeWidth="1.5"
          style={{ opacity: 0.6 - i * 0.15,
            animation: `led-pulse ${1 + i * 0.4}s ease-out infinite`,
            animationDelay: `${i * 0.3}s` }} />
      ))}
      <circle cx="28" cy="28" r="4" fill="currentColor" className="text-primary" />
    </svg>
  );
}

function DisplayPreview() {
  const colors = ['#FF4444', '#44BB66', '#4488FF', '#F5F5F5', '#111111'];
  return (
    <svg viewBox="0 0 56 36" className="w-14 h-9 rounded overflow-hidden" aria-hidden="true">
      {colors.map((c, i) => (
        <rect key={i} x={i * 11.2} y="0" width="11.2" height="36" fill={c}
          style={{ opacity: 0.6 + (i === 2 ? 0.3 : 0) }} />
      ))}
    </svg>
  );
}

function BatteryPreview() {
  return (
    <svg viewBox="0 0 56 36" className="w-14 h-9" aria-hidden="true">
      <rect x="4" y="8" width="42" height="20" rx="3" fill="none"
        stroke="currentColor" className="text-primary" strokeWidth="1.5" />
      <rect x="46" y="14" width="4" height="8" rx="1" fill="currentColor"
        className="text-primary" opacity="0.5" />
      <rect x="6" y="10" width="0" height="16" rx="1.5" fill="currentColor"
        className="text-primary" opacity="0.8"
        style={{ animation: 'none',
          width: '36px',
          clipPath: 'inset(0)' }} />
      <rect x="6" y="10" width="28" height="16" rx="1.5" fill="currentColor"
        className="text-primary" opacity="0.8" />
    </svg>
  );
}

function NetworkPreview() {
  return (
    <svg viewBox="0 0 56 40" className="w-14 h-10" aria-hidden="true">
      {[0,1,2,3].map((i) => (
        <rect key={i}
          x={8 + i * 12} y={32 - i * 8} width="8" height={8 + i * 8} rx="1"
          fill="currentColor" className="text-primary"
          style={{ opacity: 0.25 + i * 0.2,
            animation: `trace-pulse ${0.8 + i * 0.2}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s` }} />
      ))}
    </svg>
  );
}

function SensorsPreview() {
  return (
    <svg viewBox="0 0 56 56" className="w-14 h-14" aria-hidden="true">
      <circle cx="28" cy="28" r="20" fill="none" stroke="currentColor"
        className="text-primary" strokeWidth="1" opacity="0.25" />
      <line x1="28" y1="8" x2="28" y2="28" stroke="currentColor"
        className="text-primary" strokeWidth="2" strokeLinecap="round"
        style={{ transformOrigin: '28px 28px',
          animation: 'spin 2s linear infinite' }} />
      <circle cx="28" cy="28" r="3" fill="currentColor" className="text-primary" />
    </svg>
  );
}

/* ─── Privacy meter ─────────────────────────────────────────────── */
function PrivacyMeter() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const labels = [
    { key: 'DATA TRANSMITTED', val: '0 KB' },
    { key: 'REQUESTS MADE', val: '0' },
    { key: 'EXTERNAL CALLS', val: '0' },
    { key: 'STORAGE', val: 'localStorage ONLY' },
  ];

  return (
    <div className="border-t border-border py-5 bg-background" aria-label="Privacy readout">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 justify-center">
          {labels.map((item, i) => (
            <div key={item.key} className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                {item.key}
              </span>
              <span className="font-mono text-[10px] tracking-widest text-primary font-medium uppercase">
                {item.val}
              </span>
              {i < labels.length - 1 && (
                <span className="hidden sm:block w-px h-3 bg-border ml-4" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Custom easing ─────────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1] as const;

/* ─── Page ──────────────────────────────────────────────────────── */
export function LandingPage() {
  const { theme, setTheme } = useTheme();
  const shouldReduce = useReducedMotion();
  const [traceVisible, setTraceVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTraceVisible(true), 80);
    return () => clearTimeout(id);
  }, []);

  const fadeUp = (delay: number) =>
    shouldReduce
      ? { initial: {}, animate: {}, transition: {} }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.55, ease: EASE },
        };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans antialiased selection:bg-primary/15 selection:text-primary">

      {/* ── Nav ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl px-6 h-[58px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-primary" strokeWidth={2} />
            <span
              className="text-foreground font-semibold tracking-tight leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              CheckMyDevice
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              data-testid="landing-theme-toggle"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button asChild size="sm" className="h-8 px-4 text-sm font-medium" data-testid="landing-cta-nav">
              <Link href="/dashboard">Open Diagnostics</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────── */}
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28">
          {/* Signal trace — drawn first, persists as ambient element */}
          <SignalTrace visible={traceVisible} />

          <div className="container mx-auto max-w-4xl px-6 text-center relative z-10">
            <motion.div {...fadeUp(0.2)}>
              <h1
                className="text-[clamp(2.6rem,6vw,5rem)] font-bold leading-[1.04] tracking-tight mb-6 text-foreground"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Know your device.{' '}
                <span className="relative inline-block">
                  Trust your hardware.
                  {/* Animated underline */}
                  <motion.span
                    className="absolute bottom-0.5 left-0 h-[2px] rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: traceVisible ? '100%' : 0 }}
                    transition={{ delay: 1.5, duration: 0.65, ease: EASE }}
                    aria-hidden="true"
                  />
                </span>
              </h1>
            </motion.div>

            <motion.p
              {...fadeUp(0.38)}
              className="text-[1.05rem] md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
            >
              Nine hardware tests. No accounts, no plugins, no data collection.
              Open the page, run the tests, trust the results.
            </motion.p>

            <motion.div {...fadeUp(0.52)} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="gap-2 px-7 h-11 text-sm font-semibold w-full sm:w-auto"
                data-testid="landing-cta-hero"
              >
                <Link href="/dashboard">
                  Start Diagnostics <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="gap-2 px-7 h-11 text-sm font-medium w-full sm:w-auto"
                data-testid="landing-results-btn"
              >
                <Link href="/results">View Results</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ── Spec strip ───────────────────────── */}
        <div className="border-y border-border py-4 overflow-x-auto">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="flex items-center justify-center md:justify-between gap-6 min-w-max md:min-w-0 mx-auto md:mx-0">
              {specs.map((spec, i) => (
                <div key={spec.label} className="flex items-center gap-6">
                  <div className="spec-item">
                    {spec.label}
                    <span className="mx-2 text-primary" aria-hidden="true">—</span>
                    <span className="text-foreground font-medium">{spec.value}</span>
                  </div>
                  {i < specs.length - 1 && (
                    <span className="block w-px h-3.5 bg-border flex-shrink-0" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Test modules ─────────────────────── */}
        <section className="py-24" aria-labelledby="modules-heading">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="mb-16">
              <h2
                id="modules-heading"
                className="text-3xl md:text-[2.4rem] font-bold tracking-tight leading-tight mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Test modules
              </h2>
              <p className="text-muted-foreground text-[0.95rem] max-w-lg">
                Each module runs directly against native browser APIs — no plugins or extensions required.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.id}
                    initial={shouldReduce ? {} : { opacity: 0, y: 14 }}
                    whileInView={shouldReduce ? {} : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ delay: (i % 3) * 0.08, duration: 0.45, ease: EASE }}
                  >
                    <Link href={`/test/${mod.id}`} data-testid={`landing-feature-${mod.id}`}>
                      <div
                        className="group relative p-6 rounded-lg border border-border bg-card cursor-pointer overflow-hidden h-full flex flex-col gap-5 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                        style={{
                          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                        onMouseEnter={(e) =>
                          !shouldReduce &&
                          (e.currentTarget.style.transform = 'translateY(-4px)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = 'translateY(0)')
                        }
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {/* Status LED */}
                            <span
                              className="block w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: 'var(--color-status-idle)' }}
                              aria-hidden="true"
                            />
                            {/* Monospace ID */}
                            <span
                              className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground select-none"
                            >
                              {mod.num} {mod.label}
                            </span>
                          </div>

                          {/* Hover preview — slides in from right */}
                          <div
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-primary"
                            aria-hidden="true"
                          >
                            {mod.preview}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" strokeWidth={1.5} />
                            <h3
                              className="font-semibold text-foreground text-[0.95rem] group-hover:text-primary transition-colors duration-200"
                              style={{ fontFamily: 'var(--font-display)' }}
                            >
                              {mod.title}
                            </h3>
                          </div>
                          <p className="text-[0.82rem] text-muted-foreground leading-relaxed">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-14 flex justify-center">
              <Button asChild size="lg" className="gap-2 px-8 h-11 text-sm font-semibold" data-testid="landing-cta-bottom">
                <Link href="/dashboard">
                  Run all 9 tests <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Privacy meter ─────────────────── */}
        <PrivacyMeter />
      </main>

      {/* ── Footer ──────────────────────────── */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="container mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" strokeWidth={2} />
            <span
              className="text-sm font-semibold text-foreground tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              CheckMyDevice
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Some tests require browser permissions. Results may vary by browser and platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
