function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function humanizeEmailLocalPart(email: string): string {
  const local = email.split('@')[0]?.trim() || email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return local;
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function resolveGalleryUploaderDisplayName(
  senderName: string | undefined,
  source: 'patient' | 'circle' | string | undefined,
  patientDisplayName: string,
): string {
  if (source === 'patient') {
    return patientDisplayName.trim() || 'Your loved one';
  }

  const trimmed = senderName?.trim() || '';
  if (!trimmed) return 'Family';
  if (!isLikelyEmail(trimmed)) return trimmed;
  return humanizeEmailLocalPart(trimmed);
}
