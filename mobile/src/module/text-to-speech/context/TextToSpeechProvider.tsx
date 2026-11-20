import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTextToSpeech } from "../hook/useTextToSpeech";

type TextToSpeechControls = {
  /** Section currently being read aloud, or `null`. */
  activeId: string | null;
  isSpeaking: boolean;
  error: string | null;
  /** Reads `text`, replacing whatever section was playing before. */
  speakSection: (id: string, text: string) => void;
  stop: () => void;
};

const TextToSpeechContext = createContext<TextToSpeechControls | null>(null);

/**
 * Shares a single speech engine across every speaker button on a screen, so
 * only one section can be read at a time and stopping is instant.
 */
export const TextToSpeechProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { speak, stop: stopSpeech, isSpeaking, error } = useTextToSpeech();
  const [activeId, setActiveId] = useState<string | null>(null);

  const speakSection = useCallback(
    (id: string, text: string) => {
      if (!text.trim()) return;

      setActiveId(id);
      void speak(text);
    },
    [speak]
  );

  const stop = useCallback(() => {
    setActiveId(null);
    void stopSpeech();
  }, [stopSpeech]);

  // Playback finished (or failed) on its own: drop the active section.
  useEffect(() => {
    if (!isSpeaking) setActiveId(null);
  }, [isSpeaking]);

  const value = useMemo<TextToSpeechControls>(
    () => ({
      activeId: isSpeaking ? activeId : null,
      isSpeaking,
      error,
      speakSection,
      stop,
    }),
    [activeId, error, isSpeaking, speakSection, stop]
  );

  return (
    <TextToSpeechContext.Provider value={value}>
      {children}
    </TextToSpeechContext.Provider>
  );
};

export function useTextToSpeechControls(): TextToSpeechControls {
  const context = useContext(TextToSpeechContext);

  if (!context) {
    throw new Error(
      "useTextToSpeechControls must be used inside <TextToSpeechProvider>."
    );
  }

  return context;
}
