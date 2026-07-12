import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion, useReducedMotion } from 'framer-motion';
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

/* ─── Scrolling EKG trace ──────────────────────────
   Two identical 1440-wide patterns side-by-side (2880 total).
   CSS scrolls left by 50% (one pattern width) then loops seamlessly.
──────────────────────────────────────────────────── */
const ONE_CYCLE =
  'M0,30 L110,30 L120,30 L128,4 L135,56 L142,30 ' +
  'L260,30 L268,30 L272,37 L276,23 L280,30 ' +
  'L440,30 L450,30 L458,6 L465,54 L472,30 ' +
  'L640,30 L646,30 L650,35 L654,25 L658,30 ' +
  'L850,30 L860,30 L868,5 L876,55 L884,30 ' +
  'L1060,30 L1066,30 L1070,36 L1074,24 L1078,30 ' +
  'L1440,30';

function shiftPath(d: string, dx: number): string {
  return d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, x, y) =>
    `${parseFloat(x) + dx},${y}`
  );
}

const TRACE_D = ONE_CYCLE + ' ' + shiftPath(ONE_CYCLE, 1440).replace('M1440,30', 'L1440,30');

function ScrollingTrace() {
  const shouldReduce = useReducedMotion();
  return (
    <div className="w-full overflow-hidden" style={{ height: 56 }} aria-hidden="true">
      <svg
        viewBox="0 0 2880 56"
        preserveAspectRatio="none"
        style={{
          width: '200%',
          height: '100%',
          ...(shouldReduce
            ? {}
            : { animation: 'trace-scroll 10s linear infinite' }),
        }}
      >
        <path
          d={TRACE_D}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary"
          opacity="0.45"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ─── Animated headline ────────────────────────────
   Each word blurs in from below with stagger.
──────────────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1] as const;

function AnimatedWord({ word, delay, last }: { word: string; delay: number; last?: boolean }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.span
      className="inline-block"
      style={{ marginRight: last ? 0 : '0.28em' }}
      initial={shouldReduce ? {} : { opacity: 0, y: 18, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.55, ease: EASE }}
    >
      {word}
    </motion.span>
  );
}

function AnimatedHeadline() {
  const line1 = ['Know', 'your', 'device.'];
  const line2 = ['Trust', 'your', 'hardware.'];
  const BASE = 0.25;
  const STEP = 0.085;

  return (
    <h1
      className="text-[clamp(2.8rem,6.5vw,5.2rem)] font-bold leading-[1.06] tracking-tight mb-6 text-foreground"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <span className="block">
        {line1.map((w, i) => (
          <AnimatedWord key={i} word={w} delay={BASE + i * STEP} />
        ))}
      </span>
      <span className="block relative">
        {line2.map((w, i) => (
          <AnimatedWord
            key={i}
            word={w}
            delay={BASE + (line1.length + i) * STEP}
            last={i === line2.length - 1}
          />
        ))}
        {/* Underline draws after last word */}
        <motion.span
          className="absolute -bottom-1 left-0 h-[2.5px] rounded-full bg-primary block"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: BASE + (line1.length + line2.length) * STEP + 0.1, duration: 0.6, ease: EASE }}
          aria-hidden="true"
        />
      </span>
    </h1>
  );
}

/* ─── Spec strip ────────────────────────────────── */
const specs = [
  { label: 'LOCAL EXECUTION', value: '100%' },
  { label: 'PERMISSIONS', value: 'ON REQUEST' },
  { label: 'DATA COLLECTED', value: '0 BYTES' },
  { label: 'RESULTS', value: 'INSTANT' },
];

/* ─── Test modules ──────────────────────────────── */
const modules = [
  { id: 'keyboard',   num: 'T-01', label: 'KEYBOARD', title: 'Keyboard',        icon: Keyboard,     desc: 'Live QWERTY visualizer tracks every key — including modifiers and the numpad.' },
  { id: 'mouse',      num: 'T-02', label: 'MOUSE',    title: 'Mouse & Trackpad', icon: MousePointer2, desc: 'Canvas trail plots movement, clicks, scroll delta, and button mapping.' },
  { id: 'camera',     num: 'T-03', label: 'CAMERA',   title: 'Camera',           icon: Camera,       desc: 'Live preview with resolution readout and multi-source device switching.' },
  { id: 'microphone', num: 'T-04', label: 'MIC',      title: 'Microphone',       icon: Mic,          desc: 'Web Audio waveform oscilloscope and peak-level meter, updated in real time.' },
  { id: 'speaker',    num: 'T-05', label: 'SPEAKER',  title: 'Speaker & Audio',  icon: Volume2,      desc: 'Verify left channel, right channel, and stereo balance with generated tones.' },
  { id: 'display',    num: 'T-06', label: 'DISPLAY',  title: 'Display & Color',  icon: Monitor,      desc: 'Full-screen color patterns and sharpness grids to reveal dead or stuck pixels.' },
  { id: 'battery',    num: 'T-07', label: 'BATTERY',  title: 'Battery',          icon: Battery,      desc: 'Live charge percentage, charging state, and estimated time remaining.' },
  { id: 'network',    num: 'T-08', label: 'NETWORK',  title: 'Network',          icon: Wifi,         desc: 'Connection type, online status, and an in-browser download speed estimate.' },
  { id: 'sensors',    num: 'T-09', label: 'SENSORS',  title: 'Sensors & Touch',  icon: Smartphone,   desc: 'Gyroscope, accelerometer axes, and a multi-touch canvas tracking every contact.' },
];

/* ─── Privacy meter ─────────────────────────────── */
const privacyItems = [
  { label: 'DATA TRANSMITTED', value: '0 KB' },
  { label: 'EXTERNAL CALLS',   value: '0' },
  { label: 'ACCOUNTS REQUIRED', value: 'NONE' },
  { label: 'STORAGE',           value: 'localStorage ONLY' },
];

/* ─── Page ──────────────────────────────────────── */
export function LandingPage() {
  const { theme, setTheme } = useTheme();
  const shouldReduce = useReducedMotion();

  const fadeUp = (delay: number) =>
    shouldReduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.5, ease: EASE },
        };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans antialiased selection:bg-primary/15 selection:text-primary">

      {/* ── Nav ────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl px-6 h-[58px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-primary" strokeWidth={2} />
            <span className="text-foreground font-semibold tracking-tight leading-none" style={{ fontFamily: 'var(--font-display)' }}>
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
        <section className="relative overflow-hidden pt-28 pb-0 md:pt-40">
          <div className="container mx-auto max-w-4xl px-6 text-center">
            {/* Headline with word animation */}
            <AnimatedHeadline />

            <motion.p
              {...fadeUp(0.75)}
              className="text-[1rem] md:text-[1.1rem] text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed"
            >
              Nine hardware tests. No accounts, no plugins, no data collection.
              Open the page, run the tests, trust the results.
            </motion.p>

            <motion.div {...fadeUp(0.88)} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
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
                size="lg"
                className="gap-2 px-7 h-11 text-sm font-medium w-full sm:w-auto bg-background border-2 border-border text-foreground hover:bg-secondary hover:border-primary/30 shadow-sm"
                data-testid="landing-results-btn"
              >
                <Link href="/results">View Results</Link>
              </Button>
            </motion.div>
          </div>

          {/* Scrolling trace — sits BELOW the text as a visual divider */}
          <ScrollingTrace />
        </section>

        {/* ── Spec strip ───────────────────────── */}
        <div className="border-y border-border py-4 overflow-x-auto bg-card/30">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="flex items-center justify-center md:justify-between gap-6 min-w-max md:min-w-0 mx-auto md:mx-0">
              {specs.map((spec, i) => (
                <div key={spec.label} className="flex items-center gap-6">
                  <div className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
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
              <p className="text-muted-foreground text-[0.92rem] max-w-md">
                Each module runs against native browser APIs — no plugins or extensions required.
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
                    transition={{ delay: (i % 3) * 0.07, duration: 0.45, ease: EASE }}
                  >
                    <Link href={`/test/${mod.id}`} data-testid={`landing-feature-${mod.id}`}>
                      <div
                        className="group relative p-5 rounded-lg border border-border bg-card cursor-pointer overflow-hidden flex flex-col gap-4 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                        onMouseEnter={e => { if (!shouldReduce) e.currentTarget.style.transform = 'translateY(-4px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        {/* Header: ID + icon */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="block w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" aria-hidden="true" />
                            <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground select-none">
                              {mod.num} {mod.label}
                            </span>
                          </div>
                          <div className="p-2 rounded-md bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                            <Icon className="w-4 h-4" strokeWidth={1.5} />
                          </div>
                        </div>

                        {/* Title + desc */}
                        <div>
                          <h3
                            className="font-semibold text-[0.95rem] text-foreground group-hover:text-primary transition-colors duration-200 mb-1"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {mod.title}
                          </h3>
                          <p className="text-[0.8rem] text-muted-foreground leading-relaxed">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-center">
              <Button asChild size="lg" className="gap-2 px-8 h-11 text-sm font-semibold" data-testid="landing-cta-bottom">
                <Link href="/dashboard">
                  Run all 9 tests <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Privacy meter ────────────────────── */}
        <div className="border-t border-border py-5 bg-card/20" role="complementary" aria-label="Privacy status">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 justify-center">
              {privacyItems.map((item, i) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{item.label}</span>
                  <span className="font-mono text-[10px] tracking-widest text-primary font-medium uppercase">{item.value}</span>
                  {i < privacyItems.length - 1 && (
                    <span className="hidden sm:block w-px h-3 bg-border ml-2" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="container mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" strokeWidth={2} />
            <span className="text-sm font-semibold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
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
