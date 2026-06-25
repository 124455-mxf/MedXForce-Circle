/** @license SPDX-License-Identifier: Apache-2.0 */
import { circleRoleFromContact, normalizeInviteEmail, type CircleMemberRole } from '@medxforce/shared';

export type CircleMapGalleryPhoto = {
  source?: string;
  senderName?: string;
  date?: number;
};

export type CircleMapOnlineMember = {
  email: string;
  photoUrl?: string;
};

function getRecipientSelectionKey(c: { id?: string; email?: string }): string {
  if (c.id != null && String(c.id).trim() !== '') return String(c.id);
  return (c.email || '').trim();
}

function circleRoleLabelKey(role: CircleMemberRole): string {
  if (role === 'professional_caregiver' || role === 'facility_staff') {
    return 'dashboard.circleMap.roles.caregiver';
  }
  if (role === 'friend' || role === 'family' || role === 'caregiver' || role === 'proxy') {
    return `dashboard.circleMap.roles.${role}`;
  }
  return 'dashboard.circleMap.roles.contact';
}

export type CircleMapViewMode = 'roles' | 'relationships' | 'engagement';

export type CircleMapEngagement = {
  messagesSent: number;
  repliesReceived: number;
  mediaShared: number;
  score: number;
};

export type CircleMapNode = {
  id: string;
  name: string;
  email: string;
  initials: string;
  photoUrl?: string;
  ringKey: string;
  ringLabel: string;
  relationshipDisplay: string;
  roleDisplay: string;
  ringIndex: number;
  color: string;
  accent: string;
  isOnline: boolean;
  isMessagingOnly: boolean;
  engagement: CircleMapEngagement;
  angle: number;
  radius: number;
};

export type CircleMapRing = {
  key: string;
  label: string;
  index: number;
  color: string;
  dashed?: boolean;
  radius?: number;
};

export type CircleMapModel = {
  patientName: string;
  patientPhotoUrl?: string;
  nodes: CircleMapNode[];
  rings: CircleMapRing[];
};

const ROLE_RING_ORDER: { key: string; labelKey: string; color: string; accent: string }[] = [
  { key: 'proxy', labelKey: 'dashboard.circleMap.roles.proxy', color: '#7c3aed', accent: '#a78bfa' },
  { key: 'caregiver', labelKey: 'dashboard.circleMap.roles.caregiver', color: '#2563eb', accent: '#60a5fa' },
  { key: 'family', labelKey: 'dashboard.circleMap.roles.family', color: '#ea580c', accent: '#fb923c' },
  { key: 'friend', labelKey: 'dashboard.circleMap.roles.friend', color: '#0d9488', accent: '#2dd4bf' },
  { key: 'contact', labelKey: 'dashboard.circleMap.roles.contact', color: '#64748b', accent: '#94a3b8' },
];

const RELATIONSHIP_PALETTE = [
  { color: '#db2777', accent: '#f472b6' },
  { color: '#ea580c', accent: '#fb923c' },
  { color: '#0d9488', accent: '#2dd4bf' },
  { color: '#2563eb', accent: '#60a5fa' },
  { color: '#64748b', accent: '#94a3b8' },
  { color: '#475569', accent: '#94a3b8' },
];

export type RelationshipBucket = 'spouse' | 'family' | 'friend' | 'careTeam' | 'other' | 'messaging';

const RELATIONSHIP_BUCKET_ORDER: RelationshipBucket[] = [
  'spouse',
  'family',
  'friend',
  'careTeam',
  'other',
  'messaging',
];

/** Inner/outer ring radii in SVG units (viewBox 400×400, center 200,200). */
export const CIRCLE_MAP_CENTER_RADIUS = 52;
export const CIRCLE_MAP_MAX_RING_RADIUS = 168;

export function computeCircleMapRingRadii(ringCount: number): { start: number; step: number } {
  if (ringCount <= 1) {
    return { start: CIRCLE_MAP_CENTER_RADIUS, step: 0 };
  }
  const step = (CIRCLE_MAP_MAX_RING_RADIUS - CIRCLE_MAP_CENTER_RADIUS) / (ringCount - 1);
  return { start: CIRCLE_MAP_CENTER_RADIUS, step };
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function normalizeComparable(value: string): string {
  return value.trim().toLowerCase();
}

function isIncomingReply(reply: Record<string, unknown>): boolean {
  if (reply.isPatient === true) return false;
  const sender = String(reply.sender || '').trim();
  return sender !== 'You';
}

function relationshipBucketFromRaw(raw: string): RelationshipBucket {
  const lower = raw.trim().toLowerCase();
  if (!lower) return 'other';
  if (/spouse|partner|husband|wife|fianc|married|girlfriend|boyfriend/.test(lower)) return 'spouse';
  if (/friend|buddy|pal|mate|colleague|neighbor|neighbour/.test(lower)) return 'friend';
  if (/care|nurse|therapist|doctor|professional|staff|clinician|health|medical/.test(lower)) {
    return 'careTeam';
  }
  if (
    /child|son|daughter|kid|parent|mother|father|mom|dad|mum|sibling|brother|sister|grand|aunt|uncle|cousin|niece|nephew|in-law|inlaw|family|relative/.test(
      lower,
    )
  ) {
    return 'family';
  }
  return 'other';
}

function relationshipBucketIndex(bucket: RelationshipBucket): number {
  return RELATIONSHIP_BUCKET_ORDER.indexOf(bucket);
}

function paletteForBucket(bucket: RelationshipBucket) {
  const index = relationshipBucketIndex(bucket);
  return RELATIONSHIP_PALETTE[Math.min(index, RELATIONSHIP_PALETTE.length - 1)];
}

function roleRingForContact(contact: Record<string, unknown>, isMessagingOnly: boolean) {
  if (isMessagingOnly) return ROLE_RING_ORDER[ROLE_RING_ORDER.length - 1];
  const role = circleRoleFromContact(contact);
  if (role === 'proxy') return ROLE_RING_ORDER[0];
  if (role === 'caregiver') return ROLE_RING_ORDER[1];
  if (role === 'family') return ROLE_RING_ORDER[2];
  return ROLE_RING_ORDER[3];
}

function roleDisplayForContact(
  contact: Record<string, unknown>,
  isMessagingOnly: boolean,
  t: (key: string) => string,
): string {
  if (isMessagingOnly) return t('dashboard.circleMap.roles.contact');
  const role = circleRoleFromContact(contact);
  return t(circleRoleLabelKey(role));
}

function relationshipRingForContact(
  contact: Record<string, unknown>,
  isMessagingOnly: boolean,
  t: (key: string) => string,
) {
  if (isMessagingOnly) {
    const palette = paletteForBucket('messaging');
    return {
      key: 'messaging',
      label: t('dashboard.circleMap.relationships.messaging'),
      relationshipDisplay: t('dashboard.circleMap.relationships.messaging'),
      index: relationshipBucketIndex('messaging'),
      ...palette,
    };
  }

  const raw = String(contact.relationship || contact.type || '').trim();
  const bucket: RelationshipBucket = raw
    ? relationshipBucketFromRaw(raw)
    : (() => {
        const role = circleRoleFromContact(contact);
        if (role === 'caregiver') return 'careTeam';
        if (role === 'friend') return 'friend';
        if (role === 'family') return 'family';
        if (role === 'proxy') return 'spouse';
        return 'other';
      })();

  const palette = paletteForBucket(bucket);
  const label = t(`dashboard.circleMap.relationships.${bucket}`);

  return {
    key: bucket,
    label,
    relationshipDisplay: raw || label,
    index: relationshipBucketIndex(bucket),
    ...palette,
  };
}

export function resolveCircleMapContactPhoto(
  contact: Record<string, unknown>,
  options: {
    photosByEmail?: Record<string, string>;
    photosByContactId?: Record<string, string>;
    onlineNow?: CircleMapOnlineMember[];
  } = {},
): string | undefined {
  const id = String(contact.id || '').trim();
  if (id && options.photosByContactId?.[id]) return options.photosByContactId[id];

  const email = normalizeInviteEmail(String(contact.email || ''));
  if (email && options.photosByEmail?.[email]) return options.photosByEmail[email];

  const online = options.onlineNow?.find(
    (member) => normalizeInviteEmail(member.email) === email,
  );
  return online?.photoUrl;
}

function countEngagement(
  contact: Record<string, unknown>,
  messages: unknown[],
  galleryPhotos: CircleMapGalleryPhoto[],
  windowDays = 90,
): CircleMapEngagement {
  const email = normalizeInviteEmail(String(contact.email || ''));
  const selectionKey = getRecipientSelectionKey(contact as { id?: string; email?: string });
  const nameNorm = normalizeComparable(String(contact.name || ''));
  const cutoff = Date.now() - windowDays * 86_400_000;

  let messagesSent = 0;
  let repliesReceived = 0;

  for (const raw of messages || []) {
    const msg = raw as Record<string, unknown>;
    const ts = typeof msg.timestamp === 'number' ? msg.timestamp : 0;
    if (ts && ts < cutoff) continue;

    const recipients = Array.isArray(msg.recipients) ? msg.recipients : [];
    const hitRecipient = recipients.some((recipient) => {
      const value = String(recipient || '').trim();
      return (
        (email && normalizeInviteEmail(value) === email) ||
        value === selectionKey
      );
    });
    if (hitRecipient) messagesSent += 1;

    const replies = Array.isArray(msg.replies) ? msg.replies : [];
    for (const rawReply of replies) {
      const reply = rawReply as Record<string, unknown>;
      const replyTs = typeof reply.timestamp === 'number' ? reply.timestamp : 0;
      if (replyTs && replyTs < cutoff) continue;
      if (!isIncomingReply(reply)) continue;
      const replyEmail = normalizeInviteEmail(String(reply.senderEmail || ''));
      const replyName = normalizeComparable(String(reply.senderName || reply.sender || ''));
      if ((email && replyEmail === email) || (nameNorm && replyName === nameNorm)) {
        repliesReceived += 1;
      }
    }
  }

  let mediaShared = 0;
  for (const photo of galleryPhotos) {
    if (photo.source === 'patient') continue;
    if (photo.date && photo.date < cutoff) continue;
    const sender = normalizeComparable(photo.senderName || '');
    if (nameNorm && sender === nameNorm) mediaShared += 1;
  }

  const rawScore = messagesSent * 4 + repliesReceived * 5 + mediaShared * 6;
  const score = Math.min(100, Math.round(Math.log2(rawScore + 1) * 18));

  return { messagesSent, repliesReceived, mediaShared, score };
}

function layoutNodes(
  nodes: Omit<CircleMapNode, 'angle' | 'radius'>[],
  mode: CircleMapViewMode,
  ringDefs: CircleMapRing[],
): CircleMapNode[] {
  const { start: ringStart, step: ringStep } = computeCircleMapRingRadii(
    mode === 'engagement' ? 4 : Math.max(ringDefs.length, 1),
  );

  if (mode === 'engagement') {
    const sorted = [...nodes].sort((a, b) => b.engagement.score - a.engagement.score);
    return sorted.map((node, index) => {
      const t = sorted.length <= 1 ? 0.5 : index / (sorted.length - 1);
      const radius = ringStart + t * ringStep * 3;
      const angle = index * 2.399963 + (node.id.length % 7) * 0.08;
      return {
        ...node,
        radius,
        angle,
        ringIndex: Math.round(t * Math.max(ringDefs.length - 1, 1)),
        color: engagementColor(node.engagement.score),
        accent: engagementAccent(node.engagement.score),
      };
    });
  }

  const sortedRings = [...ringDefs].sort((a, b) => a.index - b.index);
  const radiusByKey = new Map<string, number>();
  sortedRings.forEach((ring, index) => {
    radiusByKey.set(ring.key, ringStart + index * ringStep);
  });

  const grouped = new Map<string, Omit<CircleMapNode, 'angle' | 'radius'>[]>();
  for (const node of nodes) {
    const list = grouped.get(node.ringKey) ?? [];
    list.push(node);
    grouped.set(node.ringKey, list);
  }

  const laidOut: CircleMapNode[] = [];
  sortedRings.forEach((ring, ringPosition) => {
    const members = grouped.get(ring.key) ?? [];
    members.sort((a, b) => a.name.localeCompare(b.name));
    const radius = radiusByKey.get(ring.key) ?? ringStart + ringPosition * ringStep;
    members.forEach((node, index) => {
      const angle =
        (Math.PI * 2 * index) / Math.max(members.length, 1) - Math.PI / 2 + ringPosition * 0.1;
      laidOut.push({ ...node, radius, angle });
    });
  });

  return laidOut;
}

function engagementColor(score: number): string {
  if (score >= 75) return '#7c3aed';
  if (score >= 50) return '#ea580c';
  if (score >= 25) return '#2563eb';
  return '#64748b';
}

function engagementAccent(score: number): string {
  if (score >= 75) return '#c4b5fd';
  if (score >= 50) return '#fdba74';
  if (score >= 25) return '#93c5fd';
  return '#cbd5e1';
}

export function buildCircleMapModel(params: {
  preferences: {
    userName?: string;
    fullUserDetails?: { identity?: { firstName?: string; lastName?: string; nickName?: string } };
    caregivers?: Record<string, unknown>[];
    friendsAndFamily?: Record<string, unknown>[];
    contacts?: Record<string, unknown>[];
  };
  messages?: unknown[];
  galleryPhotos?: CircleMapGalleryPhoto[];
  onlineNow?: CircleMapOnlineMember[];
  photosByEmail?: Record<string, string>;
  photosByContactId?: Record<string, string>;
  patientPhotoUrl?: string;
  mode: CircleMapViewMode;
  t: (key: string, params?: Record<string, unknown>) => string;
}): CircleMapModel {
  const patientName =
    params.preferences.fullUserDetails?.identity?.nickName?.trim() ||
    params.preferences.fullUserDetails?.identity?.firstName?.trim() ||
    params.preferences.userName?.trim() ||
    params.t('dashboard.circleMap.you');

  const onlineEmails = new Set(
    (params.onlineNow ?? [])
      .map((member) => normalizeInviteEmail(member.email))
      .filter(Boolean),
  );

  const rawPeople: Omit<CircleMapNode, 'angle' | 'radius'>[] = [];

  const pushContact = (contact: Record<string, unknown>, isMessagingOnly: boolean) => {
    const name = String(contact.name || '').trim();
    const email = String(contact.email || '').trim();
    if (!name && !email) return;

    const roleRing = roleRingForContact(contact, isMessagingOnly);
    const relationshipRing = relationshipRingForContact(contact, isMessagingOnly, params.t);
    const roleDisplay = roleDisplayForContact(contact, isMessagingOnly, params.t);
    const engagement = countEngagement(
      contact,
      params.messages ?? [],
      params.galleryPhotos ?? [],
    );

    const ring =
      params.mode === 'relationships'
        ? {
            key: relationshipRing.key,
            label: relationshipRing.label,
            index: relationshipRing.index,
            color: relationshipRing.color,
            accent: relationshipRing.accent,
          }
        : params.mode === 'engagement'
          ? {
              key: 'engagement',
              label: params.t('dashboard.circleMap.modes.engagement'),
              index: 0,
              color: engagementColor(engagement.score),
              accent: engagementAccent(engagement.score),
            }
          : {
              key: roleRing.key,
              label: params.t(roleRing.labelKey),
              index: ROLE_RING_ORDER.findIndex((r) => r.key === roleRing.key),
              color: roleRing.color,
              accent: roleRing.accent,
            };

    rawPeople.push({
      id: String(contact.id || email || name),
      name: name || email,
      email,
      initials: initialsFromName(name || email),
      photoUrl: resolveCircleMapContactPhoto(contact, {
        photosByEmail: params.photosByEmail,
        photosByContactId: params.photosByContactId,
        onlineNow: params.onlineNow,
      }),
      ringKey: ring.key,
      ringLabel: ring.label,
      relationshipDisplay: relationshipRing.relationshipDisplay,
      roleDisplay,
      ringIndex: ring.index >= 0 ? ring.index : 99,
      color: ring.color,
      accent: ring.accent,
      isOnline: !!email && onlineEmails.has(normalizeInviteEmail(email)),
      isMessagingOnly,
      engagement,
    });
  };

  for (const contact of params.preferences.caregivers ?? []) pushContact(contact, false);
  for (const contact of params.preferences.friendsAndFamily ?? []) pushContact(contact, false);
  for (const contact of params.preferences.contacts ?? []) pushContact(contact, true);

  const ringMap = new Map<string, CircleMapRing>();
  for (const node of rawPeople) {
    if (!ringMap.has(node.ringKey)) {
      ringMap.set(node.ringKey, {
        key: node.ringKey,
        label: node.ringLabel,
        index: node.ringIndex,
        color: node.color,
        dashed: node.isMessagingOnly || node.ringKey === 'messaging' || node.ringKey === 'contact',
      });
    }
  }

  const rings = [...ringMap.values()].sort((a, b) => a.index - b.index);
  const { start: ringStart, step: ringStep } = computeCircleMapRingRadii(rings.length);
  rings.forEach((ring, index) => {
    ring.radius = ringStart + index * ringStep;
  });

  const nodes = layoutNodes(rawPeople, params.mode, rings);

  return { patientName, patientPhotoUrl: params.patientPhotoUrl, nodes, rings };
}

export function buildCircleMapPreviewModel(t: (key: string) => string): CircleMapModel {
  const demoNodes: CircleMapNode[] = [
    {
      id: '1',
      name: 'Alex Proxy',
      email: '',
      initials: 'AP',
      ringKey: 'proxy',
      ringLabel: t('dashboard.circleMap.roles.proxy'),
      relationshipDisplay: 'Spouse',
      roleDisplay: t('dashboard.circleMap.roles.proxy'),
      ringIndex: 0,
      color: '#7c3aed',
      accent: '#a78bfa',
      isOnline: true,
      isMessagingOnly: false,
      engagement: { messagesSent: 12, repliesReceived: 9, mediaShared: 4, score: 82 },
      angle: -1.2,
      radius: 58,
    },
    {
      id: '2',
      name: 'Jordan',
      email: '',
      initials: 'JO',
      ringKey: 'family',
      ringLabel: t('dashboard.circleMap.roles.family'),
      relationshipDisplay: 'Sibling',
      roleDisplay: t('dashboard.circleMap.roles.family'),
      ringIndex: 2,
      color: '#ea580c',
      accent: '#fb923c',
      isOnline: false,
      isMessagingOnly: false,
      engagement: { messagesSent: 6, repliesReceived: 4, mediaShared: 8, score: 71 },
      angle: 0.4,
      radius: 94,
    },
    {
      id: '3',
      name: 'Sam',
      email: '',
      initials: 'SA',
      ringKey: 'friend',
      ringLabel: t('dashboard.circleMap.roles.friend'),
      relationshipDisplay: 'Friend',
      roleDisplay: t('dashboard.circleMap.roles.friend'),
      ringIndex: 3,
      color: '#0d9488',
      accent: '#2dd4bf',
      isOnline: true,
      isMessagingOnly: false,
      engagement: { messagesSent: 3, repliesReceived: 2, mediaShared: 1, score: 38 },
      angle: 1.8,
      radius: 130,
    },
    {
      id: '4',
      name: 'Riley',
      email: '',
      initials: 'RI',
      ringKey: 'contact',
      ringLabel: t('dashboard.circleMap.roles.contact'),
      relationshipDisplay: t('dashboard.circleMap.relationships.messaging'),
      roleDisplay: t('dashboard.circleMap.roles.contact'),
      ringIndex: 4,
      color: '#64748b',
      accent: '#94a3b8',
      isOnline: false,
      isMessagingOnly: true,
      engagement: { messagesSent: 1, repliesReceived: 0, mediaShared: 0, score: 12 },
      angle: 2.6,
      radius: 166,
    },
  ];
  return {
    patientName: t('dashboard.circleMap.previewPatient'),
    patientPhotoUrl: undefined,
    nodes: demoNodes,
    rings: [
      { key: 'proxy', label: t('dashboard.circleMap.roles.proxy'), index: 0, color: '#7c3aed', radius: 58 },
      { key: 'family', label: t('dashboard.circleMap.roles.family'), index: 2, color: '#ea580c', radius: 94 },
      { key: 'friend', label: t('dashboard.circleMap.roles.friend'), index: 3, color: '#0d9488', radius: 130 },
      { key: 'contact', label: t('dashboard.circleMap.roles.contact'), index: 4, color: '#64748b', dashed: true, radius: 166 },
    ],
  };
}

export function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}
