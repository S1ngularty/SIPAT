import React, { useState, useRef, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import showToast from "../../../helper/toast";
import { NavigationProp } from "../types/navigationTypes";
import { Camera, CameraView } from "expo-camera";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MAX_DURATION = 15;

export default function useScanning() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const navigation = useNavigation<NavigationProp>();

  const cameraRef = useRef<CameraView | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  const recordButtonScale = useSharedValue(1);

  const animatedRecordButton = useAnimatedStyle(() => {
    return {
      transform: [{ scale: recordButtonScale.value }],
    };
  });

  useEffect(() => {
    // Request camera and microphone permissions
    (async () => {
      const { status: cameraStatus } =
        await Camera.requestCameraPermissionsAsync();
      const { status: micStatus } =
        await Camera.requestMicrophonePermissionsAsync();
      setHasPermission(cameraStatus === "granted" && micStatus === "granted");
    })();

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      setRecordingTime(0);
      recordButtonScale.value = withTiming(0.8, { duration: 200 });

      // Start timer FIRST - before waiting for recordAsync
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_DURATION) {
            clearInterval(recordingTimerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Start recording - this promise resolves when recording stops
      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: MAX_DURATION, // Let Expo handle the max duration
        });

        if (video) {
          // Handle recorded video
          console.log("Video recorded:", video.uri);
          showToast("success", "", "Video recorded successfully!");
          navigation.navigate("VideoPreview", { videoUri: video.uri });
        }
      } catch (error) {
        console.error("Recording error:", error);
        showToast("error", "", "Failed to record video");
      } finally {
        // Clean up after recording finishes (naturally or manually stopped)
        setIsRecording(false);
        setRecordingTime(0);
        recordButtonScale.value = withTiming(1, { duration: 200 });
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      }
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      setIsProcessing(true);
      try {
        await cameraRef.current.stopRecording();
        // Timer will be cleaned up in the finally block of startRecording
        // when recordAsync promise resolves
      } catch (error) {
        console.error("Stop recording error:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted((current) => !current);
  };

  return {
    hasPermission,
    isRecording,
    recordingTime,
    isProcessing,
    isMuted,
    navigation,
    cameraRef,
    animatedRecordButton,

    startRecording,
    stopRecording,
    toggleMute,
  };
}
