/**
 * ELEVATOR — the CV photo.
 *
 * A photo is stored inside the document as a data URI, because it travels with
 * the CV: the same object goes to the server, comes back on load, and renders
 * in the exported PDF with no second request and no broken-image risk.
 *
 * That only works if the file is SMALL. A phone photo is 4-8 MB, and putting
 * that in an autosave PATCH would make every keystroke expensive and blow past
 * request limits. So the image is decoded, downscaled to a sane portrait size
 * and re-encoded before it ever reaches the document.
 */

/** Longest edge, in CSS pixels. 512 is ample for a 28mm print circle at 300dpi. */
const MAX_EDGE = 512;
const JPEG_QUALITY = 0.85;
/** Refuse absurd input before decoding it — decoding is the expensive part. */
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export const PHOTO_ACCEPT = 'image/png,image/jpeg,image/webp';

export interface PhotoRejection {
    code: 'PHOTO_UNSUPPORTED_FORMAT' | 'PHOTO_TOO_LARGE' | 'PHOTO_UNREADABLE';
    message: string;
}

export function validatePhoto(file: File): PhotoRejection | null {
    if (!file.type.startsWith('image/')) {
        return { code: 'PHOTO_UNSUPPORTED_FORMAT', message: 'Choose an image file — PNG, JPEG or WebP.' };
    }
    if (file.size > MAX_PHOTO_BYTES) {
        return { code: 'PHOTO_TOO_LARGE', message: 'That image is over 12 MB. Try a smaller one.' };
    }
    return null;
}

/**
 * Decode → downscale → re-encode as a data URI.
 *
 * Transparency decides the output format: a PNG with an alpha channel would get
 * a black background if it went through JPEG, so those stay PNG and everything
 * else becomes a much smaller JPEG.
 */
export async function photoToDataUrl(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) {
        throw new Error('PHOTO_UNREADABLE');
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
        bitmap.close();
        throw new Error('PHOTO_UNREADABLE');
    }

    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
    return keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
