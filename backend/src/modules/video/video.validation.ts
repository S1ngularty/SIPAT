const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; 

export function validateVideoUpload(
  contentType: string,
  fileSize: number,
): void {
  if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
    throw new Error("Unsupported video type");
  }

  if (fileSize <= 0) {
    throw new Error("Invalid file size");
  }

  if (fileSize > MAX_VIDEO_SIZE) {
    throw new Error("Video exceeds maximum allowed size");
  }
}

// ==========================================
// THUMBNAIL / PREVIEW IMAGE
// ==========================================

const ALLOWED_THUMBNAIL_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const THUMBNAIL_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateThumbnailUpload(contentType: string): void {
  if (!ALLOWED_THUMBNAIL_TYPES.has(contentType)) {
    throw new Error("Unsupported thumbnail type");
  }
}

/** Storage-key extension for an allowed thumbnail content type. */
export function thumbnailExtension(contentType: string): string {
  return THUMBNAIL_EXTENSIONS[contentType] ?? "jpg";
}