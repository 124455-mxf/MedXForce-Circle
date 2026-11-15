/// <reference types="@capacitor-firebase/authentication" />

import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Circle shell. It loads the live website so Safari testing stays on that site.
 * Apple and Google sign-in inside the shell use the system sheets (see capacitorNativeAuth.ts).
 * Do not add push notifications here. This build must not promise alerts when the app is closed.
 *
 * CAPACITOR_SERVER_URL overrides the site at `npx cap sync` time.
 */
const circleSite =
  process.env.CAPACITOR_SERVER_URL?.trim() || 'https://gen-lang-client-0333368246.web.app';

const config: CapacitorConfig = {
  appId: 'com.medxforce.circle',
  appName: 'MedXForce Circle',
  webDir: 'capacitor-www',
  server: {
    url: circleSite,
    cleartext: false,
    allowNavigation: [
      'gen-lang-client-0333368246.web.app',
      'gen-lang-client-0333368246.firebaseapp.com',
      'medxforce-patient-stroke-tbi-975877507050.us-west4.run.app',
    ],
  },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['apple.com', 'google.com'],
    },
  },
  experimental: {
    ios: {
      spm: {
        swiftToolsVersion: '6.1',
        packageTraits: {
          '@capacitor-firebase/authentication': ['Google'],
        },
      },
    },
  },
};

export default config;
