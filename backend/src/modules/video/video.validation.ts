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