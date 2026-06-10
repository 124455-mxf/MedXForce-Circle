import {
  uploadBytesResumable,
  type StorageReference,
} from 'firebase/storage';

/** Per-file progress while preparing, uploading, and saving gallery media. */
export type GalleryUploadFileProgress = {
  index: number;
  total: number;
  phase: 'preparing' | 'uploading';
  /** 0–100 within the current file's cloud upload step. */
  percent?: number;
};

export async function uploadGalleryBlobResumable(
  storageRef: StorageReference,
  blob: Blob,
  contentType: string,
  onPercent?: (percent: number) => void,
): Promise<void> {
  const task = uploadBytesResumable(storageRef, blob, { contentType });
  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (!onPercent || snapshot.totalBytes <= 0) return;
        onPercent(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      reject,
      () => resolve(),
    );
  });
}
