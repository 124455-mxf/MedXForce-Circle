import { createContext, useContext, type ReactNode } from 'react';
import type { PatientRemoteSettingsDoc } from '@medxforce/shared';
import type { PatientPresenceState } from '../hooks/usePatientOnlinePresence';
import type { useCircleRemoteSettings } from '../hooks/useCircleRemoteSettings';

export type CircleRemoteSettingsContextValue = {
  settings: PatientRemoteSettingsDoc | null;
  fromFirestore: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  savedAt: number | null;
  persist: ReturnType<typeof useCircleRemoteSettings>['persist'];
  setSettings: ReturnType<typeof useCircleRemoteSettings>['setSettings'];
};

type CircleSelectedPatientContextValue = {
  patientPresence: PatientPresenceState;
  remoteSettings: CircleRemoteSettingsContextValue;
};

const CircleSelectedPatientContext = createContext<CircleSelectedPatientContextValue | null>(null);

export function CircleSelectedPatientProvider({
  patientPresence,
  remoteSettings,
  children,
}: CircleSelectedPatientContextValue & { children: ReactNode }) {
  return (
    <CircleSelectedPatientContext.Provider value={{ patientPresence, remoteSettings }}>
      {children}
    </CircleSelectedPatientContext.Provider>
  );
}

export function useCircleSelectedPatientContext(): CircleSelectedPatientContextValue {
  const value = useContext(CircleSelectedPatientContext);
  if (!value) {
    throw new Error('useCircleSelectedPatientContext must be used within CircleSelectedPatientProvider');
  }
  return value;
}

export function useCirclePatientPresenceFromShell(): PatientPresenceState {
  return useCircleSelectedPatientContext().patientPresence;
}

export function useCircleRemoteSettingsFromShell(): CircleRemoteSettingsContextValue {
  return useCircleSelectedPatientContext().remoteSettings;
}
