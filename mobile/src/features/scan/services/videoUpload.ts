import { File } from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";

import type { VideoLocation } from "../../../types/video";
import { videoApi } from "../videoApi";

/** `expo-video-thumbnails` always renders a JPEG. */
export const THUMBNAIL_CONTENT_TYPE = "image/jpeg";

const THUMBNAIL_QUALITY = 0.7;

/**
 * Positions to try when rendering a preview frame. A recording shorter than the
 * first value makes the native decoder reject it, so fall back to the very
 * first frame.
 */
const THUMBNAIL_TIMES_MS = [500, 0] as const;

/**
 * Content types accepted by the backend, keyed by file extension. Derived from
 * the recording itself because iOS captures `.mov` while Android captures
 * `.mp4`, and the value must match the one the upload URL is signed with.
 */
const VIDEO_CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const fileExtension = (uri: string): string =>
  uri.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";

export function videoContentType(uri: string): string {
  return VIDEO_CONTENT_TYPES[fileExtension(uri)] ?? "video/mp4";
}

export function videoExtensionForContentType(contentType: string): string {
  return VIDEO_EXTENSIONS[contentType] ?? "mp4";
}

/**
 * File size used by the backend only for validation/metadata. `0` means the
 * file could not be read through `expo-file-system` (Expo Go restricts the raw
 * cache directory); the queued copy in the documents directory can be read and
 * will provide the real value on the next attempt.
 */
export function readLocalFileSize(uri: string): number {
  try {
    const file = new File(uri);

    return file.exists ? file.size : 0;
  } catch {
    return 0;
  }
}

/** Renders one preview frame, returning `null` instead of blocking an upload. */
export async function createVideoThumbnail(
  videoUri: string,
): Promise<string | null> {
  for (const time of THUMBNAIL_TIMES_MS) {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time,
        quality: THUMBNAIL_QUALITY,
      });

      return uri;
    } catch {
      // Try the next timestamp; a missing thumbnail must never fail the upload.
    }
  }

  return null;
}

export interface UploadVideoInput {
  localUri: string;
  token: string;
  idempotencyKey: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  location?: VideoLocation;
  thumbnailUri?: string | null;
  /**
   * Called as soon as the backend creates/finds the video document, before the
   * bytes are sent, so the local row can remember the remote id across retries.
   */
  onRemoteVideoId?: (videoId: string) => void | Promise<void>;
}

export interface UploadVideoResult {
  videoId: string;
}

/**
 * Uploads one recording through the three-step presigned flow:
 *
 *   1. `POST /videos/upload`          -> backend row + presigned PUT
 *   2. `PUT` the file to object storage
 *   3. `PATCH /videos/:id/uploaded`   -> enqueue AI processing
 *
 * A preview image is uploaded between steps 2 and 3 on a best-effort basis.
 * Any failure of the recording itself is thrown so the caller can retry with
 * the same idempotency key.
 */
export async function uploadVideoToServer(
  input: UploadVideoInput,
): Promise<UploadVideoResult> {
  const fileSize =
    input.fileSize > 0 ? input.fileSize : readLocalFileSize(input.localUri);

  if (fileSize <= 0) {
    throw new Error("Could not read the video file size");
  }

  const upload = await videoApi.requestVideoUpload(
    {
      fileName: input.fileName,
      fileSize,
      contentType: input.contentType,
      // Omitted when the device has no location; the backend then uses its
      // default farm location for weather context.
      ...(input.location ? { location: input.location } : {}),
    },
    input.token,
    input.idempotencyKey,
  );

  // Persist the remote id before transferring bytes: if the process dies
  // mid-upload, the next attempt can reuse the same idempotent backend row.
  await input.onRemoteVideoId?.(upload.videoId);

  await videoApi.uploadLocalFileToObjectStorage(
    upload.uploadUrl,
    input.localUri,
    input.contentType,
  );

  let thumbnailUri = input.thumbnailUri ?? null;

  // The preview frame lives in the cache directory and may be gone by the time
  // an offline recording is synced. Re-render it from the saved video instead.
  if (thumbnailUri) {
    try {
      if (!new File(thumbnailUri).exists) thumbnailUri = null;
    } catch {
      thumbnailUri = null;
    }
  }

  if (!thumbnailUri) {
    thumbnailUri = await createVideoThumbnail(input.localUri);
  }

  if (thumbnailUri) {
    await uploadThumbnail(upload.videoId, thumbnailUri, input.token);
  }

  await videoApi.completeVideoUpload(upload.videoId, input.token);

  return { videoId: upload.videoId };
}

/**
 * Uploads the already-rendered preview image and records its key on the video.
 * A failure here is logged and swallowed: the video upload itself must still
 * succeed.
 */
async function uploadThumbnail(
  videoId: string,
  thumbnailUri: string,
  token: string,
): Promise<void> {
  try {
    const presigned = await videoApi.requestThumbnailUpload(
      videoId,
      THUMBNAIL_CONTENT_TYPE,
      token,
    );

    await videoApi.uploadLocalFileToObjectStorage(
      presigned.uploadUrl,
      thumbnailUri,
      THUMBNAIL_CONTENT_TYPE,
    );

    await videoApi.attachThumbnail(
      videoId,
      presigned.thumbnailStorageKey,
      token,
    );
  } catch (error) {
    console.error("Thumbnail upload failed:", error);
  }
}
