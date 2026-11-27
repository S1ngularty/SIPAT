import { File } from "expo-file-system";

import { videoRepository } from "../../../database/videoRepository";
import {
  readLocalFileSize,
  uploadVideoToServer,
  videoContentType,
} from "./videoUpload";

export interface SyncPendingVideosInput {
  /** Fetched fresh for every item so a long queue survives token expiry. */
  getToken: () => Promise<string | null>;
  /** Scopes the queue to the signed-in account (plus anonymous rows). */
  ownerId: string | null;
}

export interface SyncPendingVideosResult {
  attempted: number;
  uploaded: number;
  failed: number;
}

let syncInFlight: Promise<SyncPendingVideosResult> | null = null;

const toMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  return "Unknown error";
};

/**
 * Uploads every locally queued recording that belongs to the current user.
 *
 * Safe to call from network changes, app foreground events and a polling
 * interval: concurrent calls share one pass, and each row is atomically claimed
 * so the same video cannot be uploaded twice.
 */
export function syncPendingVideos(
  input: SyncPendingVideosInput,
): Promise<SyncPendingVideosResult> {
  if (!syncInFlight) {
    syncInFlight = runSync(input).finally(() => {
      syncInFlight = null;
    });
  }

  return syncInFlight;
}

async function runSync(
  input: SyncPendingVideosInput,
): Promise<SyncPendingVideosResult> {
  const records = await videoRepository.findSyncable(input.ownerId);

  let attempted = 0;
  let uploaded = 0;
  let failed = 0;

  for (const record of records) {
    const token = await input.getToken().catch(() => null);

    // No session (e.g. an offline cold start that has not reached Clerk yet).
    // Leave the rest queued for the next trigger instead of failing them.
    if (!token) break;

    const claimed = await videoRepository.claimForSync(record.id);
    if (!claimed) continue;

    attempted += 1;

    try {
      if (!record.ownerId && input.ownerId) {
        await videoRepository.setOwner(record.id, input.ownerId);
      }

      const file = new File(record.localUri);

      if (!file.exists) {
        throw new Error("The saved recording is no longer on this device");
      }

      const fileSize =
        file.size > 0
          ? file.size
          : readLocalFileSize(record.localUri) || record.fileSize;

      if (fileSize <= 0) {
        throw new Error("Could not read the saved recording");
      }

      const contentType =
        record.contentType || videoContentType(record.localUri);
      const location =
        record.latitude !== null && record.longitude !== null
          ? { latitude: record.latitude, longitude: record.longitude }
          : undefined;

      const { videoId } = await uploadVideoToServer({
        localUri: record.localUri,
        token,
        idempotencyKey: record.idempotencyKey,
        fileName: record.fileName,
        contentType,
        fileSize,
        location,
        thumbnailUri: record.thumbnailUri,
        onRemoteVideoId: (remoteId) =>
          videoRepository.setRemoteVideoId(record.id, remoteId),
      });

      await videoRepository.markUploaded(record.id, videoId);
      uploaded += 1;
    } catch (error) {
      await videoRepository.markFailed(record.id, toMessage(error));
      failed += 1;
    }
  }

  return { attempted, uploaded, failed };
}
