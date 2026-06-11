# MedXForce Circle (Family & Friends)

Separate monorepo from the **patient tablet app** (`medxforce`). **Do not merge these repos** — open this folder as its **own Cursor window** (File → Open Folder → `medxforce-circle`) so patient and circle code never intermingle.

## Structure

```
medxforce-circle/
  apps/circle/          Vite + React (web + mobile-friendly PWA later)
  packages/shared/      Firebase, gallery schema, RBAC, invite acceptance
```

The patient app lives in `../medxforce` and consumes the same Firebase project (Firestore, Storage, Auth).

## Setup

1. Copy Firebase web config from the patient app into `apps/circle/.env` (see `.env.example`).
2. From this folder:

```bash
npm install
npm run dev
```

3. Open http://localhost:5174 (circle app; patient app typically uses another port).

## Production hosting (Firebase Hosting)

The Circle app is a static Vite SPA — it is hosted on **Firebase Hosting** in the same Firebase project as the patient app (the patient app itself runs on Cloud Run).

### One-time setup

1. Install Firebase CLI if needed: `npm install -g firebase-tools`
2. Log in: `firebase login`
3. In [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/gen-lang-client-0333368246/authentication/settings), add:
   - `gen-lang-client-0333368246.web.app`
   - `gen-lang-client-0333368246.firebaseapp.com`
   - Any custom domain you attach later

### Deploy

From this folder:

```bash
npm run deploy:hosting
```

This runs a production build (`apps/circle/.env.production`) and publishes `apps/circle/dist` to Firebase Hosting.

**Live URLs after deploy:**

- https://gen-lang-client-0333368246.web.app
- https://gen-lang-client-0333368246.firebaseapp.com

If you use a named Firestore database locally, set `VITE_FIREBASE_FIRESTORE_DATABASE_ID` in `apps/circle/.env.production` before deploying.

## Internationalization

Circle UI languages match the patient app: **English, German, Spanish, Polish**.

- `apps/circle/src/translations.ts` — merges `appShell`, `messagesScreen`, `circleScreen`, `diaryScreen`, `galleryScreen`, and `adminScreen` catalogs
- `apps/circle/src/lib/circleI18nContext.tsx` — `CircleI18nProvider` + `useCircleT()` for signed-in UI
- `apps/circle/src/hooks/useCircleI18n.tsx` — reads `circle_profiles/{uid}.language` when signed in
- Set language in **Settings → My contact details**; the sign-in screen uses localStorage until profile loads

**Translated after sign-in:** bottom nav, profile drawer, messaging settings (incl. sort order), dashboard section titles and widget labels, **Messages** (inbox, threads, communication log, alert/attention tabs, reply composer), **Circle conversation** (open/restricted threads, composer, hide/delete modals), **Diary** (timeline, entry modal, mood labels, delete confirm), **Gallery** (browse, albums, upload progress, toasts), and **Admin** (patient profile review/editor, user management, contact editor, invite confirm modals).

**Still English-only:** analytics, remote settings, and other secondary modals — migrate incrementally to `t('…')`.

## Phase 0 — Invites

When a patient adds contacts in Settings, the patient app writes `circle_invites` documents. After sign-in, the circle app runs `acceptPendingCircleInvites()` to create `patients/{patientId}/members/{firebaseUid}` so Storage/Firestore upload rules work.

## Design

Matches patient app tokens: `#F8FAFC` background, `blue-600` primary, white `rounded-[32px]` cards, Inter font, Lucide icons.
