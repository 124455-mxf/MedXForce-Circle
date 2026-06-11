import type { CircleUiLanguage } from './lib/circleLanguages';
import {
  appShellEnglish,
  appShellGerman,
  appShellPolish,
  appShellSpanish,
} from './translations/appShell';

type TranslationTree = Record<string, string | TranslationTree>;

export const CIRCLE_TRANSLATIONS: Record<CircleUiLanguage, TranslationTree> = {
  English: {
    auth: {
      title: 'MedXForce Circle',
      subtitle: 'Family & Friends — share moments with your loved one',
      emailPlaceholder: 'Email (must match patient invite)',
      passwordPlaceholder: 'Password',
      continueGoogle: 'Continue with Google',
      signingIn: 'Signing in…',
      orEmailPassword: 'or email & password',
      signIn: 'Sign in',
      createAccount: 'Create account',
      googleHint:
        'MedXForce patient app uses Google — use Continue with Google if you already sign in there. The Google email must match the Family & Friends invite exactly.',
      wrongPassword:
        'Wrong password — or this account uses Google sign-in. Try Continue with Google instead.',
      emailInUse:
        'This email already has an account (often via Google). Use Continue with Google, or reset password in Firebase Authentication.',
      weakPassword: 'Password must be at least 6 characters.',
      invalidEmail: 'Enter a valid email address.',
      userNotFound: 'No account for this email yet. Use Create account instead.',
      authFailed: 'Authentication failed',
      noInviteForEmail:
        'No invite found for {{email}}. In the patient app, save Family & Friends contact with this exact email, click Done, then Refresh.',
      inviteLinkFailed:
        'Invite found but could not link your account. Check the browser console for details.',
      firestoreQuota:
        'Firestore daily write limit reached for this project. Try again after midnight Pacific, or upgrade the Firebase database plan.',
      refreshFailed: 'Could not refresh invites.',
    },
    patients: {
      yourPatients: 'Your patients',
      noInvitesYet:
        'No active invites yet. In the patient app, open Settings → Family & Friends, confirm your email is saved, click Done, then tap Refresh here.',
    },
    brand: {
      startupTagline: 'MedXForce Circle — Family & Friends',
    },
    ...appShellEnglish,
    common: {
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      signOut: 'Sign out',
      saving: 'Saving…',
      saved: 'Saved',
      friendsFamily: 'Family & Friends',
      ...appShellEnglish.common,
    },
  },
  German: {
    auth: {
      title: 'MedXForce Circle',
      subtitle: 'Familie & Freunde — Momente mit Ihrem Angehörigen teilen',
      emailPlaceholder: 'E-Mail (muss mit der Patienteneinladung übereinstimmen)',
      passwordPlaceholder: 'Passwort',
      continueGoogle: 'Mit Google fortfahren',
      signingIn: 'Anmeldung…',
      orEmailPassword: 'oder E-Mail & Passwort',
      signIn: 'Anmelden',
      createAccount: 'Konto erstellen',
      googleHint:
        'Die MedXForce-Patienten-App nutzt Google — verwenden Sie „Mit Google fortfahren“, wenn Sie sich dort bereits anmelden. Die Google-E-Mail muss exakt mit der Familie-&-Freunde-Einladung übereinstimmen.',
      wrongPassword:
        'Falsches Passwort — oder dieses Konto nutzt Google-Anmeldung. Versuchen Sie „Mit Google fortfahren“.',
      emailInUse:
        'Diese E-Mail hat bereits ein Konto (oft über Google). Nutzen Sie Google oder setzen Sie das Passwort in Firebase Authentication zurück.',
      weakPassword: 'Das Passwort muss mindestens 6 Zeichen haben.',
      invalidEmail: 'Geben Sie eine gültige E-Mail-Adresse ein.',
      userNotFound: 'Kein Konto für diese E-Mail. Nutzen Sie „Konto erstellen“.',
      authFailed: 'Anmeldung fehlgeschlagen',
      noInviteForEmail:
        'Keine Einladung für {{email}} gefunden. Speichern Sie im Patienten-App-Kontakt unter Familie & Freunde diese E-Mail, tippen Sie auf Fertig und dann hier auf Aktualisieren.',
      inviteLinkFailed:
        'Einladung gefunden, aber Konto konnte nicht verknüpft werden. Prüfen Sie die Browser-Konsole.',
      firestoreQuota:
        'Tägliches Firestore-Schreiblimit erreicht. Versuchen Sie es nach Mitternacht (Pacific) erneut oder upgraden Sie den Firebase-Plan.',
      refreshFailed: 'Einladungen konnten nicht aktualisiert werden.',
    },
    patients: {
      yourPatients: 'Ihre Patienten',
      noInvitesYet:
        'Noch keine aktiven Einladungen. Öffnen Sie in der Patienten-App Einstellungen → Familie & Freunde, speichern Sie Ihre E-Mail, tippen Sie auf Fertig und dann hier auf Aktualisieren.',
    },
    brand: {
      startupTagline: 'MedXForce Circle — Familie & Freunde',
    },
    ...appShellGerman,
    common: {
      refresh: 'Aktualisieren',
      refreshing: 'Aktualisiere…',
      signOut: 'Abmelden',
      saving: 'Speichern…',
      saved: 'Gespeichert',
      friendsFamily: 'Familie & Freunde',
      ...appShellGerman.common,
    },
  },
  Spanish: {
    auth: {
      title: 'MedXForce Circle',
      subtitle: 'Familia y amigos — comparta momentos con su ser querido',
      emailPlaceholder: 'Correo (debe coincidir con la invitación del paciente)',
      passwordPlaceholder: 'Contraseña',
      continueGoogle: 'Continuar con Google',
      signingIn: 'Iniciando sesión…',
      orEmailPassword: 'o correo y contraseña',
      signIn: 'Iniciar sesión',
      createAccount: 'Crear cuenta',
      googleHint:
        'La app del paciente MedXForce usa Google — use Continuar con Google si ya inicia sesión allí. El correo de Google debe coincidir exactamente con la invitación de Familia y amigos.',
      wrongPassword:
        'Contraseña incorrecta — o esta cuenta usa Google. Pruebe Continuar con Google.',
      emailInUse:
        'Este correo ya tiene una cuenta (a menudo con Google). Use Google o restablezca la contraseña en Firebase Authentication.',
      weakPassword: 'La contraseña debe tener al menos 6 caracteres.',
      invalidEmail: 'Introduzca un correo válido.',
      userNotFound: 'No hay cuenta para este correo. Use Crear cuenta.',
      authFailed: 'Error de autenticación',
      noInviteForEmail:
        'No se encontró invitación para {{email}}. En la app del paciente, guarde el contacto en Familia y amigos con este correo, pulse Hecho y luego Actualizar aquí.',
      inviteLinkFailed:
        'Invitación encontrada pero no se pudo vincular la cuenta. Revise la consola del navegador.',
      firestoreQuota:
        'Límite diario de escritura de Firestore alcanzado. Inténtelo después de medianoche (Pacífico) o actualice el plan de Firebase.',
      refreshFailed: 'No se pudieron actualizar las invitaciones.',
    },
    patients: {
      yourPatients: 'Sus pacientes',
      noInvitesYet:
        'Aún no hay invitaciones activas. En la app del paciente, abra Ajustes → Familia y amigos, confirme su correo, pulse Hecho y luego Actualizar aquí.',
    },
    brand: {
      startupTagline: 'MedXForce Circle — Familia y amigos',
    },
    ...appShellSpanish,
    common: {
      refresh: 'Actualizar',
      refreshing: 'Actualizando…',
      signOut: 'Cerrar sesión',
      saving: 'Guardando…',
      saved: 'Guardado',
      friendsFamily: 'Familia y amigos',
      ...appShellSpanish.common,
    },
  },
  Polish: {
    auth: {
      title: 'MedXForce Circle',
      subtitle: 'Rodzina i przyjaciele — dziel się chwilami z bliską osobą',
      emailPlaceholder: 'E-mail (musi zgadzać się z zaproszeniem pacjenta)',
      passwordPlaceholder: 'Hasło',
      continueGoogle: 'Kontynuuj z Google',
      signingIn: 'Logowanie…',
      orEmailPassword: 'lub e-mail i hasło',
      signIn: 'Zaloguj się',
      createAccount: 'Utwórz konto',
      googleHint:
        'Aplikacja pacjenta MedXForce używa Google — wybierz Kontynuuj z Google, jeśli tam się logujesz. Adres Google musi dokładnie odpowiadać zaproszeniu Rodzina i przyjaciele.',
      wrongPassword:
        'Błędne hasło — lub to konto używa logowania Google. Spróbuj Kontynuuj z Google.',
      emailInUse:
        'Ten e-mail ma już konto (często przez Google). Użyj Google lub zresetuj hasło w Firebase Authentication.',
      weakPassword: 'Hasło musi mieć co najmniej 6 znaków.',
      invalidEmail: 'Wprowadź prawidłowy adres e-mail.',
      userNotFound: 'Brak konta dla tego e-maila. Użyj Utwórz konto.',
      authFailed: 'Uwierzytelnianie nie powiodło się',
      noInviteForEmail:
        'Nie znaleziono zaproszenia dla {{email}}. W aplikacji pacjenta zapisz kontakt w Rodzina i przyjaciele z tym e-mailem, naciśnij Gotowe, a potem Odśwież tutaj.',
      inviteLinkFailed:
        'Znaleziono zaproszenie, ale nie udało się połączyć konta. Sprawdź konsolę przeglądarki.',
      firestoreQuota:
        'Osiągnięto dzienny limit zapisu Firestore. Spróbuj po północy (czas pacyficzny) lub ulepsz plan Firebase.',
      refreshFailed: 'Nie udało się odświeżyć zaproszeń.',
    },
    patients: {
      yourPatients: 'Twoi pacjenci',
      noInvitesYet:
        'Brak aktywnych zaproszeń. W aplikacji pacjenta otwórz Ustawienia → Rodzina i przyjaciele, zapisz e-mail, naciśnij Gotowe, a potem Odśwież tutaj.',
    },
    brand: {
      startupTagline: 'MedXForce Circle — Rodzina i przyjaciele',
    },
    ...appShellPolish,
    common: {
      refresh: 'Odśwież',
      refreshing: 'Odświeżanie…',
      signOut: 'Wyloguj się',
      saving: 'Zapisywanie…',
      saved: 'Zapisano',
      friendsFamily: 'Rodzina i przyjaciele',
      ...appShellPolish.common,
    },
  },
};

function resolvePath(tree: TranslationTree, path: string): string | undefined {
  const keys = path.split('.');
  let current: string | TranslationTree | undefined = tree;
  for (const key of keys) {
    if (!current || typeof current === 'string') return undefined;
    current = current[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function createCircleTranslator(language: CircleUiLanguage) {
  return (path: string, params?: Record<string, string | number>) => {
    const primary = resolvePath(CIRCLE_TRANSLATIONS[language], path);
    const english = resolvePath(CIRCLE_TRANSLATIONS.English, path);
    let text = primary ?? english ?? path;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        text = text.replaceAll(`{{${key}}}`, String(value));
      }
    }
    return text;
  };
}
