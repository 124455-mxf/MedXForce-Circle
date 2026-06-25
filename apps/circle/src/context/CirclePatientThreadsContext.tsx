import { createContext, useContext, type ReactNode } from 'react';
import type { CirclePatientThreadsState } from '../hooks/useCirclePatientThreads';

const CirclePatientThreadsContext = createContext<CirclePatientThreadsState | null>(null);

export function CirclePatientThreadsProvider({
  value,
  children,
}: {
  value: CirclePatientThreadsState;
  children: ReactNode;
}) {
  return (
    <CirclePatientThreadsContext.Provider value={value}>
      {children}
    </CirclePatientThreadsContext.Provider>
  );
}

export function useCirclePatientThreadsContext(): CirclePatientThreadsState {
  const value = useContext(CirclePatientThreadsContext);
  if (!value) {
    throw new Error('useCirclePatientThreadsContext must be used within CirclePatientThreadsProvider');
  }
  return value;
}
