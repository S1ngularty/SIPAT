import { dbPromise } from "./index";

/**
 * Columns that were added after the first version of the local `videos` table.
 *
 * `CREATE TABLE IF NOT EXISTS` never changes an existing table, so every column
 * here is also applied through `ALTER TABLE` when it is missing. Keeping the
 * table definition and this list in sync lets an older install upgrade in place
 * instead of losing queued recordings.
 */
const VIDEO_COLUMNS: ReadonlyArray<{ name: string; definition: string }> = [
  { name: "remote_video_id", definition: "TEXT" },
  { name: "idempotency_key", definition: "TEXT" },
  { name: "file_name", definition: "TEXT" },
  { name: "content_type", definition: "TEXT" },
  { name: "file_size", definition: "INTEGER NOT NULL DEFAULT 0" },
  { name: "thumbnail_uri", definition: "TEXT" },
  { name: "latitude", definition: "REAL" },
  { name: "longitude", definition: "REAL" },
  { name: "storage_kind", definition: "TEXT NOT NULL DEFAULT 'cache'" },
  { name: "last_error", definition: "TEXT" },
  { name: "updated_at", definition: "TEXT NOT NULL DEFAULT ''" },
];

let initPromise: Promise<void> | null = null;

/**
 * Opens the local queue database, creates the table and upgrades older
 * installs. Safe to call as often as needed: the work runs exactly once.
 */
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = migrateDatabase().catch((error) => {
      // Allow a later call to retry after a transient failure (e.g. storage
      // still being mounted while the app boots).
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

async function migrateDatabase(): Promise<void> {
  const db = await dbPromise;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT,
      local_uri TEXT NOT NULL,
      remote_video_id TEXT,
      idempotency_key TEXT,
      file_name TEXT,
      content_type TEXT,
      file_size INTEGER NOT NULL DEFAULT 0,
      thumbnail_uri TEXT,
      latitude REAL,
      longitude REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      storage_kind TEXT NOT NULL DEFAULT 'cache',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);

  const existingColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(videos)",
  );
  const existingNames = new Set(existingColumns.map((column) => column.name));

  for (const column of VIDEO_COLUMNS) {
    if (existingNames.has(column.name)) continue;

    await db.execAsync(
      `ALTER TABLE videos ADD COLUMN ${column.name} ${column.definition}`,
    );
  }

  // An upload cannot survive an app restart, so anything still marked as
  // uploading was interrupted by a crash or a force-quit. Put it back in the
  // queue instead of leaving it stuck forever.
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE videos
        SET status = 'pending',
            updated_at = ?
      WHERE status = 'uploading'`,
    [now],
  );

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_videos_sync
      ON videos (status, created_at);

    CREATE INDEX IF NOT EXISTS idx_videos_owner
      ON videos (owner_id, status);
  `);
}

/** Database handle for repositories; waits for the schema to be ready. */
export async function getDatabase() {
  await initDatabase();

  return dbPromise;
}
