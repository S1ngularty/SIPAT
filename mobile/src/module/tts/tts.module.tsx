import React, { useState } from "react";
import { Button, Text, View } from "react-native";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";

export default function SpeechDemo() {
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");

  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));
  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results[0].transcript || "");
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log("Speech error:", event.error, event.message);
  });

  const handleStart = async () => {
    const result =
      await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
    if (!result.granted) {
      console.warn("Permissions not granted");
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: "fil-PH",
      interimResults: true,
      continuous: false,
    });
  };

  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Button
        title={recognizing ? "Stop Listening" : "Start Listening (Tagalog)"}
        onPress={
          recognizing ? () => ExpoSpeechRecognitionModule.stop() : handleStart
        }
      />
      <Text style={{ fontSize: 18 }}>{transcript || "Speak something..."}</Text>
    </View>
  );
}
