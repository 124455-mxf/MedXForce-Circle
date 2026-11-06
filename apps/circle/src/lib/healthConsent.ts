import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, setDoc, type Firestore } from 'firebase/firestore';

export const CIRCLE_HEALTH_CONSENT_VERSION = '1';
export const CIRCLE_PROXY_HEALTH_CONSENT_VERSION = '1';

const LANGUAGES = ['en', 'de', 'es', 'pl'] as const;
type ConsentLanguage = (typeof LANGUAGES)[number];

const MEMBER_SENTENCES: Record<ConsentLanguage, string> = {
  en: 'I agree that MedXForce may show me that health information and store what I enter, as described in the Privacy policy.',
  de: 'Ich stimme zu, dass MedXForce mir diese Gesundheitsdaten zeigt und speichert, was ich eingebe, wie in der Datenschutzerklärung beschrieben.',
  es: 'Acepto que MedXForce me muestre esa información de salud y guarde lo que yo escribo, como se describe en la política de privacidad.',
  pl: 'Zgadzam się, aby MedXForce pokazywał mi te dane o zdrowiu i zapisywał to, co wpisuję, zgodnie z polityką prywatności.',
};

const PROXY_SENTENCES: Record<ConsentLanguage, string> = {
  en: 'I agree, as Proxy, that MedXForce may process this patient’s health information and share it with this Circle.',
  de: 'Ich stimme als Bevollmächtigter zu, dass MedXForce die Gesundheitsdaten dieses Patienten verarbeiten und mit diesem Circle teilen darf.',
  es: 'Acepto, como apoderado, que MedXForce trate la información de salud de este paciente y la comparta con este Circle.',
  pl: 'Zgadzam się, jako pełnomocnik, aby MedXForce przetwarzał dane o zdrowiu tego pacjenta i udostępniał je temu Circle.',
};

export type CircleHealthConsentGate = {
  memberNeeded: boolean;
  proxyNeeded: boolean;
  memberSentence: string;
  proxySentence: string;
  memberVersion: string;
  proxyVersion: string;
  language: ConsentLanguage;
};

function consentLanguage(language: string | undefined): ConsentLanguage {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('de') || value.includes('german') || value.includes('deutsch')) return 'de';
  if (value.startsWith('es') || value.includes('spanish') || value.includes('español')) return 'es';
  if (value.startsWith('pl') || value.includes('polish') || value.includes('polski')) return 'pl';
  return 'en';
}

function readSlot(raw: unknown, language: ConsentLanguage, fallback: string, fallbackVersion: string) {
  const slot = raw && typeof raw === 'object' ? (raw as Record<string, unknown>)[language] : undefined;
  if (!slot || typeof slot !== 'object') return { version: fallbackVersion, sentence: fallback };
  const record = slot as { version?: unknown; sentence?: unknown };
  return {
    version: typeof record.version === 'string' && record.version.trim() ? record.version.trim() : fallbackVersion,
    sentence: typeof record.sentence === 'string' && record.sentence.trim() ? record.sentence.trim() : fallback,
  };
}

function accepted(stored: unknown, language: ConsentLanguage, version: string, app: string): boolean {
  if (!stored || typeof stored !== 'object') return false;
  const record = stored as { app?: unknown; version?: unknown; versions?: unknown };
  if (record.app !== app) return false;
  if (record.versions && typeof record.versions === 'object') {
    const value = (record.versions as Record<string, unknown>)[language];
    if (typeof value === 'string') return value === version;
  }
  return typeof record.version === 'string' && record.version === version;
}

function stringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'string' && item.trim()) next[key] = item.trim();
  }
  return next;
}

function numberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const next: Record<string, number> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'number' && Number.isFinite(item)) next[key] = item;
  }
  return next;
}

function nextRecord(
  existing: Record<string, unknown> | undefined,
  app: string,
  language: ConsentLanguage,
  version: string,
  acceptedAt: number,
) {
  const versions = stringMap(existing?.versions);
  const acceptedAtByLanguage = numberMap(existing?.acceptedAtByLanguage);
  if (typeof existing?.version === 'string' && Object.keys(versions).length === 0) {
    for (const code of LANGUAGES) versions[code] = existing.version;
  }
  versions[language] = version;
  acceptedAtByLanguage[language] = acceptedAt;
  return {
    app,
    version: typeof existing?.version === 'string' ? existing.version : version,
    acceptedAt: typeof existing?.acceptedAt === 'number' ? existing.acceptedAt : acceptedAt,
    versions,
    acceptedAtByLanguage,
  };
}

export async function saveCircleHealthConsent(
  db: Firestore,
  uid: string,
  which: {
    member: boolean;
    proxy: boolean;
    language: ConsentLanguage;
    memberVersion: string;
    proxyVersion: string;
  },
): Promise<void> {
  const ref = doc(db, 'circle_profiles', uid);
  const data = (await getDoc(ref)).data() ?? {};
  const acceptedAt = Date.now();
  const payload: Record<string, unknown> = { updatedAt: acceptedAt };
  if (which.member) {
    payload.healthConsent = nextRecord(
      data.healthConsent as Record<string, unknown> | undefined,
      'circle',
      which.language,
      which.memberVersion,
      acceptedAt,
    );
  }
  if (which.proxy) {
    payload.proxyHealthConsent = nextRecord(
      data.proxyHealthConsent as Record<string, unknown> | undefined,
      'circle-proxy',
      which.language,
      which.proxyVersion,
      acceptedAt,
    );
  }
  await setDoc(ref, payload, { merge: true });
}

const CLEAR: CircleHealthConsentGate = {
  memberNeeded: false,
  proxyNeeded: false,
  memberSentence: MEMBER_SENTENCES.en,
  proxySentence: PROXY_SENTENCES.en,
  memberVersion: CIRCLE_HEALTH_CONSENT_VERSION,
  proxyVersion: CIRCLE_PROXY_HEALTH_CONSENT_VERSION,
  language: 'en',
};

export function useCircleHealthConsent(
  db: Firestore | null,
  uid: string | undefined,
  appLanguage: string | undefined,
): CircleHealthConsentGate | undefined {
  const language = consentLanguage(appLanguage);
  const [published, setPublished] = useState<{ member: { version: string; sentence: string }; proxy: { version: string; sentence: string } } | undefined>(
    uid ? undefined : { member: { version: '1', sentence: MEMBER_SENTENCES.en }, proxy: { version: '1', sentence: PROXY_SENTENCES.en } },
  );
  const [stored, setStored] = useState<{ member: unknown; proxy: unknown } | undefined>(
    uid ? undefined : { member: null, proxy: null },
  );

  useEffect(() => {
    if (!db || !uid) return;
    return onSnapshot(
      doc(db, 'health_consent', 'published'),
      (snap) => {
        const data = snap.data();
        setPublished({
          member: readSlot(data?.circle, language, MEMBER_SENTENCES[language], CIRCLE_HEALTH_CONSENT_VERSION),
          proxy: readSlot(data?.circleProxy, language, PROXY_SENTENCES[language], CIRCLE_PROXY_HEALTH_CONSENT_VERSION),
        });
      },
      () =>
        setPublished({
          member: readSlot(undefined, language, MEMBER_SENTENCES[language], CIRCLE_HEALTH_CONSENT_VERSION),
          proxy: readSlot(undefined, language, PROXY_SENTENCES[language], CIRCLE_PROXY_HEALTH_CONSENT_VERSION),
        }),
    );
  }, [db, uid, language]);

  useEffect(() => {
    if (!db || !uid) return;
    return onSnapshot(
      doc(db, 'circle_profiles', uid),
      (snap) => setStored({ member: snap.data()?.healthConsent ?? null, proxy: snap.data()?.proxyHealthConsent ?? null }),
      () => setStored({ member: null, proxy: null }),
    );
  }, [db, uid]);

  if (!uid) return CLEAR;
  if (!published || !stored) return undefined;
  return {
    memberNeeded: !accepted(stored.member, language, published.member.version, 'circle'),
    proxyNeeded: !accepted(stored.proxy, language, published.proxy.version, 'circle-proxy'),
    memberSentence: published.member.sentence,
    proxySentence: published.proxy.sentence,
    memberVersion: published.member.version,
    proxyVersion: published.proxy.version,
    language,
  };
}
