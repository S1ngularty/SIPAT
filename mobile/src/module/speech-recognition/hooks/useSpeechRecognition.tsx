import { useCallback, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

/** Collapses the extra whitespace native engines sometimes emit. */
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Joins transcript pieces without losing earlier speech or duplicating words.
 *
 * Continuous recognition reports each utterance as a *new segment* on Android
 * (and some iOS paths), while other engines resend the whole session on every
 * event. Both are handled here:
 * - a piece that already contains everything we have replaces it,
 * - a piece that is the tail of what we have is ignored,
 * - overlapping words at the seam are merged,
 * - anything else is appended.
 */
const mergeTranscript = (existing: string, incoming: string): string => {
  const base = normalize(existing);
  const next = normalize(incoming);

  if (!base) return next;
  if (!next) return base;
  if (next === base || next.startsWith(`${base} `)) return next;
  if (base.endsWith(` ${next}`) || base === next) return base;

  const baseWords = base.split(" ");
  const nextWords = next.split(" ");
  const maxOverlap = Math.min(baseWords.length, nextWords.length);

  for (let size = maxOverlap; size > 0; size -= 1) {
    const tail = baseWords.slice(baseWords.length - size).join(" ").toLowerCase();
    const head = nextWords.slice(0, size).join(" ").toLowerCase();

    if (tail === head) {
      return `${base} ${nextWords.slice(size).join(" ")}`.trim();
    }
  }

  return `${base} ${next}`;
};

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** Finalized text for the current session (survives interim rewrites). */
  const committedRef = useRef("");
  /** Latest interim text, committed when recognition ends. */
  const interimRef = useRef("");
  const listeningRef = useRef(false);

  const commitInterim = () => {
    if (!interimRef.current) return;

    committedRef.current = mergeTranscript(
      committedRef.current,
      interimRef.current
    );
    interimRef.current = "";
    setTranscript(committedRef.current);
  };

  const clearTranscript = useCallback(() => {
    committedRef.current = "";
    interimRef.current = "";
    setTranscript("");
  }, []);

  useSpeechRecognitionEvent("start", () => {
    listeningRef.current = true;
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent("end", () => {
    listeningRef.current = false;
    // The last words may only exist as an interim result.
    commitInterim();
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const recognizedText = normalize(event.results[0]?.transcript ?? "");

    if (!recognizedText) return;

    if (event.isFinal) {
      // Each final result only covers the newest segment, so append it to what
      // we already heard instead of replacing the whole transcript.
      committedRef.current = mergeTranscript(
        committedRef.current,
        recognizedText
      );
      interimRef.current = "";
      setTranscript(committedRef.current);
      return;
    }

    interimRef.current = recognizedText;
    setTranscript(mergeTranscript(committedRef.current, recognizedText));
  });

  useSpeechRecognitionEvent("error", (event) => {
    listeningRef.current = false;
    // Keep whatever was already transcribed.
    commitInterim();
    setIsListening(false);
    setError(event.message || event.error);
  });

  const startListening = useCallback(async () => {
    if (listeningRef.current) return;

    try {
      setError(null);
      committedRef.current = "";
      interimRef.current = "";
      setTranscript("");

      const permission =
        await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();

      if (!permission.granted) {
        setError("Microphone permission was denied.");
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: "fil-PH",
        interimResults: true,
        continuous: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start speech recognition."
      );
    }
  }, []);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
}
