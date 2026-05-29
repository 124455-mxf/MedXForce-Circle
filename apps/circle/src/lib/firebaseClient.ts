import { initMedxFirebase, type MedxFirebaseConfig } from '@medxforce/shared';

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing ${key} in apps/circle/.env — copy from .env.example`);
  }
  return value;
}

export function loadFirebaseConfig(): MedxFirebaseConfig {
  return {
    apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
    authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: requireEnv('VITE_FIREBASE_APP_ID'),
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || undefined,
  };
}

export const firebase = initMedxFirebase(loadFirebaseConfig());
