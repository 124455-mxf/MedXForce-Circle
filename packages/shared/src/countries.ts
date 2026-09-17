/** ISO-3166-1 alpha-2 country helpers for patient profile + care-transition region. */

export type CareTransitionCountryRegion = 'us' | 'de' | 'generic';

/** Common UN / ISO countries (alpha-2). Names come from Intl.DisplayNames in the UI. */
export const ISO_COUNTRY_CODES: readonly string[] = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
];

const ISO_SET = new Set(ISO_COUNTRY_CODES);

/** Free-text / legacy profile values → ISO alpha-2. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'US',
  us: 'US',
  'u.s.': 'US',
  'u.s.a.': 'US',
  'united states': 'US',
  'united states of america': 'US',
  america: 'US',
  deutschland: 'DE',
  germany: 'DE',
  de: 'DE',
  austria: 'AT',
  österreich: 'AT',
  oesterreich: 'AT',
  switzerland: 'CH',
  schweiz: 'CH',
  suisse: 'CH',
  uk: 'GB',
  'u.k.': 'GB',
  'united kingdom': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'great britain': 'GB',
  britain: 'GB',
  australia: 'AU',
  canada: 'CA',
  mexico: 'MX',
  méxico: 'MX',
  mejico: 'MX',
  spain: 'ES',
  españa: 'ES',
  espana: 'ES',
  poland: 'PL',
  polska: 'PL',
  france: 'FR',
  ireland: 'IE',
  'new zealand': 'NZ',
  india: 'IN',
  brazil: 'BR',
  brasil: 'BR',
  japan: 'JP',
  china: 'CN',
  italy: 'IT',
  italia: 'IT',
  netherlands: 'NL',
  holland: 'NL',
  belgium: 'BE',
  portugal: 'PT',
  argentina: 'AR',
  chile: 'CL',
  colombia: 'CO',
  peru: 'PE',
  perú: 'PE',
};

export type ProfileCountryOption = {
  code: string;
  name: string;
};

function localeTagForUiLanguage(language: string | undefined): string {
  if (language === 'German') return 'de';
  if (language === 'Spanish') return 'es';
  if (language === 'Polish') return 'pl';
  if (language === 'de' || language === 'es' || language === 'pl' || language === 'en') return language;
  return 'en';
}

/** Normalize free text or ISO code to alpha-2, or null if unknown. */
export function normalizeCountryCode(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && ISO_SET.has(upper)) return upper;
  const alias = COUNTRY_ALIASES[trimmed.toLowerCase()];
  if (alias && ISO_SET.has(alias)) return alias;
  return null;
}

/**
 * Care-transition checklist region from patient country.
 * Only US and DE have tailored tasks today; all other markets use generic (universal tasks).
 */
export function careTransitionRegionFromCountry(
  country: string | null | undefined,
): CareTransitionCountryRegion {
  const code = normalizeCountryCode(country);
  if (code === 'US') return 'us';
  if (code === 'DE') return 'de';
  return 'generic';
}

export function countryDisplayName(
  codeOrRaw: string | null | undefined,
  uiLanguage?: string,
): string {
  const code = normalizeCountryCode(codeOrRaw) ?? String(codeOrRaw ?? '').trim();
  if (!code) return '';
  try {
    const locale = localeTagForUiLanguage(uiLanguage);
    const name = new Intl.DisplayNames([locale], { type: 'region' }).of(
      code.length === 2 ? code : code,
    );
    if (name) return name;
  } catch {
    /* fall through */
  }
  return code;
}

/** Sorted country options for profile dropdowns. */
export function listProfileCountryOptions(uiLanguage?: string): ProfileCountryOption[] {
  const locale = localeTagForUiLanguage(uiLanguage);
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    display = null;
  }
  return ISO_COUNTRY_CODES.map((code) => ({
    code,
    name: display?.of(code) || code,
  })).sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: 'base' }));
}

/** Prefer storing ISO codes; keep unknown legacy strings as-is. */
export function canonicalizeProfileCountry(raw: string | null | undefined): string {
  const code = normalizeCountryCode(raw);
  if (code) return code;
  return String(raw ?? '').trim();
}
