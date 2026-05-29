export interface GalleryAlbum {
  id: string;
  patientId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  createdByUid: string;
  isDefault?: boolean;
}

export interface GalleryAlbumMedia {
  id: string;
  patientId: string;
  albumId?: string;
  url: string;
  caption: string;
  isVideo: boolean;
  thumbnailUrl?: string;
  timestamp: number;
  uploadedByUid: string;
  senderName: string;
  source: 'circle' | 'patient';
}

export const MAX_ALBUM_TITLE_LENGTH = 100;
export const MAX_CAPTION_LENGTH = 1000;
