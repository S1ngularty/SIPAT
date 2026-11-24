import { getDatabase } from "./schema";

/** Where the local copy of a recording lives. */
export type LocalVideoStorageKind = "cache" | "documents";

/**
 * Local queue state. These are deliberately separate from the backend's video
 * statuses: the backend never sees a queued recording until it finishes
 * uploading.
 */
export type LocalVideoStatus = "pending" | "uploading" | "uploaded" | "failed";

export interface LocalVideoRecord {
  id: string;
  ownerId: string | null;
  localUri: string;
  remoteVideoId: string | null;
  idempotencyKey: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  thumbnailUri: string | null;
  latitude: number | null;
  longitude: number | null;
  status: LocalVideoStatus;
  storageKind: LocalVideoStorageKind;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewLocalVideo {
  id: string;
  ownerId: string | null;
  localUri: string;
  idempotencyKey: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  thumbnailUri?: string | null;
  latitude: number | null;
  longitude: number | null;
  status: LocalVideoStatus;
  storageKind: LocalVideoStorageKind;
  createdAt: string;
}

interface LocalVideoRow {
  id: string;
  owner_id: string | null;
  local_uri: string;
  remote_video_id: string | null;
  idempotency_key: string | null;
  file_name: string | null;
  content_type: string | null;
  file_size: number | null;
  thumbnail_uri: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  storage_kind: string | null;
  retry_count: number | null;
  last_error: string | null;
  created_at: string;
  updated_at: string | null;
}

const nowIso = () => new Date().toISOString();

const toRecord = (row: LocalVideoRow): LocalVideoRecord => ({
  id: row.id,
  ownerId: row.owner_id,
  localUri: row.local_uri,
  remoteVideoId: row.remote_video_id,
  // The local id is already a UUID, so it is a safe fallback for rows queued by
  // an older build that predates the idempotency column.
  idempotencyKey: row.idempotency_key ?? row.id,
  fileName: row.file_name ?? `video_${row.id}`,
  contentType: row.content_type ?? "video/mp4",
  fileSize: row.file_size ?? 0,
  thumbnailUri: row.thumbnail_uri,
  latitude: row.latitude,
  longitude: row.longitude,
  status: row.status as LocalVideoStatus,
  storageKind:
    row.storage_kind === "documents" ? "documents" : ("cache" as const),
  retryCount: row.retry_count ?? 0,
  lastError: row.last_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? row.created_at,
});

class VideoRepository {
  async insert(video: NewLocalVideo): Promise<void> {
    const db = await getDatabase();
    const timestamp = nowIso();

    await db.runAsync(
      `INSERT INTO videos (
        id, owner_id, local_uri, idempotency_key, file_name, content_type,
        file_size, thumbnail_uri, latitude, longitude, status, storage_kind,
        retry_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        video.id,
        video.ownerId,
        video.localUri,
        video.idempotencyKey,
        video.fileName,
        video.contentType,
        video.fileSize,
        video.thumbnailUri ?? null,
        video.latitude,
        video.longitude,
        video.status,
        video.storageKind,
        video.createdAt,
        timestamp,
      ],
    );
  }

  async findById(id: string): Promise<LocalVideoRecord | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<LocalVideoRow>(
      "SELECT * FROM videos WHERE id = ?",
      [id],
    );

    return row ? toRecord(row) : null;
  }

  /**
   * Rows that still need to leave the device, oldest first.
   *
   * `ownerId` scopes the queue to the signed-in user (plus rows recorded before
   * a session existed). Without it, only anonymous rows are returned so one
   * account can never upload another account's recording.
   */
  async findSyncable(ownerId: string | null): Promise<LocalVideoRecord[]> {
    const db = await getDatabase();
    const rows = ownerId
      ? await db.getAllAsync<LocalVideoRow>(
          `SELECT * FROM videos
            WHERE status IN ('pending', 'failed')
              AND (owner_id IS NULL OR owner_id = ?)
            ORDER BY created_at ASC`,
          [ownerId],
        )
      : await db.getAllAsync<LocalVideoRow>(
          `SELECT * FROM videos
            WHERE status IN ('pending', 'failed')
              AND owner_id IS NULL
            ORDER BY created_at ASC`,
        );

    return rows.map(toRecord);
  }

  /**
   * Marks a row as being uploaded. Returns false when another sync already
   * claimed it, which keeps two concurrent passes from uploading it twice.
   */
  async claimForSync(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `UPDATE videos
          SET status = 'uploading',
              updated_at = ?
        WHERE id = ?
          AND status IN ('pending', 'failed')`,
      [nowIso(), id],
    );

    return result.changes > 0;
  }

  async setRemoteVideoId(id: string, remoteVideoId: string): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      `UPDATE videos
          SET remote_video_id = ?,
              updated_at = ?
        WHERE id = ?`,
      [remoteVideoId, nowIso(), id],
    );
  }

  async setOwner(id: string, ownerId: string): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      `UPDATE videos
          SET owner_id = ?,
              updated_at = ?
        WHERE id = ?`,
      [ownerId, nowIso(), id],
    );
  }

  async markUploaded(id: string, remoteVideoId: string): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      `UPDATE videos
          SET status = 'uploaded',
              remote_video_id = ?,
              last_error = NULL,
              updated_at = ?
        WHERE id = ?`,
      [remoteVideoId, nowIso(), id],
    );
  }

  /** A direct upload failed, so the persisted copy waits for the sync worker. */
  async markQueued(
    id: string,
    localUri: string,
    storageKind: LocalVideoStorageKind,
    fileSize: number,
    error: string | null,
  ): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      `UPDATE videos
          SET status = 'pending',
              local_uri = ?,
              storage_kind = ?,
              file_size = ?,
              last_error = ?,
              updated_at = ?
        WHERE id = ?`,
      [localUri, storageKind, fileSize, error, nowIso(), id],
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      `UPDATE videos
          SET status = 'failed',
              retry_count = retry_count + 1,
              last_error = ?,
              updated_at = ?
        WHERE id = ?`,
      [error, nowIso(), id],
    );
  }

  /** Removes a not-yet-claimed queued row (e.g. the user recaptured). */
  async removeIfQueued(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `DELETE FROM videos
        WHERE id = ?
          AND status IN ('pending', 'failed')`,
      [id],
    );

    return result.changes > 0;
  }

  async countSyncable(ownerId: string | null): Promise<number> {
    const db = await getDatabase();
    const row = ownerId
      ? await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM videos
            WHERE status IN ('pending', 'failed')
              AND (owner_id IS NULL OR owner_id = ?)`,
          [ownerId],
        )
      : await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM videos
            WHERE status IN ('pending', 'failed')
              AND owner_id IS NULL`,
        );

    return row?.count ?? 0;
  }
}

export const videoRepository = new VideoRepository();
