import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
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

export function initMedxFirebase(config: MedxFirebaseConfig): MedxFirebaseServices {
  if (cached) return cached;
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  const db = config.firestoreDatabaseId
    ? getFirestore(app, config.firestoreDatabaseId)
    : getFirestore(app);
  cached = {
    app,
    auth: getAuth(app),
    db,
    storage: getStorage(app),
  };
  return cached;
}
