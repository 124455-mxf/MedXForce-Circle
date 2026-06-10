import { createContext, useContext, type ReactNode } from 'react';

type CircleChromeContextValue = {
  compact: boolean;
  onBackToDashboard?: () => void;
};

const CircleChromeContext = createContext<CircleChromeContextValue>({ compact: false });

export function CircleChromeProvider({
  compact,
  onBackToDashboard,
  children,
}: {
  compact: boolean;
  onBackToDashboard?: () => void;
  children: ReactNode;
}) {
  return (
    <CircleChromeContext.Provider value={{ compact, onBackToDashboard }}>
      {children}
    </CircleChromeContext.Provider>
  );
}

export function useCircleCompactChrome(): boolean {
  return useContext(CircleChromeContext).compact;
}

export function useCircleBackToDashboard(): (() => void) | undefined {
  return useContext(CircleChromeContext).onBackToDashboard;
}
