import { createContext, useContext, type ReactNode } from 'react';
import type { CircleManagedContact, TeamCoverageAnalysis } from '@medxforce/shared';

export type CircleTeamCoverageContextValue = {
  analysis: TeamCoverageAnalysis;
  contacts: CircleManagedContact[];
  loading: boolean;
};

const CircleTeamCoverageContext = createContext<CircleTeamCoverageContextValue | null>(null);

export function CircleTeamCoverageProvider({
  value,
  children,
}: {
  value: CircleTeamCoverageContextValue;
  children: ReactNode;
}) {
  return (
    <CircleTeamCoverageContext.Provider value={value}>{children}</CircleTeamCoverageContext.Provider>
  );
}

export function useCircleTeamCoverageFromDashboard(): CircleTeamCoverageContextValue {
  const value = useContext(CircleTeamCoverageContext);
  if (!value) {
    throw new Error('useCircleTeamCoverageFromDashboard must be used within CircleTeamCoverageProvider');
  }
  return value;
}
