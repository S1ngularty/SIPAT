import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";

const DEFAULT_VOICE_ID = "fil-ph-x-fie-local";
const SPEECH_LANGUAGE = "fil-PH";

/** Highest chunk size we will send to the platform engine at once. */
const MAX_CHUNK_LENGTH = 3000;

const VOICE_LABELS: Record<string, string> = {
  "fil-ph-x-cfc-network": "Babae 1 (HD)",
  "fil-ph-x-cfc-local": "Babae 1 (Offline)",
  "fil-ph-x-fic-network": "Babae 2 (HD)",
  "fil-ph-x-fic-local": "Babae 2 (Offline)",
  "fil-ph-x-fid-network": "Lalaki 1 (HD)",
  "fil-ph-x-fid-local": "Lalaki 1 (Offline)",
  "fil-ph-x-fie-network": "Lalaki 2 (HD)",
  "fil-ph-x-fie-local": "Lalaki 2 (Offline)",
};

export type LabeledVoice = Speech.Voice & {
  label: string;
};

/**
 * Voice identifiers differ per platform (Android exposes the `fil-ph-x-*` ids
 * above, iOS uses Apple's own bundles), so fall back to the voice language.
 */
const isFilipinoVoice = (voice: Speech.Voice) =>
  voice.identifier in VOICE_LABELS ||
  (voice.language ?? "").toLowerCase().startsWith("fil");

const isOfflineVoice = (voice: Speech.Voice) =>
  voice.identifier.endsWith("-local");

const labelForVoice = (voice: Speech.Voice): string => {
  const known = VOICE_LABELS[voice.identifier];

  if (known) return known;

  const name = voice.name?.trim() || "Filipino";

  return `${name} (${isOfflineVoice(voice) ? "Offline" : "HD"})`;
};

/**
 * Splits long replies into utterances the engine accepts. Prefers breaking on
 * sentence boundaries, then on the last space, and only hard-cuts as a last
 * resort so no words are lost.
 */
const splitForSpeech = (text: string, maxLength: number): string[] => {
  const clean = text.trim();

  if (clean.length <= maxLength) return [clean];

  const chunks: string[] = [];
  let remaining = clean;

  while (remaining.length > maxLength) {
    let cut = remaining.lastIndexOf(". ", maxLength);

    if (cut <= 0) cut = remaining.lastIndexOf(" ", maxLength);
    if (cut <= 0) cut = maxLength;

    const chunk = remaining.slice(0, cut).trim();

    if (chunk) chunks.push(chunk);

    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);

  return chunks;
};

export function useTextToSpeech() {
  const [voices, setVoices] = useState<LabeledVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(
    DEFAULT_VOICE_ID
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Bumped whenever a new utterance starts or speech is stopped. */
  const generationRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Leaving the screen must not keep talking in the background.
      generationRef.current += 1;
      void Speech.stop();
    };
  }, []);

  // Load the Filipino voices once when the hook is mounted.
  useEffect(() => {
    let isMounted = true;

    async function loadVoices() {
      try {
        setIsLoadingVoices(true);

        const availableVoices = await Speech.getAvailableVoicesAsync();

        const filipinoVoices = availableVoices
          .filter(isFilipinoVoice)
          .map((voice) => ({
            ...voice,
            label: labelForVoice(voice),
          }))
          .sort((a, b) => {
            // Show offline voices before network voices.
            const aOffline = isOfflineVoice(a);
            const bOffline = isOfflineVoice(b);

            if (aOffline !== bOffline) {
              return aOffline ? -1 : 1;
            }

            return a.label.localeCompare(b.label);
          });

        if (!isMounted) return;

        setVoices(filipinoVoices);

        // Prefer Lalaki 2 (Offline), then use the first available voice.
        const preferredVoice = filipinoVoices.find(
          (voice) => voice.identifier === DEFAULT_VOICE_ID
        );

        setSelectedVoice(
          preferredVoice?.identifier ?? filipinoVoices[0]?.identifier ?? null
        );
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Filipino voices."
          );
        }
      } finally {
        if (isMounted) setIsLoadingVoices(false);
      }
    }

    loadVoices();

    return () => {
      isMounted = false;
    };
  }, []);

  const stop = useCallback(async () => {
    generationRef.current += 1;

    try {
      await Speech.stop();
    } finally {
      if (isMountedRef.current) setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    async (text: string, voiceId?: string) => {
      const content = text.trim();

      if (!content) return;

      const generation = generationRef.current + 1;
      generationRef.current = generation;

      const isCurrent = () => generationRef.current === generation;

      try {
        setError(null);

        // Stop previous speech before starting another.
        if (await Speech.isSpeakingAsync()) {
          await Speech.stop();
        }

        // Another call (or `stop`) happened while we were awaiting.
        if (!isCurrent()) return;

        const platformLimit =
          Number.isFinite(Speech.maxSpeechInputLength) &&
          Speech.maxSpeechInputLength > 0
            ? Speech.maxSpeechInputLength
            : MAX_CHUNK_LENGTH;

        const chunks = splitForSpeech(
          content,
          Math.min(platformLimit, MAX_CHUNK_LENGTH)
        );

        setIsSpeaking(true);

        chunks.forEach((chunk, index) => {
          const isLastChunk = index === chunks.length - 1;

          Speech.speak(chunk, {
            language: SPEECH_LANGUAGE,
            voice: voiceId ?? selectedVoice ?? undefined,
            pitch: 1.0,
            rate: 0.95,

            onDone: () => {
              if (!isLastChunk || !isCurrent()) return;
              if (isMountedRef.current) setIsSpeaking(false);
            },
            onStopped: () => {
              if (!isCurrent()) return;
              if (isMountedRef.current) setIsSpeaking(false);
            },
            onError: (speechError) => {
              if (!isCurrent()) return;
              if (!isMountedRef.current) return;

              setIsSpeaking(false);
              setError(speechError.message || "Speech playback failed.");
            },
          });
        });
      } catch (err) {
        if (!isCurrent()) return;

        if (isMountedRef.current) {
          setIsSpeaking(false);
          setError(
            err instanceof Error ? err.message : "Unable to speak the text."
          );
        }
      }
    },
    [selectedVoice]
  );

  const selectVoice = useCallback(
    (voiceId: string, previewText?: string) => {
      setSelectedVoice(voiceId);

      if (previewText) {
        void speak(previewText, voiceId);
      }
    },
    [speak]
  );

  const previewVoice = useCallback(
    (voiceId: string) => {
      void speak("Kumusta! Handa na akong makinig sa iyo.", voiceId);
    },
    [speak]
  );

  return {
    voices,
    selectedVoice,
    isSpeaking,
    isLoadingVoices,
    error,
    speak,
    stop,
    selectVoice,
    previewVoice,
  };
}
