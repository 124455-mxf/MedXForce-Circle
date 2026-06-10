import heic2any from 'heic2any';

const IMAGE_EXTENSIONS = new Set([
  'heic',
  'heif',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
]);

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv']);

/** Long edge for stored photos — sharp on iPad, smaller than camera originals. */
export const GALLERY_IMAGE_MAX_EDGE_PX = 2048;
export const GALLERY_THUMB_MAX_EDGE_PX = 480;
const GALLERY_JPEG_QUALITY = 0.85;
const GALLERY_THUMB_JPEG_QUALITY = 0.82;
/** Re-encode large JPEGs even when dimensions are already modest. */
const GALLERY_REENCODE_MIN_BYTES = 1.5 * 1024 * 1024;

export type GalleryMediaKind = 'image' | 'video';

export interface PreparedGalleryUpload {
  blob: Blob;
  extension: string;
  contentType: string;
  isVideo: boolean;
  thumbnailBlob?: Blob;
}

function extensionOf(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return (parts.pop() || '').toLowerCase();
}

function isHeicLike(file: File): boolean {
  const ext = extensionOf(file.name);
  return (
    ext === 'heic' ||
    ext === 'heif' ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  );
}

export function isHeicGalleryUrl(url: string): boolean {
  const lower = decodeURIComponent(url).toLowerCase();
  return (
    lower.includes('.heic') ||
    lower.includes('.heif') ||
    lower.includes('content-type=image%2fheic') ||
    lower.includes('content-type=image%2fheif')
  );
}

export function resolveGalleryMediaKind(file: File): GalleryMediaKind | null {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';

  const ext = extensionOf(file.name);
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  return null;
}

function contentTypeFromExtension(ext: string, kind: GalleryMediaKind): string {
  const map: Record<string, string> = {
    heic: 'image/heic',
    heif: 'image/heif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/mp4',
    webm: 'video/webm',
  };
  return map[ext] || (kind === 'video' ? 'video/mp4' : 'image/jpeg');
}

function scaledDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const maxSide = Math.max(width, height);
  if (maxSide <= maxEdge) return { width, height };
  const scale = maxEdge / maxSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToJpegBlob(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality = 0.92,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

async function loadImageFromBlob(blob: Blob): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      /* fall through to Image element */
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        dispose: () => URL.revokeObjectURL(objectUrl),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read this photo.'));
    };
    img.src = objectUrl;
  });
}

async function resizeLoadedImageToJpeg(
  loaded: LoadedImage,
  maxEdge: number,
  quality: number,
): Promise<Blob | null> {
  const { width, height } = scaledDimensions(loaded.width, loaded.height, maxEdge);
  return canvasToJpegBlob(loaded.source, width, height, quality);
}

function shouldNormalizeImageForGallery(
  width: number,
  height: number,
  blob: Blob,
): boolean {
  if (Math.max(width, height) > GALLERY_IMAGE_MAX_EDGE_PX) return true;
  if (blob.size > GALLERY_REENCODE_MIN_BYTES) return true;
  const mime = (blob.type || '').toLowerCase();
  return !mime.includes('jpeg') && mime !== 'image/jpg';
}

async function prepareImageBlobForGallery(blob: Blob): Promise<{
  blob: Blob;
  thumbnailBlob: Blob;
  reencoded: boolean;
}> {
  const loaded = await loadImageFromBlob(blob);
  try {
    const reencoded = shouldNormalizeImageForGallery(loaded.width, loaded.height, blob);

    let mainBlob = blob;
    if (reencoded) {
      const resized = await resizeLoadedImageToJpeg(
        loaded,
        GALLERY_IMAGE_MAX_EDGE_PX,
        GALLERY_JPEG_QUALITY,
      );
      if (!resized) throw new Error('Could not prepare this photo for upload.');
      mainBlob = resized;
    }

    const thumbTarget = scaledDimensions(
      loaded.width,
      loaded.height,
      GALLERY_THUMB_MAX_EDGE_PX,
    );
    const mainIsSmallEnough =
      !reencoded &&
      thumbTarget.width === loaded.width &&
      thumbTarget.height === loaded.height;

    let thumbnailBlob = mainBlob;
    if (!mainIsSmallEnough) {
      const thumb = await resizeLoadedImageToJpeg(
        loaded,
        GALLERY_THUMB_MAX_EDGE_PX,
        GALLERY_THUMB_JPEG_QUALITY,
      );
      if (!thumb) throw new Error('Could not prepare photo thumbnail.');
      thumbnailBlob = thumb;
    }

    return { blob: mainBlob, thumbnailBlob, reencoded };
  } finally {
    loaded.dispose();
  }
}

async function heicToJpegViaCreateImageBitmap(blob: Blob): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(blob);
    try {
      return await canvasToJpegBlob(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

async function heicToJpegViaImageElement(blob: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      void canvasToJpegBlob(img, img.naturalWidth, img.naturalHeight)
        .then(resolve)
        .finally(() => URL.revokeObjectURL(objectUrl));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

async function heicToJpegViaHeicTo(blob: Blob, fileName?: string): Promise<Blob | null> {
  try {
    const { heicTo, isHeic } = await import('heic-to');
    const file =
      blob instanceof File
        ? blob
        : new File([blob], fileName || 'photo.heic', {
            type: blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/heic',
          });
    if (!(await isHeic(file))) return null;
    const converted = await heicTo({
      blob: file,
      type: 'image/jpeg',
      quality: 0.9,
    });
    return converted || null;
  } catch {
    return null;
  }
}

async function heicToJpegViaHeic2Any(blob: Blob, fileName?: string): Promise<Blob | null> {
  try {
    const input =
      blob.type && blob.type !== 'application/octet-stream'
        ? blob
        : new File([blob], fileName || 'photo.heic', { type: 'image/heic' });
    const converted = await heic2any({
      blob: input,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
    return jpegBlob || null;
  } catch {
    return null;
  }
}

/** Convert HEIC/HEIF bytes to JPEG using every available browser path. */
export async function convertHeicBlobToJpeg(blob: Blob, fileName?: string): Promise<Blob> {
  const jpeg =
    (await heicToJpegViaCreateImageBitmap(blob)) ||
    (await heicToJpegViaImageElement(blob)) ||
    (await heicToJpegViaHeicTo(blob, fileName)) ||
    (await heicToJpegViaHeic2Any(blob, fileName));

  if (!jpeg) {
    throw new Error('Could not display this HEIC photo. Try saving it as JPEG and upload again.');
  }
  return jpeg;
}

async function convertHeicFileToJpeg(file: File): Promise<Blob> {
  return convertHeicBlobToJpeg(file, file.name);
}

/** Normalize gallery uploads: HEIC → JPEG, resize for iPad-friendly storage, grid thumbnail. */
export async function prepareGalleryUploadFile(file: File): Promise<PreparedGalleryUpload> {
  const kind = resolveGalleryMediaKind(file);
  if (!kind) {
    throw new Error('Only image or video files are supported.');
  }

  if (kind === 'video') {
    const ext = extensionOf(file.name) || 'mp4';
    const contentType =
      file.type && file.type !== 'application/octet-stream'
        ? file.type
        : contentTypeFromExtension(ext, 'video');
    return { blob: file, extension: ext, contentType, isVideo: true };
  }

  const sourceBlob = isHeicLike(file) ? await convertHeicFileToJpeg(file) : file;
  const { blob, thumbnailBlob, reencoded } = await prepareImageBlobForGallery(sourceBlob);

  if (reencoded || isHeicLike(file)) {
    return {
      blob,
      thumbnailBlob,
      extension: 'jpg',
      contentType: 'image/jpeg',
      isVideo: false,
    };
  }

  const ext = extensionOf(file.name) || 'jpg';
  const contentType =
    file.type && file.type !== 'application/octet-stream'
      ? file.type
      : contentTypeFromExtension(ext, 'image');

  return {
    blob,
    thumbnailBlob,
    extension: ext,
    contentType,
    isVideo: false,
  };
}
