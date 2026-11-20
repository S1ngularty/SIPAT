
import { useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const recognizedText = event.results[0]?.transcript;

    if (recognizedText) {
      setTranscript(recognizedText);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    setError(event.message || event.error);
  });

  const startListening = async () => {
    try {
      setError(null);
      setTranscript("");

      const permission =
        await ExpoSpeechRecognitionModule
          .requestMicrophonePermissionsAsync();

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
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  const clearTranscript = () => {
    setTranscript("");
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  };
}
