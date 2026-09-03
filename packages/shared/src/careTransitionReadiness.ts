/** Care transition readiness — shared Circle pack templates + progress helpers. */
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { CircleMemberRole } from './patientPermissions';
import { normalizeMemberRole } from './patientPermissions';
import type { TreatmentPhaseValue } from './treatmentPhase';
import { normalizeTreatmentPhaseForSchedule } from './treatmentPhase';
import { careTransitionRegionFromCountry } from './countries';
import {
  canPostCircleAnnouncement,
  createCircleMemberThreadPost,
} from './circleMemberThreads';

export type CareTransitionRegion = 'us' | 'de' | 'generic';
export type CareTransitionPackId =
  | 'crisis-icu'
  | 'icu-to-ward'
  | 'ward-to-acute'
  | 'acute-to-rehab'
  | 'rehab-to-home'
  | 'home-settle';

export type CareTransitionKnowCourse = {
  id: string;
  title: string;
  duration: string;
  audience: string;
  href: string;
};

export type CareTransitionChecklistItem = {
  id: string;
  title: string;
  why: string;
  when: string;
  roles: Array<'proxy' | 'caregiver' | 'family'>;
  regions: CareTransitionRegion[] | 'all';
  custom?: boolean;
  knowCourseIds?: string[];
};

export type CareTransitionCustomTask = {
  id: string;
  title: string;
  why: string;
  when: string;
};

export type CircleHelpTaskTranslation = {
  language: string;
  title: string;
  note?: string;
  isAuto?: boolean;
};

export type CircleHelpTask = {
  id: string;
  title: string;
  note: string;
  createdAt: number;
  createdByUid: string;
  createdByName: string;
  claimedByUid: string;
  claimedByName: string;
  assignedByUid: string;
  done: boolean;
  /** When the task was marked done (ms). */
  doneAt?: number;
  translations?: CircleHelpTaskTranslation[];
};

export type CareTransitionPack = {
  id: CareTransitionPackId;
  title: string;
  subtitle: string;
  kind: 'crisis' | 'transition' | 'settle';
  fromLabel: string;
  toLabel: string;
  mxPhase: string;
  audience: string;
  items: CareTransitionChecklistItem[];
  suggestedKnow: CareTransitionKnowCourse[];
};

export const CARE_TRANSITION_PACKS: CareTransitionPack[] = [
  {
    id: "crisis-icu",
    title: "Sudden ICU admission",
    subtitle:
      "Crisis entry — unexpected, unprepared. Orient the circle in the first 24–72 hours.",
    kind: "crisis",
    fromLabel: "Ordinary life",
    toLabel: "ICU",
    mxPhase: "ICU · Intensive care mode",
    audience: "Proxy, caregivers, and family",
    items: [
      {
        id: "c1",
        title: "Name one primary coordinator",
        why: "Avoid conflicting asks to nurses and duplicated updates in the family chat.",
        when: "First 24 hours",
        roles: ["proxy", "caregiver", "family"],
        regions: "all",
        knowCourseIds: ["know-circle-coordinator"],
      },
      {
        id: "c2",
        title: "Confirm who can receive clinical updates",
        why: "Hospitals limit who they talk to. Know the named contacts before the next rounds.",
        when: "First 24 hours",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "c3",
        title: "Capture baseline facts once",
        why: "Diagnosis working name, unit/bed, attending team, allergies, current devices.",
        when: "First 24 hours",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "c4",
        title: "Set a family communication rhythm",
        why: "One daily summary beats constant pinging. Decide channel + timing.",
        when: "First 48 hours",
        roles: ["proxy", "family", "caregiver"],
        regions: "all",
      },
      {
        id: "c5",
        title: "Ask what decisions may come this week",
        why: "Procedures, sedation, transfer out of ICU — reduce surprise.",
        when: "First 72 hours",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "c6",
        title: "Practical logistics for visitors",
        why: "Hours, parking, badge, overnight stay, food near the unit.",
        when: "First 48 hours",
        roles: ["family", "caregiver", "proxy"],
        regions: "all",
      },
      {
        id: "c7",
        title: "US: ask about HIPAA / authorized contacts",
        why: "Without authorization, staff may not share details with relatives.",
        when: "First 24 hours",
        roles: ["proxy", "caregiver"],
        regions: ["us"],
      },
      {
        id: "c8",
        title: "DE: clarify Betreuer / Vorsorgevollmacht status",
        why: "If decision capacity is unclear, know who is legally allowed to decide.",
        when: "First 72 hours",
        roles: ["proxy", "caregiver"],
        regions: ["de"],
      },
      {
        id: "c9",
        title: "Turn on Circle Intensive care essentials",
        why: "Patient tablet should stay calm and minimal while the circle carries logistics.",
        when: "When Circle is connected",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
    ],
    suggestedKnow: [
      {
        id: "know-icu-first72",
        title: "First 72 hours in the ICU — what families need to know",
        duration: "18 min",
        audience: "Family & caregivers",
        href: "https://know.medxforce.example/courses/icu-first-72",
      },
      {
        id: "know-circle-coordinator",
        title: "Being the circle coordinator without burning out",
        duration: "12 min",
        audience: "Proxy & caregivers",
        href: "https://know.medxforce.example/courses/circle-coordinator",
      },
    ],
  },
  {
    id: "icu-to-ward",
    title: "ICU → hospital floor",
    subtitle: "Step-down to a normal hospital floor. Monitoring drops; circle coverage must rise.",
    kind: "transition",
    fromLabel: "ICU",
    toLabel: "Hospital floor",
    mxPhase: "Still often ICU/Acute · Hospital mode",
    audience: "Proxy + caregivers",
    items: [
      {
        id: "w1",
        title: "Confirm transfer timing and new unit",
        why: "Families often learn after the move. Ask for the window and destination bed.",
        when: "Before transfer",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "w2",
        title: "Who covers nights and weekends now?",
        why: "Hospital floor staffing is thinner than ICU. Decide who the family calls first.",
        when: "Day of transfer",
        roles: ["proxy", "caregiver", "family"],
        regions: "all",
      },
      {
        id: "w3",
        title: "Review what still needs monitoring",
        why: "Breathing, swallowing, confusion, falls — know the new watch-outs.",
        when: "First hospital-floor day",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "w4",
        title: "Update Circle recovery stage if appropriate",
        why: "Keeps tablet layout and circle expectations aligned with the new setting.",
        when: "After transfer settles",
        roles: ["proxy"],
        regions: "all",
      },
    ],
    suggestedKnow: [
      {
        id: "know-stepdown",
        title: "Leaving the ICU: what changes on the ward",
        duration: "10 min",
        audience: "Whole circle",
        href: "https://know.medxforce.example/courses/icu-stepdown",
      },
    ],
  },
  {
    id: "ward-to-acute",
    title: "Hospital → acute care / skilled nursing / care facility",
    subtitle: "In the US especially: a facility often must be found — usually by the caregiver.",
    kind: "transition",
    fromLabel: "Hospital",
    toLabel: "Acute care / skilled nursing / care facility",
    mxPhase: "Acute · Hospital mode",
    audience: "Proxy + caregivers (family supports search)",
    items: [
      {
        id: "a1",
        title: "Ask case management for the discharge target date",
        why: "Facility hunt only works with a real timeline.",
        when: "As soon as transfer is likely",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "a2",
        title: "US: start facility shortlist with insurance fit",
        why: "Coverage, open bed, therapy intensity, and geography all constrain options.",
        when: "3–7 days before target",
        roles: ["proxy", "caregiver"],
        regions: ["us"],
        knowCourseIds: ["know-facility-hunt-us"],
      },
      {
        id: "a3",
        title: "US: confirm prior auth / insurance approval path",
        why: "A bed offer is useless if authorization lags.",
        when: "Before accepting a facility",
        roles: ["proxy", "caregiver"],
        regions: ["us"],
      },
      {
        id: "a4",
        title: "DE: clarify Anschlussheilbehandlung / Pflegeheim path",
        why: "Rehab vs nursing facility routes differ; ask Sozialdienst early.",
        when: "As soon as transfer is likely",
        roles: ["proxy", "caregiver"],
        regions: ["de"],
      },
      {
        id: "a5",
        title: "Tour or video-call top 2 facilities",
        why: "Therapy quality and staffing matter more than brochure photos.",
        when: "Before deciding",
        roles: ["caregiver", "family", "proxy"],
        regions: "all",
      },
      {
        id: "a6",
        title: "Pack list + meds reconciliation for transfer day",
        why: "Devices, glasses, chargers, advance directives, current med list.",
        when: "Day before transfer",
        roles: ["family", "caregiver"],
        regions: "all",
      },
      {
        id: "a7",
        title: "Name the receiving facility contact",
        why: "One phone number for admissions / nursing for the first 48 hours.",
        when: "Transfer day",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
    ],
    suggestedKnow: [
      {
        id: "know-facility-hunt-us",
        title: "Finding a skilled nursing / acute facility (US)",
        duration: "22 min",
        audience: "Proxy & caregivers",
        href: "https://know.medxforce.example/courses/us-facility-hunt",
      },
      {
        id: "know-transfer-day",
        title: "Transfer day checklist — what to pack and ask",
        duration: "8 min",
        audience: "Family & caregivers",
        href: "https://know.medxforce.example/courses/transfer-day",
      },
    ],
  },
  {
    id: "acute-to-rehab",
    title: "Acute → active rehab",
    subtitle: "Therapy becomes the job. Circle shifts from crisis logistics to participation support.",
    kind: "transition",
    fromLabel: "Acute / facility",
    toLabel: "Active recovery / rehab",
    mxPhase: "Active recovery · Hospital or User mode",
    audience: "Whole circle",
    items: [
      {
        id: "r1",
        title: "Confirm therapy schedule expectations",
        why: "Know how many sessions/day and what family can join.",
        when: "First rehab week",
        roles: ["proxy", "caregiver", "family"],
        regions: "all",
      },
      {
        id: "r2",
        title: "Align MedXForce assessments + check-ins",
        why: "Avoid overload: match tablet asks to rehab energy.",
        when: "First rehab week",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "r3",
        title: "Plan weekend coverage",
        why: "Motivation and loneliness dip when therapy slows.",
        when: "Ongoing",
        roles: ["family", "caregiver"],
        regions: "all",
      },
      {
        id: "r4",
        title: "Start home-readiness notes early",
        why: "Stairs, bathroom, who lives at home — discharge planning starts before discharge.",
        when: "Mid rehab",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "r5",
        title: "Expect emotional and personality changes",
        why:
          "After stroke or brain injury, mood swings, sudden tears or laughter, low confidence, or fear are common — not “being difficult.” Orient the circle so reactions stay kind.",
        when: "First rehab week",
        roles: ["proxy", "caregiver", "family"],
        regions: "all",
        knowCourseIds: ["know-emotional-changes"],
      },
      {
        id: "r6",
        title: "Support dignity — help without taking over",
        why:
          "Doing everything for the patient can speed logistics but slow recovery and self-worth. Ask before assisting; celebrate small wins.",
        when: "Ongoing in rehab",
        roles: ["family", "caregiver", "proxy"],
        regions: "all",
        knowCourseIds: ["know-rehab-partner"],
      },
    ],
    suggestedKnow: [
      {
        id: "know-rehab-partner",
        title: "How to support rehab without taking over",
        duration: "14 min",
        audience: "Family & caregivers",
        href: "https://know.medxforce.example/courses/rehab-partner",
      },
      {
        id: "know-emotional-changes",
        title: "After stroke / TBI: emotional changes families should expect",
        duration: "12 min",
        audience: "Whole circle",
        href: "https://know.medxforce.example/courses/emotional-changes",
      },
    ],
  },
  {
    id: "rehab-to-home",
    title: "Rehab / hospital → home",
    subtitle:
      "Discharge is where things get dropped — wheelchair, transport, meds, follow-ups.",
    kind: "transition",
    fromLabel: "Rehab / hospital",
    toLabel: "Home",
    mxPhase: "Daily life · User mode",
    audience: "Proxy + caregivers lead; family executes",
    items: [
      {
        id: "h1",
        title: "Confirm discharge date and ride home",
        why: "Transport is often the forgotten blocker on the day.",
        when: "48–72h before discharge",
        roles: ["proxy", "caregiver", "family"],
        regions: "all",
      },
      {
        id: "h2",
        title: "Wheelchair / walker / hospital bed ordered",
        why: "Hospitals sometimes forget DME. Caregiver should verify, not assume.",
        when: "Before discharge",
        roles: ["proxy", "caregiver"],
        regions: "all",
        knowCourseIds: ["know-home-discharge"],
      },
      {
        id: "h3",
        title: "US: DME supplier + insurance confirmation",
        why: "Delivery timing and co-pay surprises delay safe home return.",
        when: "Before discharge",
        roles: ["proxy", "caregiver"],
        regions: ["us"],
      },
      {
        id: "h4",
        title: "DE: Hilfsmittelverordnung / Pflegegrad check",
        why: "Prescriptions and Pflegekasse processes can lag discharge.",
        when: "Before discharge",
        roles: ["proxy", "caregiver"],
        regions: ["de"],
      },
      {
        id: "h5",
        title: "Meds list + who fills the first prescriptions",
        why: "Day-one gaps cause bounce-backs.",
        when: "Discharge day",
        roles: ["caregiver", "family", "proxy"],
        regions: "all",
      },
      {
        id: "h6",
        title: "First follow-up appointment scheduled",
        why: "Do not leave with “someone will call you.”",
        when: "Before leaving",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "h7",
        title: "Home safety walk-through",
        why: "Rugs, bathroom grab bars, bed height, night lights.",
        when: "Before or day of return",
        roles: ["family", "caregiver"],
        regions: "all",
      },
      {
        id: "h8",
        title: "Who to call in the first 72 hours",
        why: "Primary contact + after-hours number written in one place.",
        when: "Discharge day",
        roles: ["proxy", "caregiver", "family"],
        regions: "all",
      },
      {
        id: "h9",
        title: "Brief the circle on mood and confidence at home",
        why:
          "Leaving hospital can spike anxiety and grief about “who I am now.” One short family note reduces surprise and blame.",
        when: "Before or day of return",
        roles: ["proxy", "family", "caregiver"],
        regions: "all",
        knowCourseIds: ["know-emotional-changes"],
      },
    ],
    suggestedKnow: [
      {
        id: "know-home-discharge",
        title: "Home discharge: wheelchair, meds, and the first 72 hours",
        duration: "20 min",
        audience: "Proxy & caregivers",
        href: "https://know.medxforce.example/courses/home-discharge",
      },
      {
        id: "know-home-safety",
        title: "Home safety walk-through for stroke / TBI return",
        duration: "11 min",
        audience: "Family",
        href: "https://know.medxforce.example/courses/home-safety",
      },
      {
        id: "know-emotional-changes",
        title: "After stroke / TBI: emotional changes families should expect",
        duration: "12 min",
        audience: "Whole circle",
        href: "https://know.medxforce.example/courses/emotional-changes",
      },
    ],
  },
  {
    id: "home-settle",
    title: "First weeks at home",
    subtitle: "The crisis ends; the marathon starts. Keep the circle from disappearing.",
    kind: "settle",
    fromLabel: "Discharge day",
    toLabel: "Settled at home",
    mxPhase: "Daily life",
    audience: "Whole circle",
    items: [
      {
        id: "s1",
        title: "Agree a week-1 check-in cadence",
        why: "Prevent silent struggles in the first lonely week.",
        when: "First 7 days",
        roles: ["proxy", "family", "caregiver"],
        regions: "all",
      },
      {
        id: "s2",
        title: "Confirm home therapy / nursing visits",
        why: "No-shows happen; verify the calendar.",
        when: "First 7 days",
        roles: ["caregiver", "proxy"],
        regions: "all",
      },
      {
        id: "s3",
        title: "Tune MedXForce to daily-life mode",
        why: "Less ICU urgency, more participation, photos, diary, schedule.",
        when: "First week home",
        roles: ["proxy", "caregiver"],
        regions: "all",
      },
      {
        id: "s4",
        title: "Watch for caregiver burnout signals",
        why: "Rotate coverage before someone collapses.",
        when: "Ongoing",
        roles: ["proxy", "family"],
        regions: "all",
      },
      {
        id: "s5",
        title: "Watch for lasting low mood, fear, or withdrawal",
        why:
          "Depression and PTSD-like symptoms are common after stroke. Persistent hopelessness, panic, or shutting out the circle should be raised with the clinical team — Circle members notice; they do not diagnose.",
        when: "First weeks home",
        roles: ["proxy", "family", "caregiver"],
        regions: "all",
        knowCourseIds: ["know-emotional-changes"],
      },
      {
        id: "s6",
        title: "Protect confidence in everyday moments",
        why:
          "Rushing, correcting, or speaking over the patient deepens shame. Slow down, wait for answers, and invite participation in small decisions.",
        when: "Ongoing",
        roles: ["family", "caregiver", "proxy"],
        regions: "all",
      },
    ],
    suggestedKnow: [
      {
        id: "know-first-weeks-home",
        title: "The first weeks at home — keeping the circle engaged",
        duration: "15 min",
        audience: "Whole circle",
        href: "https://know.medxforce.example/courses/first-weeks-home",
      },
      {
        id: "know-caregiver-burnout",
        title: "Spotting caregiver burnout early",
        duration: "9 min",
        audience: "Proxy & family",
        href: "https://know.medxforce.example/courses/caregiver-burnout",
      },
      {
        id: "know-emotional-changes",
        title: "After stroke / TBI: emotional changes families should expect",
        duration: "12 min",
        audience: "Whole circle",
        href: "https://know.medxforce.example/courses/emotional-changes",
      },
    ],
  },
];

export type CareTransitionPackItemClaim = {
  itemId: string;
  claimedByUid: string;
  claimedByName: string;
};

export const CARE_TRANSITION_CLOSED_PACKS_MAX = 20;

export type ClosedCareTransitionPackReason = 'ended' | 'switched';

export type ClosedCareTransitionPackItem = {
  id: string;
  title: string;
  when: string;
  done: boolean;
};

export type ClosedCareTransitionPack = {
  id: string;
  packId: CareTransitionPackId;
  startedAt: number | null;
  endedAt: number;
  done: number;
  total: number;
  packNote: string;
  endedReason: ClosedCareTransitionPackReason;
  items: ClosedCareTransitionPackItem[];
};

export type CareTransitionReadinessState = {
  activePackId: CareTransitionPackId | null;
  region: CareTransitionRegion;
  doneIds: string[];
  dismissedIds: string[];
  customTasks: CareTransitionCustomTask[];
  circleHelpTasks: CircleHelpTask[];
  packItemClaims: CareTransitionPackItemClaim[];
  attachedKnow: CareTransitionKnowCourse[];
  /** When the current active pack was started (ms). */
  packActivatedAt?: number | null;
  /**
   * When true, region was chosen manually and should not be overwritten from patient country.
   */
  regionManual?: boolean;
  /**
   * False while the proxy is reviewing a selected pack. Missing/true = live with the circle
   * (legacy docs with an active pack and no flag stay live).
   */
  packLive?: boolean;
  /** Pack id for which an open-thread announcement was already posted. */
  announcedPackId?: CareTransitionPackId | null;
  announcementPostId?: string | null;
  /** Latest proxy note shown on the pack and included in the share announcement. */
  packNote?: string;
  /** Live packs that were ended or switched away from. Drafts are not stored. */
  closedPacks?: ClosedCareTransitionPack[];
  updatedAt: number;
  updatedByUid?: string;
};

export const EMPTY_CARE_TRANSITION_STATE: CareTransitionReadinessState = {
  activePackId: null,
  region: 'generic',
  doneIds: [],
  dismissedIds: [],
  customTasks: [],
  circleHelpTasks: [],
  packItemClaims: [],
  attachedKnow: [],
  packActivatedAt: null,
  regionManual: false,
  packLive: false,
  announcedPackId: null,
  announcementPostId: null,
  packNote: '',
  closedPacks: [],
  updatedAt: 0,
};

/** Max length for a proxy pack note (share announcement or follow-up). */
export const CARE_TRANSITION_PACK_NOTE_MAX = 2000;

export function getCareTransitionPack(id: CareTransitionPackId | null | undefined): CareTransitionPack | null {
  if (!id) return null;
  return CARE_TRANSITION_PACKS.find((p) => p.id === id) ?? null;
}

export function canManageCareTransitionPack(role: CircleMemberRole | string): boolean {
  return normalizeMemberRole(role) === 'proxy';
}

/** Pack is shared with caregiver/family. Legacy docs without packLive stay live. */
export function isCareTransitionPackLive(state: CareTransitionReadinessState): boolean {
  if (!state.activePackId) return false;
  return state.packLive !== false;
}

export function isCareTransitionPackDraft(state: CareTransitionReadinessState): boolean {
  return Boolean(state.activePackId) && state.packLive === false;
}

export function careTransitionLivePackId(
  state: CareTransitionReadinessState | null | undefined,
): CareTransitionPackId | null {
  if (!state || !isCareTransitionPackLive(state)) return null;
  return state.activePackId;
}

/** Pack the viewer may see: draft is proxy-only; live is the whole care team. */
export function careTransitionPackIdForViewer(
  state: CareTransitionReadinessState,
  role: CircleMemberRole | string,
): CareTransitionPackId | null {
  if (!state.activePackId) return null;
  if (isCareTransitionPackLive(state)) return state.activePackId;
  return canManageCareTransitionPack(role) ? state.activePackId : null;
}

/** Snapshot a live pack into history. Drafts are ignored. */
export function archiveLiveCareTransitionPack(
  state: CareTransitionReadinessState,
  reason: ClosedCareTransitionPackReason,
  endedAt = Date.now(),
): CareTransitionReadinessState {
  if (!isCareTransitionPackLive(state) || !state.activePackId) return state;
  const pack = getCareTransitionPack(state.activePackId);
  if (!pack) return state;
  const items = filterChecklistForViewer(
    pack,
    state.region,
    'proxy',
    state.customTasks,
    new Set(state.dismissedIds),
  );
  const doneSet = new Set(state.doneIds);
  const progress = careTransitionProgress(items, doneSet);
  const closed: ClosedCareTransitionPack = {
    id: `closed-${state.activePackId}-${endedAt}`,
    packId: state.activePackId,
    startedAt:
      typeof state.packActivatedAt === 'number' && state.packActivatedAt > 0
        ? state.packActivatedAt
        : null,
    endedAt,
    done: progress.done,
    total: progress.total,
    packNote: (state.packNote ?? '').trim().slice(0, CARE_TRANSITION_PACK_NOTE_MAX),
    endedReason: reason,
    items: items.map((item) => ({
      id: item.id.slice(0, 80),
      title: item.title.slice(0, 200),
      when: item.when.slice(0, 80),
      done: doneSet.has(item.id),
    })),
  };
  return {
    ...state,
    closedPacks: [closed, ...(state.closedPacks ?? [])].slice(
      0,
      CARE_TRANSITION_CLOSED_PACKS_MAX,
    ),
  };
}

export function beginCareTransitionPackReview(
  state: CareTransitionReadinessState,
  packId: CareTransitionPackId,
): CareTransitionReadinessState {
  const archived = archiveLiveCareTransitionPack(state, 'switched');
  return {
    ...archived,
    activePackId: packId,
    packLive: false,
    doneIds: [],
    dismissedIds: [],
    packItemClaims: [],
    packActivatedAt: null,
    announcedPackId: null,
    announcementPostId: null,
    packNote: '',
  };
}

/** End or discard the current pack. Live packs are archived; drafts are not. */
export function endCareTransitionPack(
  state: CareTransitionReadinessState,
  endedAt = Date.now(),
): CareTransitionReadinessState {
  const archived = archiveLiveCareTransitionPack(state, 'ended', endedAt);
  return {
    ...archived,
    activePackId: null,
    packLive: false,
    doneIds: [],
    dismissedIds: [],
    packItemClaims: [],
    packActivatedAt: null,
    announcedPackId: null,
    announcementPostId: null,
    packNote: '',
  };
}

/** Mark done / dismiss — care team and family; not friends. */
export function canWorkCareTransitionTasks(role: CircleMemberRole): boolean {
  const normalized = normalizeMemberRole(role);
  return (
    normalized === 'proxy' ||
    normalized === 'caregiver' ||
    normalized === 'professional_caregiver' ||
    normalized === 'family'
  );
}

/** Family and care team can add everyday Circle help; friends cannot. */
export function canAddCircleHelpTask(role: CircleMemberRole): boolean {
  return canWorkCareTransitionTasks(role);
}

export function canClaimCircleHelpTask(role: CircleMemberRole): boolean {
  return canWorkCareTransitionTasks(role);
}

export function canAssignCircleHelpTask(role: CircleMemberRole): boolean {
  return canManageCareTransitionPack(role);
}

/** Friends stay informed via announcements; they do not get a personal task list. */
export function canViewCareTransitionTasks(role: CircleMemberRole): boolean {
  return canWorkCareTransitionTasks(role);
}

export function suggestedPackForTreatmentPhase(
  phase: string | null | undefined,
): CareTransitionPackId | null {
  const normalized = normalizeTreatmentPhaseForSchedule(phase);
  if (!normalized) return null;
  switch (normalized as TreatmentPhaseValue) {
    case 'icu':
      return 'crisis-icu';
    case 'acute':
      return 'ward-to-acute';
    case 'rehab':
      return 'acute-to-rehab';
    case 'maintenance':
      return 'rehab-to-home';
    case 'palliative':
      return 'home-settle';
    default:
      return null;
  }
}

export function suggestedPackForPhaseTransition(
  fromPhase: string | null | undefined,
  toPhase: string | null | undefined,
): CareTransitionPackId | null {
  const from = normalizeTreatmentPhaseForSchedule(fromPhase);
  const to = normalizeTreatmentPhaseForSchedule(toPhase);
  if (!to) return null;
  if (to === 'icu') return 'crisis-icu';
  if (from === 'icu' && to === 'acute') return 'icu-to-ward';
  if (to === 'acute') return 'ward-to-acute';
  if (to === 'rehab') return 'acute-to-rehab';
  if (to === 'maintenance') return from === 'rehab' ? 'rehab-to-home' : 'home-settle';
  if (to === 'palliative') return 'home-settle';
  return suggestedPackForTreatmentPhase(to);
}

export type CareTransitionDraftPlanSkip = 'no-pack' | 'live-pack' | 'same-draft';

export type CareTransitionDraftPlan =
  | { skip: CareTransitionDraftPlanSkip }
  | { packId: CareTransitionPackId; next: CareTransitionReadinessState };

/**
 * Plan a proxy-only draft pack for a recovery-stage save.
 * Circle profile saves keep skipIfLive false (archive live, start the new draft).
 * Patient setup uses skipIfLive so a running pack is not interrupted.
 */
export function planCareTransitionDraftForPhase(
  state: CareTransitionReadinessState,
  fromPhase: string | null | undefined,
  toPhase: string | null | undefined,
  options?: {
    skipIfLive?: boolean;
    skipIfSameDraft?: boolean;
    country?: string | null;
  },
): CareTransitionDraftPlan {
  const packId = suggestedPackForPhaseTransition(fromPhase, toPhase);
  if (!packId) return { skip: 'no-pack' };
  if (options?.skipIfLive && isCareTransitionPackLive(state)) {
    return { skip: 'live-pack' };
  }
  if (
    options?.skipIfSameDraft !== false &&
    isCareTransitionPackDraft(state) &&
    state.activePackId === packId
  ) {
    return { skip: 'same-draft' };
  }
  let next = beginCareTransitionPackReview(state, packId);
  if (!next.regionManual) {
    const country = options?.country?.trim();
    if (country) {
      next = { ...next, region: careTransitionRegionFromCountry(country) };
    }
  }
  return { packId, next };
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 200);
}

function parseCustomTasks(raw: unknown): CareTransitionCustomTask[] {
  if (!Array.isArray(raw)) return [];
  const out: CareTransitionCustomTask[] = [];
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!id || !title) continue;
    out.push({
      id: id.slice(0, 80),
      title: title.slice(0, 200),
      why: typeof row.why === 'string' ? row.why.slice(0, 500) : '',
      when: typeof row.when === 'string' ? row.when.slice(0, 80) : 'Custom',
    });
  }
  return out;
}

function parseCircleHelpTaskTranslations(raw: unknown): CircleHelpTaskTranslation[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const parsed: CircleHelpTaskTranslation[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const language = typeof row.language === 'string' ? row.language.trim() : '';
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!language || !title) continue;
    const item: CircleHelpTaskTranslation = { language, title: title.slice(0, 200) };
    if (row.isAuto === true) item.isAuto = true;
    const note = typeof row.note === 'string' ? row.note.trim().slice(0, 500) : '';
    if (note) item.note = note;
    parsed.push(item);
  }
  return parsed.length > 0 ? parsed : undefined;
}

function parseCircleHelpTasks(raw: unknown): CircleHelpTask[] {
  if (!Array.isArray(raw)) return [];
  const out: CircleHelpTask[] = [];
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const createdByUid = typeof row.createdByUid === 'string' ? row.createdByUid : '';
    if (!id || !title || !createdByUid) continue;
    const translations = parseCircleHelpTaskTranslations(row.translations);
    out.push({
      id: id.slice(0, 80),
      title: title.slice(0, 200),
      note: typeof row.note === 'string' ? row.note.slice(0, 500) : '',
      createdAt: typeof row.createdAt === 'number' ? row.createdAt : 0,
      createdByUid: createdByUid.slice(0, 128),
      createdByName:
        typeof row.createdByName === 'string' && row.createdByName.trim()
          ? row.createdByName.trim().slice(0, 200)
          : 'Circle member',
      claimedByUid: typeof row.claimedByUid === 'string' ? row.claimedByUid.slice(0, 128) : '',
      claimedByName: typeof row.claimedByName === 'string' ? row.claimedByName.slice(0, 200) : '',
      assignedByUid: typeof row.assignedByUid === 'string' ? row.assignedByUid.slice(0, 128) : '',
      done: row.done === true,
      ...(typeof row.doneAt === 'number' && row.doneAt > 0 ? { doneAt: row.doneAt } : {}),
      ...(translations ? { translations } : {}),
    });
  }
  return out;
}

export function circleHelpOpenCount(tasks: CircleHelpTask[]): number {
  return tasks.filter((task) => !task.done).length;
}

export function circleHelpCompletedCount(tasks: CircleHelpTask[]): number {
  return tasks.filter((task) => task.done).length;
}

export function parsePackItemClaims(raw: unknown): CareTransitionPackItemClaim[] {
  if (!Array.isArray(raw)) return [];
  const out: CareTransitionPackItemClaim[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 80)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const itemId = typeof row.itemId === 'string' ? row.itemId.trim() : '';
    const claimedByUid = typeof row.claimedByUid === 'string' ? row.claimedByUid.trim() : '';
    const claimedByName = typeof row.claimedByName === 'string' ? row.claimedByName.trim() : '';
    if (!itemId || !claimedByUid || seen.has(itemId)) continue;
    seen.add(itemId);
    out.push({
      itemId: itemId.slice(0, 80),
      claimedByUid: claimedByUid.slice(0, 128),
      claimedByName: (claimedByName || 'Circle member').slice(0, 200),
    });
  }
  return out;
}

export function serializePackItemClaim(claim: CareTransitionPackItemClaim): CareTransitionPackItemClaim {
  return {
    itemId: claim.itemId.slice(0, 80),
    claimedByUid: claim.claimedByUid.slice(0, 128),
    claimedByName: claim.claimedByName.slice(0, 200),
  };
}

export function careTransitionItemClaim(
  claims: CareTransitionPackItemClaim[] | undefined,
  itemId: string,
): CareTransitionPackItemClaim | undefined {
  return (claims ?? []).find((claim) => claim.itemId === itemId);
}

export function serializeCircleHelpTask(task: CircleHelpTask): CircleHelpTask {
  return {
    id: task.id.slice(0, 80),
    title: task.title.slice(0, 200),
    note: task.note.slice(0, 500),
    createdAt: task.createdAt,
    createdByUid: task.createdByUid.slice(0, 128),
    createdByName: task.createdByName.slice(0, 200),
    claimedByUid: task.claimedByUid.slice(0, 128),
    claimedByName: task.claimedByName.slice(0, 200),
    assignedByUid: task.assignedByUid.slice(0, 128),
    done: task.done === true,
    ...(typeof task.doneAt === 'number' && task.doneAt > 0 ? { doneAt: task.doneAt } : {}),
    ...(task.translations?.length ? { translations: task.translations } : {}),
  };
}

function parseKnowCourses(raw: unknown): CareTransitionKnowCourse[] {
  if (!Array.isArray(raw)) return [];
  const out: CareTransitionKnowCourse[] = [];
  for (const item of raw.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const href = typeof row.href === 'string' ? row.href.trim() : '';
    if (!id || !title || !href) continue;
    out.push({
      id: id.slice(0, 80),
      title: title.slice(0, 200),
      duration: typeof row.duration === 'string' ? row.duration.slice(0, 40) : 'Link',
      audience: typeof row.audience === 'string' ? row.audience.slice(0, 80) : 'Circle',
      href: href.slice(0, 500),
    });
  }
  return out;
}

function parseClosedPacks(raw: unknown): ClosedCareTransitionPack[] {
  if (!Array.isArray(raw)) return [];
  const out: ClosedCareTransitionPack[] = [];
  for (const item of raw.slice(0, CARE_TRANSITION_CLOSED_PACKS_MAX)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const packIdRaw = typeof row.packId === 'string' ? row.packId : '';
    const packId = CARE_TRANSITION_PACKS.some((p) => p.id === packIdRaw)
      ? (packIdRaw as CareTransitionPackId)
      : null;
    const endedAt = typeof row.endedAt === 'number' && row.endedAt > 0 ? row.endedAt : 0;
    if (!packId || !endedAt) continue;
    const id =
      typeof row.id === 'string' && row.id.trim()
        ? row.id.trim()
        : `closed-${packId}-${endedAt}`;
    const total = typeof row.total === 'number' && row.total >= 0 ? Math.round(row.total) : 0;
    const done = typeof row.done === 'number' && row.done >= 0 ? Math.round(row.done) : 0;
    const items: ClosedCareTransitionPackItem[] = [];
    if (Array.isArray(row.items)) {
      for (const rawItem of row.items.slice(0, 40)) {
        if (!rawItem || typeof rawItem !== 'object') continue;
        const item = rawItem as Record<string, unknown>;
        const itemId = typeof item.id === 'string' ? item.id.trim() : '';
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        if (!itemId || !title) continue;
        items.push({
          id: itemId.slice(0, 80),
          title: title.slice(0, 200),
          when: typeof item.when === 'string' ? item.when.slice(0, 80) : '',
          done: item.done === true,
        });
      }
    }
    out.push({
      id: id.slice(0, 80),
      packId,
      startedAt:
        typeof row.startedAt === 'number' && row.startedAt > 0 ? row.startedAt : null,
      endedAt,
      done: Math.min(done, 80),
      total: Math.min(total, 80),
      packNote:
        typeof row.packNote === 'string'
          ? row.packNote.trim().slice(0, CARE_TRANSITION_PACK_NOTE_MAX)
          : '',
      endedReason: row.endedReason === 'switched' ? 'switched' : 'ended',
      items,
    });
  }
  return out;
}

function serializeClosedPack(row: ClosedCareTransitionPack): Record<string, unknown> {
  return {
    id: row.id.slice(0, 80),
    packId: row.packId,
    startedAt: row.startedAt && row.startedAt > 0 ? row.startedAt : 0,
    endedAt: row.endedAt,
    done: row.done,
    total: row.total,
    packNote: row.packNote.slice(0, CARE_TRANSITION_PACK_NOTE_MAX),
    endedReason: row.endedReason,
    items: (row.items ?? []).slice(0, 40).map((item) => ({
      id: item.id.slice(0, 80),
      title: item.title.slice(0, 200),
      when: item.when.slice(0, 80),
      done: item.done === true,
    })),
  };
}

export function parseCareTransitionReadinessState(
  data: Record<string, unknown> | undefined,
): CareTransitionReadinessState {
  if (!data) return { ...EMPTY_CARE_TRANSITION_STATE };
  const packId = typeof data.activePackId === 'string' ? data.activePackId : null;
  const activePackId =
    packId && CARE_TRANSITION_PACKS.some((p) => p.id === packId)
      ? (packId as CareTransitionPackId)
      : null;
  const regionRaw = typeof data.region === 'string' ? data.region : 'generic';
  const region: CareTransitionRegion =
    regionRaw === 'us' || regionRaw === 'de' || regionRaw === 'generic' ? regionRaw : 'generic';
  return {
    activePackId,
    region,
    doneIds: asStringArray(data.doneIds).slice(0, 80),
    dismissedIds: asStringArray(data.dismissedIds).slice(0, 80),
    customTasks: parseCustomTasks(data.customTasks),
    circleHelpTasks: parseCircleHelpTasks(data.circleHelpTasks),
    packItemClaims: parsePackItemClaims(data.packItemClaims),
    attachedKnow: parseKnowCourses(data.attachedKnow),
    packActivatedAt:
      typeof data.packActivatedAt === 'number' && data.packActivatedAt > 0
        ? data.packActivatedAt
        : null,
    regionManual: data.regionManual === true,
    packLive: activePackId
      ? data.packLive === false
        ? false
        : data.packLive === true
          ? true
          : typeof data.packActivatedAt === 'number' && data.packActivatedAt > 0
      : false,
    announcedPackId:
      typeof data.announcedPackId === 'string' &&
      CARE_TRANSITION_PACKS.some((p) => p.id === data.announcedPackId)
        ? (data.announcedPackId as CareTransitionPackId)
        : null,
    announcementPostId:
      typeof data.announcementPostId === 'string' ? data.announcementPostId : null,
    packNote:
      typeof data.packNote === 'string'
        ? data.packNote.trim().slice(0, CARE_TRANSITION_PACK_NOTE_MAX)
        : '',
    closedPacks: parseClosedPacks(data.closedPacks),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
    updatedByUid: typeof data.updatedByUid === 'string' ? data.updatedByUid : undefined,
  };
}

export function careTransitionReadinessRef(db: Firestore, patientId: string) {
  return doc(db, 'patients', patientId, 'care_transition_readiness', 'state');
}

export async function readCareTransitionReadinessState(
  db: Firestore,
  patientId: string,
): Promise<CareTransitionReadinessState> {
  const snap = await getDoc(careTransitionReadinessRef(db, patientId));
  if (!snap.exists()) return { ...EMPTY_CARE_TRANSITION_STATE };
  return parseCareTransitionReadinessState(snap.data() as Record<string, unknown>);
}

export async function writeCareTransitionReadinessState(
  db: Firestore,
  patientId: string,
  state: CareTransitionReadinessState,
  updatedByUid?: string,
): Promise<CareTransitionReadinessState> {
  const next: CareTransitionReadinessState = {
    ...state,
    updatedAt: Date.now(),
    updatedByUid,
  };
  // Explicit payload — omit undefined / null optional fields so rules hasOnly stays stable.
  const payload: Record<string, unknown> = {
    activePackId: next.activePackId,
    region: next.region,
    doneIds: next.doneIds,
    dismissedIds: next.dismissedIds,
    customTasks: next.customTasks,
    circleHelpTasks: (next.circleHelpTasks ?? []).map(serializeCircleHelpTask),
    packItemClaims: (next.packItemClaims ?? []).map(serializePackItemClaim),
    attachedKnow: next.attachedKnow,
    updatedAt: next.updatedAt,
  };
  if (typeof next.updatedByUid === 'string' && next.updatedByUid.length > 0) {
    payload.updatedByUid = next.updatedByUid;
  }
  if (typeof next.announcedPackId === 'string' && next.announcedPackId.length > 0) {
    payload.announcedPackId = next.announcedPackId;
  }
  if (typeof next.announcementPostId === 'string' && next.announcementPostId.length > 0) {
    payload.announcementPostId = next.announcementPostId;
  }
  payload.packNote = (next.packNote ?? '').trim().slice(0, CARE_TRANSITION_PACK_NOTE_MAX);
  payload.closedPacks = (next.closedPacks ?? [])
    .slice(0, CARE_TRANSITION_CLOSED_PACKS_MAX)
    .map(serializeClosedPack);
  if (typeof next.packActivatedAt === 'number' && next.packActivatedAt > 0) {
    payload.packActivatedAt = next.packActivatedAt;
  } else {
    payload.packActivatedAt = 0;
  }
  payload.regionManual = next.regionManual === true;
  payload.packLive = isCareTransitionPackLive(next);
  try {
    await setDoc(careTransitionReadinessRef(db, patientId), payload, { merge: true });
  } catch (err) {
    if ('closedPacks' in payload) {
      const { closedPacks: _closed, ...withoutClosed } = payload;
      try {
        await setDoc(careTransitionReadinessRef(db, patientId), withoutClosed, { merge: true });
        return next;
      } catch {
        // Fall through to older field fallbacks.
      }
    }
    if ('packNote' in payload) {
      const { packNote: _note, ...withoutNote } = payload;
      try {
        await setDoc(careTransitionReadinessRef(db, patientId), withoutNote, { merge: true });
        return next;
      } catch {
        // Fall through to older field fallbacks.
      }
    }
    if ('circleHelpTasks' in payload || 'packItemClaims' in payload) {
      const {
        circleHelpTasks: _help,
        packItemClaims: _claims,
        packActivatedAt: _a,
        regionManual: _b,
        packLive: _c,
        ...withoutNew
      } = payload;
      await setDoc(careTransitionReadinessRef(db, patientId), withoutNew, {
        merge: true,
      });
      return next;
    }
    if (
      'packActivatedAt' in payload ||
      'regionManual' in payload ||
      'packLive' in payload ||
      'packItemClaims' in payload
    ) {
      const {
        packActivatedAt: _a,
        regionManual: _b,
        packLive: _c,
        packItemClaims: _claims,
        ...withoutNew
      } = payload;
      await setDoc(careTransitionReadinessRef(db, patientId), withoutNew, {
        merge: true,
      });
      return next;
    }
    throw err;
  }
  return next;
}

export async function ensureDraftCareTransitionPackForPhase(
  db: Firestore,
  patientId: string,
  fromPhase: string | null | undefined,
  toPhase: string | null | undefined,
  updatedByUid?: string,
  options?: {
    skipIfLive?: boolean;
    skipIfSameDraft?: boolean;
    country?: string | null;
  },
): Promise<
  | { status: 'skipped'; reason: CareTransitionDraftPlanSkip }
  | { status: 'written'; packId: CareTransitionPackId; state: CareTransitionReadinessState }
> {
  const current = await readCareTransitionReadinessState(db, patientId);
  const planned = planCareTransitionDraftForPhase(current, fromPhase, toPhase, options);
  if ('skip' in planned) {
    return { status: 'skipped', reason: planned.skip };
  }
  const written = await writeCareTransitionReadinessState(
    db,
    patientId,
    planned.next,
    updatedByUid,
  );
  return { status: 'written', packId: planned.packId, state: written };
}

export function careTransitionPackRemainingCount(
  state: CareTransitionReadinessState,
  role: CircleMemberRole,
): number {
  // Draft checklist items are not open work until the proxy shares the pack.
  if (!isCareTransitionPackLive(state)) return 0;
  const items = careTransitionVisiblePackItems(state, role);
  const done = new Set(state.doneIds);
  return items.filter((item) => !done.has(item.id)).length;
}

/** Proxy-only: one badge for a draft pack (continue review), not the checklist size. */
export function careTransitionDraftReviewCount(
  state: CareTransitionReadinessState,
  role: CircleMemberRole | string,
): number {
  if (!isCareTransitionPackDraft(state)) return 0;
  return canManageCareTransitionPack(role) ? 1 : 0;
}

/** Pack checklist the viewer may work. Proxy still sees a draft for review. */
export function careTransitionVisiblePackItems(
  state: CareTransitionReadinessState,
  role: CircleMemberRole,
) {
  const pack = getCareTransitionPack(careTransitionPackIdForViewer(state, role));
  if (!pack) return [];
  return filterChecklistForViewer(
    pack,
    state.region,
    role,
    state.customTasks,
    new Set(state.dismissedIds),
  );
}

export function careTransitionOpenItemCount(
  state: CareTransitionReadinessState,
  role: CircleMemberRole,
): number {
  return (
    circleHelpOpenCount(state.circleHelpTasks ?? []) +
    careTransitionPackRemainingCount(state, role) +
    careTransitionDraftReviewCount(state, role)
  );
}

/**
 * Tasks folder: open Circle-help plus remaining items on a live pack.
 * A draft pack badges 1 for the proxy (review/share), 0 for everyone else.
 * Completed Circle-help and completed pack items stay on the list, not on the badge.
 */
export function careTransitionFolderCounts(
  state: CareTransitionReadinessState,
  role: CircleMemberRole,
): { total: number; unread: number } {
  const remaining = careTransitionOpenItemCount(state, role);
  return {
    total: remaining,
    unread: remaining,
  };
}

export type CareTransitionHomeOpenItem =
  | {
      kind: 'help';
      id: string;
      claimedByUid: string;
      task: CircleHelpTask;
    }
  | {
      kind: 'pack';
      id: string;
      claimedByUid: string;
      item: CareTransitionChecklistItem;
    };

/** Open Circle help plus remaining live-pack items, claimed-by-viewer first. */
export function careTransitionHomeOpenItems(
  state: CareTransitionReadinessState,
  role: CircleMemberRole,
  viewerUid: string,
): CareTransitionHomeOpenItem[] {
  const help: CareTransitionHomeOpenItem[] = (state.circleHelpTasks ?? [])
    .filter((task) => !task.done)
    .map((task) => ({
      kind: 'help',
      id: `help:${task.id}`,
      claimedByUid: task.claimedByUid,
      task,
    }));
  const pack: CareTransitionHomeOpenItem[] = isCareTransitionPackLive(state)
    ? careTransitionVisiblePackItems(state, role)
        .filter((item) => !state.doneIds.includes(item.id))
        .map((item) => ({
          kind: 'pack',
          id: `pack:${item.id}`,
          claimedByUid: careTransitionItemClaim(state.packItemClaims, item.id)?.claimedByUid ?? '',
          item,
        }))
    : [];
  return [...help, ...pack].sort((a, b) => {
    const aMine = a.claimedByUid && a.claimedByUid === viewerUid ? 0 : 1;
    const bMine = b.claimedByUid && b.claimedByUid === viewerUid ? 0 : 1;
    if (aMine !== bMine) return aMine - bMine;
    if (a.kind === 'help' && b.kind === 'help') return b.task.createdAt - a.task.createdAt;
    if (a.kind === b.kind) return 0;
    return a.kind === 'help' ? -1 : 1;
  });
}

export function buildCareTransitionAnnouncementText(
  packId: CareTransitionPackId,
  note?: string,
): string {
  const pack = getCareTransitionPack(packId);
  if (!pack) return 'Care transition readiness checklist is available.';
  const trimmedNote = (note?.trim() ?? '').slice(0, CARE_TRANSITION_PACK_NOTE_MAX);
  return [
    pack.title,
    ...(trimmedNote ? ['', trimmedNote] : []),
    '',
    pack.subtitle,
    '',
    'Open Care transition readiness on Home or under Circle → checklist to mark items done or dismiss what does not apply.',
  ].join('\n');
}

export function buildCareTransitionPackNoteText(packId: CareTransitionPackId, note: string): string {
  const pack = getCareTransitionPack(packId);
  return [pack?.title ?? 'Care transition readiness', '', note.trim().slice(0, CARE_TRANSITION_PACK_NOTE_MAX)].join('\n');
}

function careTransitionAnnouncementSessionKey(patientId: string, packId: string): string {
  return `mxf-ct-announced:${patientId}:${packId}`;
}

/** In-flight lock so concurrent callers cannot double-post. Cleared after each attempt. */
const careTransitionAnnouncementInFlight = new Set<string>();

/** Post a one-time open-thread announcement when a pack becomes active (proxy/caregiver only). */
export async function ensureCareTransitionAnnouncementPosted(
  db: Firestore,
  params: {
    patientId: string;
    packId: CareTransitionPackId;
    state: CareTransitionReadinessState;
    authorUid: string;
    authorName: string;
    authorRole: CircleMemberRole;
    /** Localized announcement body; falls back to English pack text when omitted. */
    announcementText?: string;
  },
): Promise<CareTransitionReadinessState> {
  if (
    params.state.announcedPackId === params.packId &&
    typeof params.state.announcementPostId === 'string' &&
    params.state.announcementPostId.length > 0
  ) {
    // Includes 'pending' claims — never create a second post for the same pack.
    return params.state;
  }
  if (!canPostCircleAnnouncement(params.authorRole)) {
    return params.state;
  }

  const sessionKey = careTransitionAnnouncementSessionKey(params.patientId, params.packId);
  if (careTransitionAnnouncementInFlight.has(sessionKey)) {
    return params.state;
  }
  careTransitionAnnouncementInFlight.add(sessionKey);

  try {
    const postId = await createCircleMemberThreadPost(db, {
      patientId: params.patientId,
      threadKind: 'open',
      authorUid: params.authorUid,
      authorName: params.authorName,
      authorRole: params.authorRole,
      text: params.announcementText ?? buildCareTransitionAnnouncementText(params.packId),
      postKind: 'announcement',
    });

    const next: CareTransitionReadinessState = {
      ...params.state,
      activePackId: params.packId,
      announcedPackId: params.packId,
      announcementPostId: postId,
    };

    try {
      return await writeCareTransitionReadinessState(db, params.patientId, next, params.authorUid);
    } catch (err) {
      // Post already created once. If rules reject announcement fields, keep local markers
      // so callers do not retry posting in this session.
      console.warn('[careTransitionReadiness] could not persist announcement markers', err);
      return next;
    }
  } finally {
    careTransitionAnnouncementInFlight.delete(sessionKey);
  }
}

/** Extra pack note after the pack is already live — always posts a new announcement. */
export async function postCareTransitionPackNoteAnnouncement(
  db: Firestore,
  params: {
    patientId: string;
    packId: CareTransitionPackId;
    authorUid: string;
    authorName: string;
    authorRole: CircleMemberRole;
    note: string;
    announcementText?: string;
  },
): Promise<string | null> {
  const note = params.note.trim().slice(0, CARE_TRANSITION_PACK_NOTE_MAX);
  if (!note) return null;
  if (!canPostCircleAnnouncement(params.authorRole)) return null;
  const text = params.announcementText?.trim() || buildCareTransitionPackNoteText(params.packId, note);
  return createCircleMemberThreadPost(db, {
    patientId: params.patientId,
    threadKind: 'open',
    authorUid: params.authorUid,
    authorName: params.authorName,
    authorRole: params.authorRole,
    text,
    postKind: 'announcement',
  });
}

export function filterChecklistForViewer(
  pack: CareTransitionPack,
  region: CareTransitionRegion,
  role: CircleMemberRole,
  customTasks: CareTransitionCustomTask[],
  dismissedIds: ReadonlySet<string>,
): CareTransitionChecklistItem[] {
  if (!canViewCareTransitionTasks(role)) return [];

  const viewerRole: 'proxy' | 'caregiver' | 'family' =
    role === 'proxy' ? 'proxy' : role === 'family' ? 'family' : 'caregiver';

  const template = pack.items.filter((item) => {
    if (!item.roles.includes(viewerRole)) return false;
    if (item.regions === 'all') return true;
    if (region === 'generic') return false;
    return item.regions.includes(region);
  });

  const custom: CareTransitionChecklistItem[] = customTasks.map((task) => ({
    id: task.id,
    title: task.title,
    why: task.why || 'Added by your circle for this patient.',
    when: task.when || 'Custom',
    roles: ['proxy', 'caregiver', 'family'],
    regions: 'all',
    custom: true,
  }));

  return [...template, ...custom].filter((item) => !dismissedIds.has(item.id));
}

export function careTransitionProgress(
  items: CareTransitionChecklistItem[],
  doneIds: ReadonlySet<string>,
): { done: number; total: number; percent: number } {
  const total = items.length;
  const done = items.filter((i) => doneIds.has(i.id)).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}
