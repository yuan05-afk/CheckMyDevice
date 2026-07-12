import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type TestStatus = 'untested' | 'working' | 'issue' | 'unsupported';
export type TestId = 'keyboard' | 'mouse' | 'camera' | 'microphone' | 'speaker' | 'display' | 'battery' | 'network' | 'sensors';

interface TestContextType {
  results: Record<TestId, TestStatus>;
  setResult: (id: TestId, status: TestStatus) => void;
  resetAll: () => void;
}

const defaultResults: Record<TestId, TestStatus> = {
  keyboard: 'untested',
  mouse: 'untested',
  camera: 'untested',
  microphone: 'untested',
  speaker: 'untested',
  display: 'untested',
  battery: 'untested',
  network: 'untested',
  sensors: 'untested',
};

const TestContext = createContext<TestContextType | undefined>(undefined);

export function TestProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<Record<TestId, TestStatus>>(() => {
    try {
      const stored = localStorage.getItem('checkmydevice-results');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored results', e);
    }
    return defaultResults;
  });

  useEffect(() => {
    localStorage.setItem('checkmydevice-results', JSON.stringify(results));
  }, [results]);

  const setResult = (id: TestId, status: TestStatus) => {
    setResults((prev) => ({ ...prev, [id]: status }));
  };

  const resetAll = () => {
    setResults(defaultResults);
  };

  return (
    <TestContext.Provider value={{ results, setResult, resetAll }}>
      {children}
    </TestContext.Provider>
  );
}

export function useTestContext() {
  const context = useContext(TestContext);
  if (context === undefined) {
    throw new Error('useTestContext must be used within a TestProvider');
  }
  return context;
}
