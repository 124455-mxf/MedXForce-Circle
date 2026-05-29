# MedXForce Circle (Friends & Family)

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

## Phase 0 — Invites

When a patient adds contacts in Settings, the patient app writes `circle_invites` documents. After sign-in, the circle app runs `acceptPendingCircleInvites()` to create `patients/{patientId}/members/{firebaseUid}` so Storage/Firestore upload rules work.

## Design

Matches patient app tokens: `#F8FAFC` background, `blue-600` primary, white `rounded-[32px]` cards, Inter font, Lucide icons.
