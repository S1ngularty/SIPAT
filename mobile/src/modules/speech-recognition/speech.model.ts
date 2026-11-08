
import * as FileSystem from 'expo-file-system/legacy';

const MODEL_DIRECTORY = `${FileSystem.documentDirectory}models/`;

const MODEL_FILE = `${MODEL_DIRECTORY}ggml-base.bin`;

const MODEL_URL =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin';

export async function downloadWhisperModel(
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Device document directory is unavailable.');
  }

  await FileSystem.makeDirectoryAsync(MODEL_DIRECTORY, {
    intermediates: true,
  });

  // Reuse an existing model.
  const existing = await FileSystem.getInfoAsync(MODEL_FILE);

  if (existing.exists && existing.size && existing.size > 100 * 1024 * 1024) {
    return MODEL_FILE;
  }

  // Remove incomplete downloads.
  if (existing.exists) {
    await FileSystem.deleteAsync(MODEL_FILE, {
      idempotent: true,
    });
  }

  const download = FileSystem.createDownloadResumable(
    MODEL_URL,
    MODEL_FILE,
    {},
    (progress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = progress;

      if (totalBytesExpectedToWrite > 0) {
        const percentage =
          totalBytesWritten / totalBytesExpectedToWrite;

        onProgress?.(percentage);
      }
    },
  );

  const result = await download.downloadAsync();

  if (!result || result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(MODEL_FILE, { idempotent: true });
    throw new Error('Failed to download Whisper model.');
  }

  const downloaded = await FileSystem.getInfoAsync(MODEL_FILE);

  if (!downloaded.exists || !downloaded.size || downloaded.size < 100 * 1024 * 1024) {
    await FileSystem.deleteAsync(MODEL_FILE, { idempotent: true });
    throw new Error('Downloaded Whisper model is incomplete.');
  }

  return result.uri;
}
