import {
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

export const CIRCLE_PATIENT_LOCATION_DOC_ID = 'live';

/** Max age before Circle falls back to profile city/country. */
export const CIRCLE_DEVICE_LOCATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type CirclePatientLocationSource = 'device';

export type CirclePatientLocationDoc = {
  patientId: string;
  sharedWithCircle: boolean;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  timezoneId?: string;
  timezoneShort?: string;
  source?: CirclePatientLocationSource;
  permissionState?: 'granted' | 'denied' | 'unsupported';
  updatedAt: number;
};

export function circlePatientLocationRef(db: Firestore, patientId: string) {
  return doc(db, 'patients', patientId, 'circle_location', CIRCLE_PATIENT_LOCATION_DOC_ID);
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function parseCirclePatientLocationDoc(
  patientId: string,
  data: Record<string, unknown> | undefined,
): CirclePatientLocationDoc | null {
  if (!data) return null;
  const updatedAt = asFiniteNumber(data.updatedAt) ?? 0;
  return {
    patientId,
    sharedWithCircle: data.sharedWithCircle === true,
    latitude: asFiniteNumber(data.latitude),
    longitude: asFiniteNumber(data.longitude),
    accuracyMeters: asFiniteNumber(data.accuracyMeters),
    city: asString(data.city),
    region: asString(data.region),
    country: asString(data.country),
    countryCode: asString(data.countryCode),
    timezoneId: asString(data.timezoneId),
    timezoneShort: asString(data.timezoneShort),
    source: data.source === 'device' ? 'device' : undefined,
    permissionState:
      data.permissionState === 'granted' ||
      data.permissionState === 'denied' ||
      data.permissionState === 'unsupported'
        ? data.permissionState
        : undefined,
    updatedAt,
  };
}

export function isCircleDeviceLocationFresh(
  location: Pick<CirclePatientLocationDoc, 'sharedWithCircle' | 'updatedAt'>,
  now = Date.now(),
): boolean {
  if (!location.sharedWithCircle || !location.updatedAt) return false;
  return now - location.updatedAt <= CIRCLE_DEVICE_LOCATION_MAX_AGE_MS;
}

export function circleDeviceLocaleFromLocation(
  location: CirclePatientLocationDoc | null | undefined,
  now = Date.now(),
): {
  city: string;
  country: string;
  timezoneId: string;
  timezoneShort: string;
  updatedAt: number;
} | null {
  if (!location || !isCircleDeviceLocationFresh(location, now)) return null;
  const city = location.city?.trim() ?? '';
  const country = location.country?.trim() ?? '';
  const timezoneId = location.timezoneId?.trim() ?? '';
  if (!city || !timezoneId) return null;
  return {
    city,
    country,
    timezoneId,
    timezoneShort: location.timezoneShort?.trim() ?? timezoneId,
    updatedAt: location.updatedAt,
  };
}

export async function writeCirclePatientLocation(
  db: Firestore,
  location: CirclePatientLocationDoc,
): Promise<void> {
  await setDoc(circlePatientLocationRef(db, location.patientId), location, { merge: true });
}

export async function clearCirclePatientLocationSharing(
  db: Firestore,
  patientId: string,
): Promise<void> {
  await setDoc(
    circlePatientLocationRef(db, patientId),
    {
      patientId,
      sharedWithCircle: false,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export function subscribeCirclePatientLocation(
  db: Firestore,
  patientId: string,
  onChange: (location: CirclePatientLocationDoc | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    circlePatientLocationRef(db, patientId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(parseCirclePatientLocationDoc(patientId, snap.data() as Record<string, unknown>));
    },
    (err) => onError?.(err.message),
  );
}

export type ReverseGeocodeResult = {
  city: string;
  region: string;
  country: string;
  countryCode: string;
};

/** Client-side reverse geocode (BigDataCloud — no API key). */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('localityLanguage', 'en');

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Reverse geocode failed.');
  const data = (await response.json()) as Record<string, unknown>;

  return {
    city: String(data.city || data.locality || '').trim() || 'Unknown',
    region: String(data.principalSubdivision || '').trim(),
    country: String(data.countryName || '').trim(),
    countryCode: String(data.countryCode || '').trim(),
  };
}

export async function resolveTimezoneForCoordinates(
  latitude: number,
  longitude: number,
): Promise<{ timezoneId: string; timezoneShort: string }> {
  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(latitude));
  forecastUrl.searchParams.set('longitude', String(longitude));
  forecastUrl.searchParams.set('current', 'temperature_2m');
  forecastUrl.searchParams.set('timezone', 'auto');

  const response = await fetch(forecastUrl.toString());
  if (!response.ok) throw new Error('Timezone lookup failed.');
  const data = (await response.json()) as { timezone?: string };
  const timezoneId = data.timezone?.trim() || 'UTC';
  const timezoneShort =
    new Intl.DateTimeFormat(undefined, {
      timeZone: timezoneId,
      timeZoneName: 'short',
    })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value ?? timezoneId;

  return { timezoneId, timezoneShort };
}

export async function buildCirclePatientLocationFromCoordinates(
  patientId: string,
  latitude: number,
  longitude: number,
  accuracyMeters: number | undefined,
  permissionState: CirclePatientLocationDoc['permissionState'],
): Promise<CirclePatientLocationDoc> {
  const [geocoded, timezone] = await Promise.all([
    reverseGeocodeCoordinates(latitude, longitude),
    resolveTimezoneForCoordinates(latitude, longitude),
  ]);

  return {
    patientId,
    sharedWithCircle: true,
    latitude,
    longitude,
    accuracyMeters,
    city: geocoded.city,
    region: geocoded.region,
    country: geocoded.country,
    countryCode: geocoded.countryCode,
    timezoneId: timezone.timezoneId,
    timezoneShort: timezone.timezoneShort,
    source: 'device',
    permissionState,
    updatedAt: Date.now(),
  };
}
