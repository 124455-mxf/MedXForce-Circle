import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  type Auth,
} from 'firebase/auth';

export type NativeOAuthProvider = 'apple' | 'google';

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
};

function readCapacitorBridge(): CapacitorBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
}

/** True only inside the Capacitor iOS shell. Safari and desktop browsers stay on the web flow. */
export function isCapacitorNativeApp(
  bridge: CapacitorBridge | null | undefined = readCapacitorBridge(),
): boolean {
  try {
    return bridge?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function readField(err: unknown, field: 'code' | 'message'): string {
  if (!err || typeof err !== 'object') return '';
  const value = (err as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}

function readMessage(err: unknown): string {
  const fromField = readField(err, 'message');
  if (fromField) return fromField;
  return err instanceof Error ? err.message : '';
}

/** The system sheet was dismissed. The sign-in screen should stay quiet. */
export function isNativeSignInCancelled(err: unknown): boolean {
  const code = readField(err, 'code').toLowerCase();
  const message = readMessage(err).toLowerCase();
  if (code === '1001' || code === '12501') return true;
  if (code.includes('canceled') || code.includes('cancelled')) return true;
  if (message.includes('canceled') || message.includes('cancelled')) return true;
  return false;
}

const MISSING_NATIVE_SETUP =
  'This app build cannot start Apple or Google sign-in yet. Add GoogleService-Info.plist for this bundle ID, and turn on Sign in with Apple.';

/** Null means the person closed the sheet. Any other string is shown on the sign-in screen. */
export function nativeOAuthErrorMessage(err: unknown): string | null {
  if (isNativeSignInCancelled(err)) return null;
  const code = readField(err, 'code');
  const message = readMessage(err);
  if (/plist|provider is not enabled|not configured/i.test(message)) return MISSING_NATIVE_SETUP;
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled for the app yet. Enable it in Firebase Authentication, then try again.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/invalid-id-token') {
    return 'Firebase rejected the Apple or Google token. Add this app’s bundle ID to Firebase Authentication, then try again.';
  }
  if (message) return message;
  return 'Sign-in did not finish.';
}

/**
 * System Sign in with Apple / Google sheet, then the same Firebase Auth session the website uses.
 * Called only after `isCapacitorNativeApp()` is true.
 */
export async function signInWithNativeProvider(auth: Auth, provider: NativeOAuthProvider): Promise<void> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  if (provider === 'apple') {
    const result = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
    const idToken = result.credential?.idToken?.trim();
    if (!idToken) throw new Error(MISSING_NATIVE_SETUP);
    const rawNonce = result.credential?.nonce?.trim();
    const credential = new OAuthProvider('apple.com').credential({
      idToken,
      ...(rawNonce ? { rawNonce } : {}),
    });
    await signInWithCredential(auth, credential);
    return;
  }

  const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
  const idToken = result.credential?.idToken?.trim();
  if (!idToken) throw new Error(MISSING_NATIVE_SETUP);
  const accessToken = result.credential?.accessToken?.trim();
  const credential = GoogleAuthProvider.credential(idToken, accessToken || undefined);
  await signInWithCredential(auth, credential);
}
