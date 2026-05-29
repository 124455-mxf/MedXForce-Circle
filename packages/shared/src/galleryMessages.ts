import type { CircleMemberRole } from './patientPermissions';

export type GalleryMediaSource = 'patient' | 'circle';

export interface GalleryMessageWrite {
  patientId: string;
  userId: string;
  url: string;
  timestamp: number;
  uploadedByUid: string;
  uploadedByRole: CircleMemberRole | 'patient';
  source: GalleryMediaSource;
  senderName: string;
  caption?: string;
  isVideo?: boolean;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  notifyCircle?: boolean;
}

export function toFirestoreGalleryPayload(payload: GalleryMessageWrite): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    patientId: payload.patientId,
    userId: payload.userId,
    url: payload.url,
    timestamp: payload.timestamp,
    uploadedByUid: payload.uploadedByUid,
    uploadedByRole: payload.uploadedByRole,
    source: payload.source,
    senderName: payload.senderName,
    caption: payload.caption ?? '',
    isVideo: payload.isVideo ?? false,
    notifyCircle: payload.notifyCircle ?? false,
  };
  if (typeof payload.width === 'number') doc.width = payload.width;
  if (typeof payload.height === 'number') doc.height = payload.height;
  if (payload.thumbnailUrl) doc.thumbnailUrl = payload.thumbnailUrl;
  return doc;
}

export function buildCircleGalleryUpload(params: {
  patientId: string;
  uploadedByUid: string;
  uploadedByRole: CircleMemberRole;
  senderName: string;
  url: string;
  caption?: string;
  isVideo?: boolean;
  thumbnailUrl?: string;
}): GalleryMessageWrite {
  const base: GalleryMessageWrite = {
    patientId: params.patientId,
    userId: params.patientId,
    url: params.url,
    timestamp: Date.now(),
    uploadedByUid: params.uploadedByUid,
    uploadedByRole: params.uploadedByRole,
    source: 'circle',
    senderName: params.senderName,
    caption: params.caption || '',
    isVideo: params.isVideo || false,
    notifyCircle: false,
  };
  if (params.thumbnailUrl) base.thumbnailUrl = params.thumbnailUrl;
  return base;
}
