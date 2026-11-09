/** Audio helpers shared by every Whisper capture path. */
import * as FileSystem from "expo-file-system";

type VideoAudioExtractorModule = typeof import("expo-video-audio-extractor");

/** Whisper models are trained on 16 kHz mono audio. */
export const WHISPER_SAMPLE_RATE = 16000;

/** Linear-interpolation resampler — good enough for speech recognition. */
export function resampleAudio(
  input: Float32Array,
  originalRate: number,
  targetRate: number = WHISPER_SAMPLE_RATE,
): Float32Array {
  if (originalRate === targetRate || originalRate <= 0) {
    return input;
  }

  const outputLength = Math.round((input.length * targetRate) / originalRate);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const sourcePosition = (i * originalRate) / targetRate;
    const index = Math.floor(sourcePosition);
    const fraction = sourcePosition - index;

    const current = input[index] ?? 0;
    const next = input[index + 1] ?? current;

    output[i] = current + (next - current) * fraction;
  }

  return output;
}

/** Merge the native PCM buffers captured during a recording. */
export function mergeAudioChunks(
  chunks: Float32Array[],
  totalSamples: number,
): Float32Array {
  const merged = new Float32Array(totalSamples);

  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

/** Peak amplitude (0–1) — used to reject silent recordings. */
export function peakAmplitude(samples: Float32Array): number {
  let peak = 0;

  for (let i = 0; i < samples.length; i++) {
    const value = Math.abs(samples[i]);

    if (value > peak) peak = value;
  }

  return peak;
}

/** Convert Float32 samples (-1…1) to the signed 16-bit PCM Whisper expects. */
export function float32ToInt16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));

    pcm[i] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }

  return pcm;
}

/**
 * Native modules (`MediaExtractor`, whisper.rn's `std::ifstream`) expect a
 * plain filesystem path, not a `file://` URI.
 */
export function toPlainFilePath(uri: string): string {
  if (!uri.startsWith("file://")) return uri;

  const path = uri.slice("file://".length);

  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;

  return JSON.stringify(error);
}

/**
 * Load the extractor lazily. `expo-video-audio-extractor` resolves its native
 * module at import time, so a static import would crash the whole preview
 * bundle in a dev client built before the package was installed. Loading it
 * here turns that into a readable error instead.
 */
async function loadExtractor(): Promise<VideoAudioExtractorModule> {
  try {
    return await import("expo-video-audio-extractor");
  } catch (error) {
    const message = errorMessage(error);

    console.error("[video-audio] native extractor unavailable:", message, error);

    throw new Error(
      "The audio extractor native module is missing from this build. Rebuild the app with `npx expo run:android` or `npx expo run:ios` after installing expo-video-audio-extractor.",
    );
  }
}

/**
 * Extract a temporary WAV from a recorded video.
 *
 * WAV is required: whisper.rn only reads WAV (or raw PCM), so the extractor's
 * default M4A output cannot be transcribed. We deliberately do **not** pass
 * `sampleRate`/`channels`: Android's WAV writer changes the header but does not
 * resample the decoded PCM, which would corrupt the audio. whisper.rn reads the
 * real WAV header and resamples to 16 kHz itself.
 *
 * Throws a user-readable error instead of returning `null` so the preview can
 * show what actually failed.
 */
export async function extractVideoAudio(videoUri: string): Promise<string> {
  const inputFile = new FileSystem.File(videoUri);

  if (!inputFile.exists) {
    throw new Error(`Source video file does not exist: ${videoUri}`);
  }

  const outputFile = new FileSystem.File(
    FileSystem.Paths.cache,
    `sipat-audio-${Date.now()}.wav`,
  );

  const inputPath = toPlainFilePath(inputFile.uri);
  const outputPath = toPlainFilePath(outputFile.uri);

  console.log("[video-audio] extracting", {
    inputPath,
    outputPath,
    inputSize: inputFile.size,
  });

  const { extractAudio } = await loadExtractor();

  try {
    await extractAudio({
      video: inputPath,
      output: outputPath,
      format: "wav",
    });
  } catch (error) {
    const message = errorMessage(error);

    console.error("[video-audio] extraction failed:", message, error);

    if (/no audio track|audio.*not found/i.test(message)) {
      throw new Error(
        "This video has no audio track. Record again with the microphone enabled.",
      );
    }

    if (/format not supported|not supported on this device/i.test(message)) {
      throw new Error(
        "This device cannot export WAV audio from the video. iOS currently cannot convert AAC video audio to WAV.",
      );
    }

    throw new Error(`Audio extraction failed: ${message}`);
  }

  if (!outputFile.exists || outputFile.size === 0) {
    throw new Error("Audio extraction produced an empty file.");
  }

  console.log("[video-audio] extracted", outputFile.uri, outputFile.size);

  return outputFile.uri;
}
