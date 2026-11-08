import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { initWhisper } from 'whisper.rn';
import type { WhisperContext } from 'whisper.rn';

import {
  checkWhisperModel,
  downloadWhisperModel,
} from './speech.model';

export type SpeechStatus =
  | 'checking'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error'
  | 'skipped';

type SpeechContextValue = {
  status: SpeechStatus;
  /** Download progress as a 0–1 fraction. */
  progress: number;
  error: string | null;
  /** Initialized Whisper context; `null` until the model is ready. */
  context: WhisperContext | null;
  isReady: boolean;
  /** Retry a failed check/download/initialization. */
  retry: () => void;
  /** Let the user into the app without voice input. */
  skip: () => void;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  return 'The speech model could not be prepared. Please try again.';
}

/**
 * Owns the single Whisper model/context for the whole app.
 *
 * It is mounted above the navigator so the model can be checked and loaded
 * while the splash screen is visible; Flora (and the future video-audio path)
 * then reuse the same context instead of loading the ~466 MB model twice.
 */
export const SpeechProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<SpeechStatus>('checking');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<WhisperContext | null>(null);

  const contextRef = useRef<WhisperContext | null>(null);
  const runIdRef = useRef(0);

  const bootstrap = useCallback(async () => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    setStatus('checking');
    setProgress(0);
    setError(null);

    try {
      const model = await checkWhisperModel();

      if (runId !== runIdRef.current) return;

      if (!model.installed) {
        setStatus('downloading');

        await downloadWhisperModel((fraction) => {
          if (runId === runIdRef.current) setProgress(fraction);
        });
      }

      if (runId !== runIdRef.current) return;

      setStatus('loading');

      const nextContext = await initWhisper({
        filePath: model.path,
        useGpu: false,
      });

      if (runId !== runIdRef.current) {
        await nextContext.release();
        return;
      }

      const previous = contextRef.current;

      contextRef.current = nextContext;
      setContext(nextContext);
      setStatus('ready');

      if (previous) {
        void previous.release();
      }
    } catch (bootstrapError) {
      if (runId !== runIdRef.current) return;

      console.error('Speech model initialization failed:', bootstrapError);

      setError(describeError(bootstrapError));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void bootstrap();

    return () => {
      // Invalidate any in-flight run and release the native context.
      runIdRef.current += 1;

      const current = contextRef.current;

      contextRef.current = null;

      if (current) {
        void current.release();
      }
    };
  }, [bootstrap]);

  const retry = useCallback(() => {
    void bootstrap();
  }, [bootstrap]);

  const skip = useCallback(() => {
    // Invalidate an in-flight attempt so its result cannot override the skip.
    runIdRef.current += 1;

    setError(null);
    setStatus('skipped');
  }, []);

  const value = useMemo<SpeechContextValue>(
    () => ({
      status,
      progress,
      error,
      context,
      isReady: status === 'ready' && context !== null,
      retry,
      skip,
    }),
    [context, error, progress, retry, skip, status],
  );

  return (
    <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
  );
};

export const useSpeech = (): SpeechContextValue => {
  const value = useContext(SpeechContext);

  if (!value) {
    throw new Error('useSpeech must be used inside a SpeechProvider');
  }

  return value;
};
