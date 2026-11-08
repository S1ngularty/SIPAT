import * as FileSystem from 'expo-file-system/legacy';

/**
 * Offline speech model management.
 *
 * The model lives in the app's document directory so it survives restarts and
 * is only downloaded once. A small manifest next to the weights records which
 * model version was installed, which lets the startup check notice when the
 * bundled model definition changes and trigger a re-download.
 */

const MODELS_FOLDER = 'models/';
const MANIFEST_FILE = 'whisper-model.json';

/** Bump `version` whenever `url`/`fileName` change to force an update. */
export const WHISPER_MODEL = {
  version: 'whisper-small-v1',
  fileName: 'ggml-small.bin',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  /** A complete `ggml-small.bin` is ~466 MB; anything smaller is partial. */
  minBytes: 400 * 1024 * 1024,
} as const;

type ModelManifest = {
  version: string;
  fileName: string;
  size: number;
  updatedAt: string;
};

export type WhisperModelStatus = {
  installed: boolean;
  path: string;
  version: string | null;
};

function documentDirectory(): string {
  const directory = FileSystem.documentDirectory;

  if (!directory) {
    throw new Error('Device document directory is unavailable.');
  }

  return directory;
}

export function getWhisperModelDirectory(): string {
  return `${documentDirectory()}${MODELS_FOLDER}`;
}

export function getWhisperModelPath(): string {
  return `${getWhisperModelDirectory()}${WHISPER_MODEL.fileName}`;
}

function getManifestPath(): string {
  return `${getWhisperModelDirectory()}${MANIFEST_FILE}`;
}

async function readManifest(): Promise<ModelManifest | null> {
  try {
    const info = await FileSystem.getInfoAsync(getManifestPath());

    if (!info.exists) return null;

    const raw = await FileSystem.readAsStringAsync(getManifestPath());
    const parsed = JSON.parse(raw) as Partial<ModelManifest>;

    if (
      typeof parsed.version !== 'string' ||
      typeof parsed.fileName !== 'string' ||
      typeof parsed.size !== 'number'
    ) {
      return null;
    }

    return {
      version: parsed.version,
      fileName: parsed.fileName,
      size: parsed.size,
      updatedAt: parsed.updatedAt ?? '',
    };
  } catch {
    return null;
  }
}

async function writeManifest(size: number): Promise<void> {
  const manifest: ModelManifest = {
    version: WHISPER_MODEL.version,
    fileName: WHISPER_MODEL.fileName,
    size,
    updatedAt: new Date().toISOString(),
  };

  await FileSystem.writeAsStringAsync(
    getManifestPath(),
    JSON.stringify(manifest),
  );
}

/**
 * Older builds saved the `small` download under the `base` file name. Adopt it
 * instead of asking the user to download ~466 MB again.
 */
async function adoptLegacyModel(targetPath: string): Promise<void> {
  const legacyPath = `${getWhisperModelDirectory()}ggml-base.bin`;

  if (legacyPath === targetPath) return;

  const legacy = await FileSystem.getInfoAsync(legacyPath);

  if (!legacy.exists) return;

  if ((legacy.size ?? 0) >= WHISPER_MODEL.minBytes) {
    try {
      await FileSystem.moveAsync({ from: legacyPath, to: targetPath });
    } catch {
      // A failed migration is harmless: the normal download path takes over.
      await FileSystem.deleteAsync(legacyPath, { idempotent: true });
    }

    return;
  }

  await FileSystem.deleteAsync(legacyPath, { idempotent: true });
}

/**
 * Returns whether a complete model is already on disk. Incomplete downloads
 * and models from an older version are removed so the caller can re-download.
 */
export async function checkWhisperModel(): Promise<WhisperModelStatus> {
  await FileSystem.makeDirectoryAsync(getWhisperModelDirectory(), {
    intermediates: true,
  });

  const path = getWhisperModelPath();

  const target = await FileSystem.getInfoAsync(path);

  if (!target.exists) {
    await adoptLegacyModel(path);
  }

  const info = await FileSystem.getInfoAsync(path);

  const isComplete =
    info.exists &&
    !info.isDirectory &&
    (info.size ?? 0) >= WHISPER_MODEL.minBytes;

  if (isComplete) {
    const manifest = await readManifest();

    // Adopt files downloaded by older builds that had no manifest.
    if (!manifest) {
      await writeManifest(info.size ?? 0);
      return { installed: true, path, version: WHISPER_MODEL.version };
    }

    if (manifest.version === WHISPER_MODEL.version) {
      return { installed: true, path, version: manifest.version };
    }
  }

  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }

  return { installed: false, path, version: null };
}

/**
 * Downloads the model and reports progress as a 0–1 fraction. Any partial file
 * left by an interrupted attempt is replaced.
 */
export async function downloadWhisperModel(
  onProgress?: (progress: number) => void,
): Promise<string> {
  await FileSystem.makeDirectoryAsync(getWhisperModelDirectory(), {
    intermediates: true,
  });

  const path = getWhisperModelPath();

  await FileSystem.deleteAsync(path, { idempotent: true });

  const download = FileSystem.createDownloadResumable(
    WHISPER_MODEL.url,
    path,
    {},
    (progress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = progress;

      if (totalBytesExpectedToWrite > 0) {
        const fraction = totalBytesWritten / totalBytesExpectedToWrite;

        onProgress?.(Math.max(0, Math.min(1, fraction)));
      }
    },
  );

  let result: Awaited<ReturnType<typeof download.downloadAsync>>;

  try {
    result = await download.downloadAsync();
  } catch {
    await FileSystem.deleteAsync(path, { idempotent: true });
    throw new Error(
      'Could not download the speech model. Check your connection and try again.',
    );
  }

  if (!result || result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(path, { idempotent: true });
    throw new Error(
      'Could not download the speech model. Check your connection and try again.',
    );
  }

  const info = await FileSystem.getInfoAsync(path);

  if (!info.exists || (info.size ?? 0) < WHISPER_MODEL.minBytes) {
    await FileSystem.deleteAsync(path, { idempotent: true });
    throw new Error(
      'The speech model download did not finish. Please try again.',
    );
  }

  await writeManifest(info.size ?? 0);

  onProgress?.(1);

  return result.uri;
}
