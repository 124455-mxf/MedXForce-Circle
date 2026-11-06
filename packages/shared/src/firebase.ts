import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, indexedDBLocalPersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, setLogLevel, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export interface MedxFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export interface MedxFirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let cached: MedxFirebaseServices | null = null;

/** Avoid QUIC/WebChannel reconnect noise on some networks. */
function initFirestore(app: FirebaseApp, databaseId?: string): Firestore {
  try {
    return databaseId
      ? initializeFirestore(app, { experimentalForceLongPolling: true }, databaseId)
      : initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

function isCapacitorNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const bridge = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return bridge?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function createAuth(app: FirebaseApp): Auth {
  if (!isCapacitorNativeShell()) return getAuth(app);
  try {
    return initializeAuth(app, { persistence: indexedDBLocalPersistence });
  } catch {
    return getAuth(app);
  }
}

export function initMedxFirebase(config: MedxFirebaseConfig): MedxFirebaseServices {
  if (cached) return cached;
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  const db = initFirestore(app, config.firestoreDatabaseId);
  setLogLevel('error');
  cached = {
    app,
    auth: createAuth(app),
    db,
    storage: getStorage(app),
  };
  return cached;
}
