import { OAuthProvider } from 'firebase/auth';

/** On unless VITE_ENABLE_APPLE_SIGN_IN is set to false. */
export function isAppleSignInEnabled(): boolean {
  const flag = String(import.meta.env.VITE_ENABLE_APPLE_SIGN_IN ?? 'true').trim().toLowerCase();
  return flag === 'true' || flag === '1';
}

export function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/** Microsoft Teams and similar in-app browsers break OAuth redirects. */
export function isEmbeddedInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /Teams|FBAN|FBAV|Instagram|Line\/|LinkedInApp|Twitter|GSA\/|Gmail/i.test(ua) ||
    (/\bwv\b/.test(ua) && /Android/.test(ua))
  );
}

/** Apple Sign In on the web is most reliable with redirect on iPhone. */
export function preferApplePopupSignIn(hostname: string): boolean {
  if (isAppleTouchDevice()) return false;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function createAppleOAuthProvider(): OAuthProvider {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  return provider;
}
