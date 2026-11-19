import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImageFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeOk = ALLOWED_MIME_TYPES.has(file.type.toLowerCase());
  const extOk = ALLOWED_EXTENSIONS.has(ext);
  if (!mimeOk && !extOk) {
    return 'Please choose a JPG, JPEG, PNG, or WebP image file.';
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image file must be smaller than 10 MB.';
  }
  return null;
}

export async function uploadUserImage(
  uid: string,
  folder: string,
  file: File
): Promise<{ url: string; path: string }> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const ext = (file.name.split('.').pop()?.toLowerCase() || 'png').replace(/[^a-z0-9]/g, '');
  const safeFolder = folder.replace(/^\/+|\/+$/g, '');
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 10)
      : Math.random().toString(36).slice(2, 10);
  const path = `users/${uid}/${safeFolder}/${Date.now().toString(36)}_${rand}.${ext || 'png'}`;
  const storageRef = ref(storage, path);

  try {
    await uploadBytes(storageRef, file, {
      contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
    const url = await getDownloadURL(storageRef);
    return { url, path };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('storage/unauthorized')) {
      throw new Error(
        'Firebase Storage denied upload. Verify Firebase Storage rules are deployed and you are signed in.'
      );
    }
    throw new Error(`Image upload failed: ${msg}`);
  }
}

export async function deleteStoragePath(path?: string): Promise<void> {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    const code = (err as { code?: string } | null)?.code || '';
    if (code !== 'storage/object-not-found') {
      console.warn('Storage cleanup skipped:', err);
    }
  }
}
