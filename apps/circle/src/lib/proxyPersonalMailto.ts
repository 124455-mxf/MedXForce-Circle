/** Open the device mail app with a draft the proxy sends from their own address. */

export const PROXY_PERSONAL_NOTE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export type ProxyPersonalNoteKind = 'inactive' | 'pending' | 'never' | 'recent';

export function proxyPersonalNoteKind(input: {
  status: string;
  lastOpenedAt: number;
  now?: number;
}): ProxyPersonalNoteKind {
  if (input.status === 'pending') return 'pending';
  if (!Number.isFinite(input.lastOpenedAt) || input.lastOpenedAt <= 0) return 'never';
  const now = input.now ?? Date.now();
  if (now - input.lastOpenedAt >= PROXY_PERSONAL_NOTE_STALE_MS) return 'inactive';
  return 'recent';
}

/** Skip a display name that is only the email address. */
export function personalNotePersonName(name: string, email: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes('@')) return '';
  if (trimmed.toLowerCase() === email.trim().toLowerCase()) return '';
  return trimmed;
}

export function buildProxyPersonalMailto(to: string, subject: string, body: string): string {
  const email = to.trim();
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openProxyPersonalMailDraft(href: string): void {
  window.location.href = href;
}
