import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
} from 'react-native';
import {
  AudioModule,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';

import { useSpeech } from './SpeechProvider';
import {
  float32ToInt16,
  mergeAudioChunks,
  peakAmplitude,
  resampleAudio,
  WHISPER_SAMPLE_RATE,
} from './speech.audio';

/** Below this peak level a recording is treated as silence, not speech. */
const SILENCE_THRESHOLD = 0.0015;

/** Short clips produce hallucinated text, so require at least ~0.4 s. */
const MIN_SAMPLES = Math.round(WHISPER_SAMPLE_RATE * 0.4);

type SpeechRecorder = {
  isRecording: boolean;
  isTranscribing: boolean;
  /** Whisper inference progress, 0–100. */
  transcribeProgress: number;
  /** Length of the current recording, in milliseconds. */
  durationMs: number;
  startRecording: () => Promise<void>;
  /** Stops the microphone, transcribes, and resolves with the text. */
  stopRecording: () => Promise<string>;
  cancelRecording: () => void;
};

/**
 * Record-then-transcribe microphone capture backed by the shared Whisper
 * context.
 *
 * Whisper's realtime pipeline needs the Silero VAD model plus a native PCM
 * adapter, so this keeps the reliable path: capture 16 kHz mono PCM, stop,
 * then transcribe the whole clip. The returned shape is intentionally small so
 * a streaming implementation can replace the internals later without touching
 * the Flora screens.
 */
export function useSpeechRecorder(): SpeechRecorder {
  const { context, isReady } = useSpeech();

  const chunksRef = useRef<Float32Array[]>([]);
  const totalSamplesRef = useRef(0);
  const recordingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const mountedRef = useRef(true);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Capture mono Float32 PCM at the rate Whisper wants.
  const audio = useAudioStream({
    sampleRate: WHISPER_SAMPLE_RATE,
    channels: 1,
    encoding: 'float32',

    onBuffer: ({ data }) => {
      if (!recordingRef.current) return;

      // Native buffers may be reused, so keep a copy of each chunk.
      const samples = new Float32Array(data.slice(0));

      chunksRef.current.push(samples);
      totalSamplesRef.current += samples.length;
    },
  });

  const resetCapture = useCallback(() => {
    chunksRef.current = [];
    totalSamplesRef.current = 0;
  }, []);

  const stopStream = useCallback(() => {
    try {
      audio.stream.stop();
    } catch (stopError) {
      console.warn('Failed to stop audio stream:', stopError);
    }
  }, [audio.stream]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      recordingRef.current = false;
      clearTimer();
      stopStream();
    };
  }, [clearTimer, stopStream]);

  // A call or an app switch must not leave the microphone hot.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active' || !recordingRef.current) return;

        recordingRef.current = false;

        clearTimer();
        stopStream();
        resetCapture();

        setDurationMs(0);
        setIsRecording(false);
      },
    );

    return () => subscription.remove();
  }, [clearTimer, resetCapture, stopStream]);

  const startRecording = useCallback(async () => {
    if (recordingRef.current) return;

    if (isTranscribing) {
      throw new Error('Please wait for the previous transcription to finish.');
    }

    if (!isReady || !context) {
      throw new Error(
        'Speech recognition is not ready yet. Restart the app to retry.',
      );
    }

    const permission = await AudioModule.requestRecordingPermissionsAsync();

    if (!permission.granted) {
      throw new Error(
        'Microphone access is required for voice input. Enable it in your device settings.',
      );
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    resetCapture();

    setTranscribeProgress(0);
    setDurationMs(0);

    startedAtRef.current = Date.now();
    recordingRef.current = true;

    try {
      await audio.stream.start();
    } catch (startError) {
      recordingRef.current = false;

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch((audioModeError) => {
        console.warn('Failed to restore audio mode:', audioModeError);
      });

      throw startError;
    }

    if (!mountedRef.current) {
      recordingRef.current = false;
      stopStream();
      return;
    }

    setIsRecording(true);

    clearTimer();

    timerRef.current = setInterval(() => {
      if (!mountedRef.current) return;

      setDurationMs(Date.now() - startedAtRef.current);
    }, 250);
  }, [
    audio.stream,
    clearTimer,
    context,
    isReady,
    isTranscribing,
    resetCapture,
    stopStream,
  ]);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (!recordingRef.current) return '';

    recordingRef.current = false;

    clearTimer();
    setDurationMs(Date.now() - startedAtRef.current);
    setIsRecording(false);

    const actualSampleRate = audio.stream.sampleRate || WHISPER_SAMPLE_RATE;

    stopStream();

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (audioModeError) {
      console.warn('Failed to restore audio mode:', audioModeError);
    }

    const chunks = chunksRef.current;
    const totalSamples = totalSamplesRef.current;

    resetCapture();

    if (chunks.length === 0 || totalSamples === 0) {
      throw new Error('No audio was captured. Please try again.');
    }

    if (!context) {
      throw new Error(
        'Speech recognition is not ready yet. Restart the app to retry.',
      );
    }

    const merged = mergeAudioChunks(chunks, totalSamples);
    const resampled = resampleAudio(merged, actualSampleRate, WHISPER_SAMPLE_RATE);

    if (resampled.length < MIN_SAMPLES) {
      throw new Error('That was too short. Hold the mic and speak a full question.');
    }

    if (peakAmplitude(resampled) < SILENCE_THRESHOLD) {
      throw new Error(
        'We could not hear any speech. Try again and speak closer to the microphone.',
      );
    }

    const pcm16 = float32ToInt16(resampled);

    setIsTranscribing(true);
    setTranscribeProgress(0);

    try {
      const { promise } = context.transcribeData(
        pcm16.buffer as ArrayBuffer,
        {
          language: 'tl',
          onProgress: (value) => {
            if (mountedRef.current) setTranscribeProgress(value);
          },
        },
      );

      const { result } = await promise;

      return result.trim();
    } finally {
      if (mountedRef.current) {
        setIsTranscribing(false);
        setTranscribeProgress(0);
      }
    }
  }, [
    audio.stream,
    clearTimer,
    context,
    resetCapture,
    stopStream,
  ]);

  const cancelRecording = useCallback(() => {
    if (!recordingRef.current) return;

    recordingRef.current = false;

    clearTimer();
    stopStream();
    resetCapture();

    setDurationMs(0);
    setIsRecording(false);

    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch((audioModeError) => {
      console.warn('Failed to restore audio mode:', audioModeError);
    });
  }, [clearTimer, resetCapture, stopStream]);

  return {
    isRecording,
    isTranscribing,
    transcribeProgress,
    durationMs,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
