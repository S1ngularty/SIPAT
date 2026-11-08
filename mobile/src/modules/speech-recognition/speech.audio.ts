/** Audio helpers shared by every Whisper capture path. */

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
