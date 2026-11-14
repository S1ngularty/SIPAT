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
// CAPTURE LOCATION
// ==========================================

/**
 * Validates the optional capture coordinates used for weather context.
 *
 * Omitted / `null` is allowed (the client may not have location access); when
 * present, both values must be finite numbers inside the legal coordinate
 * ranges.
 */
export function validateVideoLocation(location?: unknown): void {
  if (location === undefined || location === null) return;

  if (typeof location !== "object" || Array.isArray(location)) {
    throw new Error("location must be an object with latitude and longitude");
  }

  const { latitude, longitude } = location as Record<string, unknown>;

  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("location latitude must be between -90 and 90");
  }

  if (
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("location longitude must be between -180 and 180");
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