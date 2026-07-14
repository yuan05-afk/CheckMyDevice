import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Info, Keyboard, Maximize2, Minimize2, ShieldCheck } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TestPageHeader } from '@/components/TestPageHeader';
import { TestStatusBadge } from '@/components/DiagnosticPrimitives';

type KeyDefinition = {
  code: string;
  label: string;
  span?: number;
};

type MainSlot = KeyDefinition | { spacer: true; span: number };
type PositionedKey = KeyDefinition & { column: number; row: number; columnSpan?: number; rowSpan?: number };
type KeyboardAccess = { lock?: (codes?: string[]) => Promise<void>; unlock?: () => void };

const key = (code: string, label: string, span = 2): KeyDefinition => ({ code, label, span });
const spacer = (span: number): MainSlot => ({ spacer: true, span });

const mainRows: MainSlot[][] = [
  [key('Escape', 'Esc'), spacer(1), key('F1', 'F1'), key('F2', 'F2'), key('F3', 'F3'), key('F4', 'F4'), spacer(1), key('F5', 'F5'), key('F6', 'F6'), key('F7', 'F7'), key('F8', 'F8'), spacer(1), key('F9', 'F9'), key('F10', 'F10'), key('F11', 'F11'), key('F12', 'F12'), spacer(1)],
  [key('Backquote', '`'), key('Digit1', '1'), key('Digit2', '2'), key('Digit3', '3'), key('Digit4', '4'), key('Digit5', '5'), key('Digit6', '6'), key('Digit7', '7'), key('Digit8', '8'), key('Digit9', '9'), key('Digit0', '0'), key('Minus', '-'), key('Equal', '='), key('Backspace', 'Backspace', 4)],
  [key('Tab', 'Tab', 3), key('KeyQ', 'Q'), key('KeyW', 'W'), key('KeyE', 'E'), key('KeyR', 'R'), key('KeyT', 'T'), key('KeyY', 'Y'), key('KeyU', 'U'), key('KeyI', 'I'), key('KeyO', 'O'), key('KeyP', 'P'), key('BracketLeft', '['), key('BracketRight', ']'), key('Backslash', '\\', 3)],
  [key('CapsLock', 'Caps', 4), key('KeyA', 'A'), key('KeyS', 'S'), key('KeyD', 'D'), key('KeyF', 'F'), key('KeyG', 'G'), key('KeyH', 'H'), key('KeyJ', 'J'), key('KeyK', 'K'), key('KeyL', 'L'), key('Semicolon', ';'), key('Quote', "'"), key('Enter', 'Enter', 4)],
  [key('ShiftLeft', 'Shift', 5), key('KeyZ', 'Z'), key('KeyX', 'X'), key('KeyC', 'C'), key('KeyV', 'V'), key('KeyB', 'B'), key('KeyN', 'N'), key('KeyM', 'M'), key('Comma', ','), key('Period', '.'), key('Slash', '/'), key('ShiftRight', 'Shift', 5)],
  [key('ControlLeft', 'Ctrl', 3), key('Fn', 'Fn', 2), key('MetaLeft', 'Win', 2), key('AltLeft', 'Alt', 3), key('Space', 'Space', 10), key('AltRight', 'Alt', 3), key('MetaRight', 'Win', 2), key('ContextMenu', 'Menu', 2), key('ControlRight', 'Ctrl', 3)],
];

const navigationRows: Array<Array<KeyDefinition | null>> = [
  [key('PrintScreen', 'PrtSc'), key('ScrollLock', 'ScrLk'), key('Pause', 'Pause')],
  [null, null, null],
  [key('Insert', 'Ins'), key('Home', 'Home'), key('PageUp', 'PgUp')],
  [key('Delete', 'Del'), key('End', 'End'), key('PageDown', 'PgDn')],
  [null, key('ArrowUp', '\u2191'), null],
  [key('ArrowLeft', '\u2190'), key('ArrowDown', '\u2193'), key('ArrowRight', '\u2192')],
];

const numpadKeys: PositionedKey[] = [
  { ...key('NumLock', 'Num'), column: 1, row: 2 },
  { ...key('NumpadDivide', '/'), column: 2, row: 2 },
  { ...key('NumpadMultiply', '*'), column: 3, row: 2 },
  { ...key('NumpadSubtract', '-'), column: 4, row: 2 },
  { ...key('Numpad7', '7'), column: 1, row: 3 },
  { ...key('Numpad8', '8'), column: 2, row: 3 },
  { ...key('Numpad9', '9'), column: 3, row: 3 },
  { ...key('NumpadAdd', '+'), column: 4, row: 3, rowSpan: 2 },
  { ...key('Numpad4', '4'), column: 1, row: 4 },
  { ...key('Numpad5', '5'), column: 2, row: 4 },
  { ...key('Numpad6', '6'), column: 3, row: 4 },
  { ...key('Numpad1', '1'), column: 1, row: 5 },
  { ...key('Numpad2', '2'), column: 2, row: 5 },
  { ...key('Numpad3', '3'), column: 3, row: 5 },
  { ...key('NumpadEnter', 'Enter'), column: 4, row: 5, rowSpan: 2 },
  { ...key('Numpad0', '0'), column: 1, row: 6, columnSpan: 2 },
  { ...key('NumpadDecimal', '.'), column: 3, row: 6 },
];

const allKeys = [
  ...mainRows.flatMap((row) => row.filter((slot): slot is KeyDefinition => !('spacer' in slot))),
  ...navigationRows.flatMap((row) => row.filter((slot): slot is KeyDefinition => slot !== null)),
  ...numpadKeys,
];

const testableCodes = new Set(allKeys.map(({ code }) => code));
const systemHandledCodes = new Set(['PrintScreen', 'MetaLeft', 'MetaRight', 'ContextMenu', 'Pause']);
const modifierCodes = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'Fn']);
const protectedCodes = new Set([...systemHandledCodes, 'Fn']);
const fnInferenceCodes = new Set([
  'AudioVolumeUp', 'AudioVolumeDown', 'AudioVolumeMute',
  'BrightnessUp', 'BrightnessDown', 'MediaTrackNext', 'MediaTrackPrevious',
  'MediaPlayPause', 'MediaStop', 'LaunchApplication1', 'LaunchApplication2',
  'KeyboardBacklightUp', 'KeyboardBacklightDown', 'KeyboardBacklightToggle',
]);

const LOCKED_KEY_CODES = [
  'PrintScreen', 'ScrollLock', 'Pause', 'MetaLeft', 'MetaRight', 'ContextMenu',
  'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Escape', 'Tab',
];

function resolveLayoutCode(event: KeyboardEvent): string | null {
  if (event.code === 'Fn' || event.key === 'Fn' || event.keyCode === 119) return 'Fn';
  if (testableCodes.has(event.code)) return event.code;
  return null;
}

function getKeyboardAccess() {
  return (navigator as Navigator & { keyboard?: KeyboardAccess }).keyboard;
}

function blockBrowserAction(event: KeyboardEvent) {
  if (protectedCodes.has(event.code) || event.code === 'Fn' || event.key === 'Fn') {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }
  if (event.cancelable) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function KeyboardKey({
  definition,
  tested,
  held,
  style,
}: {
  definition: KeyDefinition;
  tested: boolean;
  held?: boolean;
  style?: React.CSSProperties;
}) {
  const systemHandled = systemHandledCodes.has(definition.code);
  const fnKey = definition.code === 'Fn';
  return (
    <div
      className={`keyboard-key keycap ${tested ? 'is-tested' : ''} ${held ? 'is-held' : ''} ${systemHandled ? 'is-system-key' : ''} ${fnKey ? 'is-fn-key' : ''}`}
      style={style}
      title={`${definition.label} / ${definition.code}${systemHandled ? ' / May be reserved by the operating system' : ''}${fnKey ? ' / Hardware-level on many laptops; may not always register' : ''}`}
      data-key-code={definition.code}
      data-system-key={systemHandled || undefined}
    >
      {definition.label}
    </div>
  );
}

export function KeyboardTest() {
  const { results, setResult } = useTestContext();
  const [testedCodes, setTestedCodes] = useState<Set<string>>(new Set());
  const [heldCodes, setHeldCodes] = useState<Set<string>>(new Set());
  const [lastEvent, setLastEvent] = useState<{ key: string; code: string; blocked: boolean; repeated: boolean } | null>(null);
  const [pressCount, setPressCount] = useState(0);
  const [testModeActive, setTestModeActive] = useState(false);
  const [keyboardLockActive, setKeyboardLockActive] = useState(false);
  const [testModeMessage, setTestModeMessage] = useState('Protected mode starts automatically on your first key press.');
  const protectionAttemptedRef = useRef(false);

  const enableProtection = useCallback(async () => {
    if (protectionAttemptedRef.current) return;
    protectionAttemptedRef.current = true;

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }

      const keyboardAccess = getKeyboardAccess();
      if (keyboardAccess?.lock) {
        await keyboardAccess.lock(LOCKED_KEY_CODES);
        setKeyboardLockActive(true);
        setTestModeMessage('Protected mode is active. Win, Print Screen, and browser shortcuts are suppressed when possible. Hold Esc to exit fullscreen.');
      } else {
        setKeyboardLockActive(false);
        setTestModeMessage('Fullscreen is active. This browser does not support Keyboard Lock — some OS shortcuts may still fire.');
      }
      setTestModeActive(true);
    } catch {
      protectionAttemptedRef.current = false;
      setKeyboardLockActive(false);
      setTestModeMessage('Protected mode was unavailable. Click Start Test Mode or tap the keyboard to retry.');
      setTestModeActive(Boolean(document.fullscreenElement));
    }
  }, []);

  const disableProtection = useCallback(async () => {
    getKeyboardAccess()?.unlock?.();
    setKeyboardLockActive(false);
    protectionAttemptedRef.current = false;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setTestModeActive(false);
    setTestModeMessage('Protected mode ended. Press any key or click Start Test Mode to re-enable.');
  }, []);

  const registerKeyActivity = useCallback((event: KeyboardEvent) => {
    const layoutCode = resolveLayoutCode(event);
    const displayCode = layoutCode ?? event.code;

    setLastEvent({
      key: event.key,
      code: displayCode || 'Unavailable',
      blocked: event.defaultPrevented || protectedCodes.has(event.code) || layoutCode === 'Fn',
      repeated: event.repeat,
    });

    if (!event.repeat) setPressCount((previous) => previous + 1);

    if (layoutCode && modifierCodes.has(layoutCode)) {
      setHeldCodes((previous) => new Set(previous).add(layoutCode));
    }

    if (layoutCode) {
      setTestedCodes((previous) => new Set(previous).add(layoutCode));
    }

    if (fnInferenceCodes.has(event.code)) {
      setTestedCodes((previous) => new Set(previous).add('Fn'));
      setHeldCodes((previous) => new Set(previous).add('Fn'));
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    blockBrowserAction(event);
    void enableProtection();
    registerKeyActivity(event);
  }, [enableProtection, registerKeyActivity]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    blockBrowserAction(event);
    const layoutCode = resolveLayoutCode(event);
    if (layoutCode && modifierCodes.has(layoutCode)) {
      setHeldCodes((previous) => {
        const next = new Set(previous);
        next.delete(layoutCode);
        return next;
      });
    }
    if (fnInferenceCodes.has(event.code)) {
      setHeldCodes((previous) => {
        const next = new Set(previous);
        next.delete('Fn');
        return next;
      });
    }
  }, []);

  useEffect(() => {
    const clearHeldKeys = () => setHeldCodes(new Set());
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', clearHeldKeys);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', clearHeldKeys);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setTestModeActive(active);
      if (!active) {
        getKeyboardAccess()?.unlock?.();
        setKeyboardLockActive(false);
        setTestModeMessage('Protected mode ended. Press any key or click Start Test Mode to re-enable.');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      getKeyboardAccess()?.unlock?.();
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      }
    };
  }, []);

  const toggleTestMode = useCallback(async () => {
    if (document.fullscreenElement) {
      await disableProtection();
      return;
    }
    protectionAttemptedRef.current = false;
    await enableProtection();
  }, [disableProtection, enableProtection]);

  const totalKeys = testableCodes.size;
  const testedCount = useMemo(() => [...testedCodes].filter((code) => testableCodes.has(code)).length, [testedCodes]);
  const progress = Math.round((testedCount / totalKeys) * 100);
  const modifierState = [
    { label: 'Shift', active: heldCodes.has('ShiftLeft') || heldCodes.has('ShiftRight') },
    { label: 'Ctrl', active: heldCodes.has('ControlLeft') || heldCodes.has('ControlRight') },
    { label: 'Alt', active: heldCodes.has('AltLeft') || heldCodes.has('AltRight') },
    { label: 'Fn', active: heldCodes.has('Fn') },
    { label: 'System', active: heldCodes.has('MetaLeft') || heldCodes.has('MetaRight') },
  ];

  const isKeyHeld = (code: string) => heldCodes.has(code);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="test-page mx-auto flex w-full max-w-[90rem] flex-col">
      <TestPageHeader
        testId="T-01"
        title="Keyboard"
        description="Test a full-size keyboard, including navigation keys, left/right modifiers, Fn, and the numpad."
        onMarkIssue={() => setResult('keyboard', 'issue')}
        onMarkWorking={() => setResult('keyboard', 'working')}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="instrument-panel">
          <CardContent className="p-4 sm:p-5">
            <h2 className="panel-label">Held modifiers</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {modifierState.map((modifier) => (
                <div
                  key={modifier.label}
                  className={`metric-tile flex items-center justify-between gap-2 p-3 ${modifier.active ? 'border-primary/40 bg-primary/5' : ''}`}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">{modifier.label}</span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${modifier.active ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/.7)]' : 'bg-status-idle'}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="instrument-panel">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="panel-label">Protected keys</h2>
              <ShieldCheck className={`h-4 w-4 shrink-0 ${testModeActive && keyboardLockActive ? 'text-status-pass' : 'text-primary'}`} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Win and Print Screen are blocked in protected mode so testing does not trigger screenshots or the Start menu.
            </p>
            <Button className="mt-3 w-full gap-2" variant={testModeActive ? 'outline' : 'default'} onClick={toggleTestMode}>
              {testModeActive ? <Minimize2 className="h-4 w-4 shrink-0" /> : <Maximize2 className="h-4 w-4 shrink-0" />}
              {testModeActive ? 'Exit Test Mode' : 'Start Test Mode'}
            </Button>
            <p className={`mt-2 font-mono text-[10px] leading-relaxed ${testModeActive ? 'text-status-pass' : 'text-muted-foreground'}`}>{testModeMessage}</p>
          </CardContent>
        </Card>

        <Card className="instrument-panel">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="panel-label">Result</span>
              <TestStatusBadge status={results.keyboard} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="metric-tile p-4">
                <span className="spec-item">Verified</span>
                <div className="readout-value mt-2 text-xl text-primary">{testedCount}</div>
              </div>
              <div className="metric-tile p-4">
                <span className="spec-item">Remaining</span>
                <div className="readout-value mt-2 text-xl">{totalKeys - testedCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="instrument-panel min-w-0">
          <CardContent className="p-3 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="panel-label">Full-size layout</h2>
                <p className="mt-2 text-sm text-muted-foreground">Each physical key code is counted once and lights independently.</p>
              </div>
              <div className="metric-tile flex shrink-0 items-center gap-2 px-3 py-2">
                <Keyboard className="h-4 w-4 text-primary" />
                <span className="readout-value text-xs tabular-nums">{testedCount} / {totalKeys}</span>
              </div>
            </div>

            <div
              className="full-keyboard rounded-xl border border-border/70 bg-secondary/25 p-2 sm:p-3"
              aria-label="Full-size keyboard test layout"
              onPointerDown={() => { void enableProtection(); }}
            >
              <div className="keyboard-main-grid">
                {mainRows.map((row, rowIndex) => (
                  <div className="keyboard-main-row" key={rowIndex}>
                    {row.map((slot, slotIndex) => 'spacer' in slot
                      ? <span key={`spacer-${slotIndex}`} style={{ gridColumn: `span ${slot.span}` }} aria-hidden="true" />
                      : (
                        <KeyboardKey
                          key={slot.code}
                          definition={slot}
                          tested={testedCodes.has(slot.code)}
                          held={isKeyHeld(slot.code)}
                          style={{ gridColumn: `span ${slot.span || 2}` }}
                        />
                      ))}
                  </div>
                ))}
              </div>

              <div className="keyboard-navigation-grid">
                {navigationRows.flatMap((row, rowIndex) => row.map((definition, columnIndex) => definition
                  ? (
                    <KeyboardKey
                      key={definition.code}
                      definition={definition}
                      tested={testedCodes.has(definition.code)}
                      held={isKeyHeld(definition.code)}
                      style={{ gridColumn: columnIndex + 1, gridRow: rowIndex + 1 }}
                    />
                  )
                  : <span key={`nav-spacer-${rowIndex}-${columnIndex}`} style={{ gridColumn: columnIndex + 1, gridRow: rowIndex + 1 }} aria-hidden="true" />))}
              </div>

              <div className="keyboard-numpad-grid">
                {numpadKeys.map((definition) => (
                  <KeyboardKey
                    key={definition.code}
                    definition={definition}
                    tested={testedCodes.has(definition.code)}
                    held={isKeyHeld(definition.code)}
                    style={{
                      gridColumn: `${definition.column} / span ${definition.columnSpan || 1}`,
                      gridRow: `${definition.row} / span ${definition.rowSpan || 1}`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-lg border border-border/60 bg-background/55 px-4 py-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="font-mono text-[10px] font-medium tabular-nums text-muted-foreground">{progress}% VERIFIED</span>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Dashed keys are reserved by the OS when protected mode is off. Fn is hardware-level on many laptops — it highlights when detected or when an Fn-layer media key fires. Protected mode suppresses Win and Print Screen inside the browser when supported.
            </div>
          </CardContent>
        </Card>

        <aside className="min-w-0 xl:sticky xl:top-20">
          <Card className="instrument-panel">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="panel-label">Live output</h2>
                <span className="signal-status-dot" />
              </div>
              <div className="live-readout min-h-44 p-5">
                {lastEvent ? (
                  <div className="relative z-10 grid gap-4">
                    <div>
                      <span className="spec-item mb-1 block">Key value</span>
                      <div className="readout-value truncate text-2xl">{lastEvent.key === ' ' ? 'Space' : lastEvent.key}</div>
                    </div>
                    <div className="border-t border-border/70 pt-4">
                      <span className="spec-item mb-1 block">Physical code</span>
                      <div className="readout-value truncate text-sm text-primary">{lastEvent.code || 'Unavailable'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
                      <div>
                        <span className="spec-item mb-1 block">Presses</span>
                        <div className="readout-value text-xl">{pressCount}</div>
                      </div>
                      <div>
                        <span className="spec-item mb-1 block">Action</span>
                        <div className={`font-mono text-[11px] font-semibold ${lastEvent.blocked ? 'text-status-pass' : 'text-status-warn'}`}>
                          {lastEvent.repeated ? 'HELD' : lastEvent.blocked ? 'CAPTURED' : 'OS OWNED'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 flex min-h-32 flex-col items-center justify-center gap-3 text-center">
                    <Activity className="h-6 w-6 text-primary/55" />
                    <div>
                      <p className="font-mono text-xs font-medium text-foreground">AWAITING INPUT</p>
                      <p className="mt-1 text-xs text-muted-foreground">Press any key to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </motion.div>
  );
}
