import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Info, Keyboard } from 'lucide-react';
import { useTestContext } from '@/context/TestContext';
import { Card, CardContent } from '@/components/ui/card';
import { TestPageHeader } from '@/components/TestPageHeader';
import { TestStatusBadge } from '@/components/DiagnosticPrimitives';

type KeyDefinition = {
  code: string;
  label: string;
  span?: number;
};

type MainSlot = KeyDefinition | { spacer: true; span: number };
type PositionedKey = KeyDefinition & { column: number; row: number; columnSpan?: number; rowSpan?: number };
type RecentKey = { label: string; code: string; timestamp: number };

const key = (code: string, label: string, span = 2): KeyDefinition => ({ code, label, span });
const spacer = (span: number): MainSlot => ({ spacer: true, span });

const mainRows: MainSlot[][] = [
  [key('Escape', 'Esc'), spacer(1), key('F1', 'F1'), key('F2', 'F2'), key('F3', 'F3'), key('F4', 'F4'), spacer(1), key('F5', 'F5'), key('F6', 'F6'), key('F7', 'F7'), key('F8', 'F8'), spacer(1), key('F9', 'F9'), key('F10', 'F10'), key('F11', 'F11'), key('F12', 'F12'), spacer(1)],
  [key('Backquote', '`'), key('Digit1', '1'), key('Digit2', '2'), key('Digit3', '3'), key('Digit4', '4'), key('Digit5', '5'), key('Digit6', '6'), key('Digit7', '7'), key('Digit8', '8'), key('Digit9', '9'), key('Digit0', '0'), key('Minus', '-'), key('Equal', '='), key('Backspace', 'Backspace', 4)],
  [key('Tab', 'Tab', 3), key('KeyQ', 'Q'), key('KeyW', 'W'), key('KeyE', 'E'), key('KeyR', 'R'), key('KeyT', 'T'), key('KeyY', 'Y'), key('KeyU', 'U'), key('KeyI', 'I'), key('KeyO', 'O'), key('KeyP', 'P'), key('BracketLeft', '['), key('BracketRight', ']'), key('Backslash', '\\', 3)],
  [key('CapsLock', 'Caps', 4), key('KeyA', 'A'), key('KeyS', 'S'), key('KeyD', 'D'), key('KeyF', 'F'), key('KeyG', 'G'), key('KeyH', 'H'), key('KeyJ', 'J'), key('KeyK', 'K'), key('KeyL', 'L'), key('Semicolon', ';'), key('Quote', "'"), key('Enter', 'Enter', 4)],
  [key('ShiftLeft', 'Shift', 5), key('KeyZ', 'Z'), key('KeyX', 'X'), key('KeyC', 'C'), key('KeyV', 'V'), key('KeyB', 'B'), key('KeyN', 'N'), key('KeyM', 'M'), key('Comma', ','), key('Period', '.'), key('Slash', '/'), key('ShiftRight', 'Shift', 5)],
  [key('ControlLeft', 'Ctrl', 3), key('MetaLeft', 'Win', 3), key('AltLeft', 'Alt', 3), key('Space', 'Space', 11), key('AltRight', 'Alt', 3), key('MetaRight', 'Win', 3), key('ContextMenu', 'Menu', 2), key('ControlRight', 'Ctrl', 2)],
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
const modifierCodes = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);
const AUTO_PASS_KEY_COUNT = 10;

function resolveLayoutCode(event: KeyboardEvent): string | null {
  return testableCodes.has(event.code) ? event.code : null;
}

function blockBrowserAction(event: KeyboardEvent) {
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
  return (
    <div
      className={`keyboard-key keycap ${tested ? 'is-tested' : ''} ${held ? 'is-held' : ''} ${systemHandled ? 'is-system-key' : ''}`}
      style={style}
      title={`${definition.label} / ${definition.code}${systemHandled ? ' / May be reserved by the operating system' : ''}`}
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
  const [pressCount, setPressCount] = useState(0);
  const [recentKeys, setRecentKeys] = useState<RecentKey[]>([]);

  const registerKeyActivity = useCallback((event: KeyboardEvent) => {
    const layoutCode = resolveLayoutCode(event);
    const displayCode = layoutCode ?? event.code;


    if (!event.repeat) {
      setPressCount((previous) => previous + 1);
      setRecentKeys((previous) => [{
        label: event.key === ' ' ? 'Space' : event.key || displayCode || 'Unknown',
        code: displayCode || 'Unavailable',
        timestamp: event.timeStamp,
      }, ...previous].slice(0, 6));
    }

    if (layoutCode && modifierCodes.has(layoutCode)) {
      setHeldCodes((previous) => new Set(previous).add(layoutCode));
    }

    if (layoutCode) {
      setTestedCodes((previous) => new Set(previous).add(layoutCode));
    }

  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    blockBrowserAction(event);
    registerKeyActivity(event);
  }, [registerKeyActivity]);

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


  const totalKeys = testableCodes.size;
  const testedCount = useMemo(() => [...testedCodes].filter((code) => testableCodes.has(code)).length, [testedCodes]);
  const progress = Math.round((testedCount / totalKeys) * 100);

  useEffect(() => {
    if (testedCount >= AUTO_PASS_KEY_COUNT && results.keyboard === 'untested') {
      setResult('keyboard', 'working');
    }
  }, [testedCount, pressCount]);
  const modifierState = [
    { label: 'Shift', active: heldCodes.has('ShiftLeft') || heldCodes.has('ShiftRight'), detected: testedCodes.has('ShiftLeft') || testedCodes.has('ShiftRight') },
    { label: 'Ctrl', active: heldCodes.has('ControlLeft') || heldCodes.has('ControlRight'), detected: testedCodes.has('ControlLeft') || testedCodes.has('ControlRight') },
    { label: 'Alt', active: heldCodes.has('AltLeft') || heldCodes.has('AltRight'), detected: testedCodes.has('AltLeft') || testedCodes.has('AltRight') },
    { label: 'Win / Cmd', active: heldCodes.has('MetaLeft') || heldCodes.has('MetaRight'), detected: testedCodes.has('MetaLeft') || testedCodes.has('MetaRight') },
  ];

  const isKeyHeld = (code: string) => heldCodes.has(code);

  const undoTest = () => {
    setTestedCodes(new Set());
    setHeldCodes(new Set());
    setPressCount(0);
    setRecentKeys([]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="test-page mx-auto flex w-full max-w-[90rem] flex-col">
      <TestPageHeader
        testId="T-01"
        testKey="keyboard"
        title="Keyboard"
        description="Test a full-size keyboard, including navigation keys, left/right modifiers, and the numpad."
        canUndoTest={testedCodes.size > 0 || heldCodes.size > 0 || pressCount > 0 || recentKeys.length > 0}
        onUndoTest={undoTest}
      />

      <div className="mb-5 grid items-start gap-4 md:grid-cols-3">
        <Card className="instrument-panel">
          <CardContent className="p-4 sm:p-5">
            <h2 className="panel-label">Modifier activity</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {modifierState.map((modifier) => (
                <div
                  key={modifier.label}
                  className={`metric-tile flex items-center justify-between gap-2 p-3 ${modifier.active || modifier.detected ? 'border-primary/40 bg-primary/5' : ''}`}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">{modifier.label}</span>
                  <span className={`font-mono text-[9px] font-semibold ${modifier.active ? 'text-primary' : modifier.detected ? 'text-status-pass' : 'text-status-idle'}`}>
                    {modifier.active ? 'HELD' : modifier.detected ? 'SEEN' : 'WAIT'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="instrument-panel">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="panel-label">Recent input</h2>
              <span className="font-mono text-[9px] text-muted-foreground">{pressCount} {pressCount === 1 ? 'PRESS' : 'PRESSES'}</span>
            </div>
            <div className="live-readout mt-3 flex min-h-24 flex-col justify-center p-4">
              {recentKeys.length > 0 ? (
                <div className="relative z-10 grid gap-3">
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <span className="spec-item mb-1 block">Latest key</span>
                      <div className="readout-value truncate text-2xl">{recentKeys[0].label}</div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-primary">{recentKeys[0].code}</span>
                  </div>
                  <div className="flex min-h-8 items-center gap-2 overflow-hidden border-t border-border/70 pt-3">
                    {recentKeys.slice(1).map((entry) => (
                      <motion.span
                        key={`${entry.code}-${entry.timestamp}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="keycap shrink-0 rounded-md px-2 py-1 font-mono text-[10px] text-muted-foreground"
                        title={entry.code}
                      >
                        {entry.label}
                      </motion.span>
                    ))}
                    {recentKeys.length === 1 && <span className="font-mono text-[9px] text-muted-foreground">CONTINUE TYPING TO BUILD HISTORY</span>}
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex items-center gap-3 text-muted-foreground">
                  <Activity className="h-5 w-5 shrink-0 text-primary/60" />
                  <div><p className="font-mono text-[10px] font-semibold text-foreground">AWAITING INPUT</p><p className="mt-1 text-xs">Recent physical key presses will appear here.</p></div>
                </div>
              )}
            </div>
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

      <div className="min-w-0">
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

            <div className="full-keyboard rounded-xl border border-border/70 bg-secondary/25 p-2 sm:p-3" aria-label="Full-size keyboard test layout">
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
              This test listens to physical keyboard events; the on-screen keycaps are read-only. Dashed keys may be intercepted by the operating system. Fn is intentionally excluded because laptop firmware usually handles it without sending a browser event.
            </div>
          </CardContent>
        </Card>

      </div>
    </motion.div>
  );
}
