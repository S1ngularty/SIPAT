import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";

import {
  videoRepository,
  type LocalVideoStorageKind,
} from "../../../database/videoRepository";
import type { VideoLocation } from "../../../types/video";
import {
  readLocalFileSize,
  uploadVideoToServer,
  videoContentType,
  videoExtensionForContentType,
} from "./videoUpload";

/** Permanent home for recordings that still have to be uploaded. */
const VIDEOS_DIRECTORY = "videos";

export type VideoUploadState = "uploaded" | "queued";

export interface HandleVideoForUploadInput {
  localUri: string;
  ownerId: string | null;
  token: string | null;
  /**
   * True only when the device has internet access *and* the backend answered
   * its health check. Any uncertainty queues the recording instead.
   */
  online: boolean;
  location?: VideoLocation;
  /** An already-rendered preview frame, when the caller has one. */
  thumbnailUri?: string | null;
}

export interface VideoUploadOutcome {
  localVideoId: string;
  localUri: string;
  storageKind: LocalVideoStorageKind;
  status: VideoUploadState;
  remoteVideoId: string | null;
  /** Present when a direct upload failed and the recording was queued. */
  error?: string;
}

const toMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  return "Unknown error";
};

const videosDirectory = () => new Directory(Paths.document, VIDEOS_DIRECTORY);

/**
 * Copies a recording out of the ephemeral cache into the app's documents
 * directory, where the OS will not evict it before the sync worker runs.
 *
 * Best-effort: if the copy fails, the queue still keeps the cache URI so an
 * in-process retry can succeed.
 */
async function persistVideoRecording(
  localUri: string,
  id: string,
  contentType: string,
): Promise<{ uri: string; storageKind: LocalVideoStorageKind }> {
  try {
    const directory = videosDirectory();

    if (!directory.exists) {
      directory.create({ intermediates: true, idempotent: true });
    }

    const source = new File(localUri);

    if (!source.exists) {
      return { uri: localUri, storageKind: "cache" };
    }

    const extension = videoExtensionForContentType(contentType);
    const destination = new File(directory, `${id}.${extension}`);

    await source.copy(destination, { overwrite: true });

    return { uri: destination.uri, storageKind: "documents" };
  } catch (error) {
    console.error("Failed to persist recording for later upload:", error);
    return { uri: localUri, storageKind: "cache" };
  }
}

/**
 * Persists a freshly recorded/picked video and either uploads it immediately
 * or leaves it in the local queue.
 *
 * This is the single entry point used by the scanner and the preview screen.
 * The only difference between the online and offline paths is where the file
 * lives (cache vs. documents) and whether bytes are sent now — both paths write
 * the same SQLite record.
 */
export async function handleVideoForUpload(
  input: HandleVideoForUploadInput,
): Promise<VideoUploadOutcome> {
  
  console.log("[VIDEO QUEUE] Function entered", {
    online: input.online,
    ownerId: input.ownerId,
    hasToken: Boolean(input.token),
    localUri: input.localUri,
  });

  const id = Crypto.randomUUID();
  const idempotencyKey = Crypto.randomUUID();
  const contentType = videoContentType(input.localUri);
  const fileName = `video_${id}`;
  const capturedFileSize = readLocalFileSize(input.localUri);
  const createdAt = new Date().toISOString();
  const latitude = input.location?.latitude ?? null;
  const longitude = input.location?.longitude ?? null;

  if (input.online && input.token) {
    await videoRepository.insert({
      id,
      ownerId: input.ownerId,
      localUri: input.localUri,
      idempotencyKey,
      fileName,
      contentType,
      fileSize: capturedFileSize,
      thumbnailUri: input.thumbnailUri ?? null,
      latitude,
      longitude,
      status: "uploading",
      storageKind: "cache",
      createdAt,
    });

    try {
      const { videoId } = await uploadVideoToServer({
        localUri: input.localUri,
        token: input.token,
        idempotencyKey,
        fileName,
        contentType,
        fileSize: capturedFileSize,
        location: input.location,
        thumbnailUri: input.thumbnailUri,
        onRemoteVideoId: (remoteId) =>
          videoRepository.setRemoteVideoId(id, remoteId),
      });

      await videoRepository.markUploaded(id, videoId);

      return {
        localVideoId: id,
        localUri: input.localUri,
        storageKind: "cache",
        status: "uploaded",
        remoteVideoId: videoId,
      };
    } catch (error) {
      // A direct upload can still fail (server went away mid-transfer, the
      // cache file was unreadable, …). Move it to durable storage and let the
      // sync worker retry with the same idempotency key.
      const persisted = await persistVideoRecording(
        input.localUri,
        id,
        contentType,
      );
      const fileSize = readLocalFileSize(persisted.uri) || capturedFileSize;
      const message = toMessage(error);

      await videoRepository.markQueued(
        id,
        persisted.uri,
        persisted.storageKind,
        fileSize,
        message,
      );

      return {
        localVideoId: id,
        localUri: persisted.uri,
        storageKind: persisted.storageKind,
        status: "queued",
        remoteVideoId: null,
        error: message,
      };
    }
  }

  console.log("[VIDEO QUEUE] Starting offline persistence");

  const persisted = await persistVideoRecording(
    input.localUri,
    id,
    contentType,
  );

  console.log("[VIDEO QUEUE] Recording persisted:", persisted);

  const fileSize = readLocalFileSize(persisted.uri) || capturedFileSize;

  console.log("[VIDEO QUEUE] Inserting SQLite record");

  await videoRepository.insert({
    id,
    ownerId: input.ownerId,
    localUri: persisted.uri,
    idempotencyKey,
    fileName,
    contentType,
    fileSize,
    thumbnailUri: input.thumbnailUri ?? null,
    latitude,
    longitude,
    status: "pending",
    storageKind: persisted.storageKind,
    createdAt,
  });

  console.log("[VIDEO QUEUE] SQLite record inserted");

  return {
    localVideoId: id,
    localUri: persisted.uri,
    storageKind: persisted.storageKind,
    status: "queued",
    remoteVideoId: null,
  };
}

/**
 * Drops a queued recording the user no longer wants (e.g. after choosing
 * "Recapture"). Already-uploaded videos are intentionally left alone: they are
 * part of the user's diagnosis history and can be deleted from the list screen.
 */
export async function discardQueuedVideo(localVideoId: string): Promise<void> {
  const record = await videoRepository.findById(localVideoId);

  if (!record) return;

  const removed = await videoRepository.removeIfQueued(localVideoId);

  if (!removed || record.storageKind !== "documents") return;

  try {
    const file = new File(record.localUri);

    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error("Failed to delete discarded recording:", error);
  }
}
