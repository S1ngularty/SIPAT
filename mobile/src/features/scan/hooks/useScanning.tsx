
import React, { useState, useRef, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { Camera, CameraView } from "expo-camera";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import showToast from "../../../helper/toast";
import { NavigationProp } from "../types/navigationTypes";

const MAX_DURATION = 15;

export default function useScanning() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const navigation = useNavigation<NavigationProp>();

  const cameraRef = useRef<CameraView | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const recordButtonScale = useSharedValue(1);

  const animatedRecordButton = useAnimatedStyle(() => ({
    transform: [{ scale: recordButtonScale.value }],
  }));

  useEffect(() => {
    (async () => {
      try {
        const { status: cameraStatus } =
          await Camera.requestCameraPermissionsAsync();

        const { status: micStatus } =
          await Camera.requestMicrophonePermissionsAsync();

        if (isMountedRef.current) {
          setHasPermission(
            cameraStatus === "granted" &&
            micStatus === "granted"
          );
        }
      } catch (error) {
        console.error("Permission request failed:", error);

        if (isMountedRef.current) {
          setHasPermission(false);
        }
      }
    })();

    return () => {
      isMountedRef.current = false;

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const resetRecordingUi = () => {
    setIsRecording(false);
    setRecordingTime(0);

    recordButtonScale.value = withTiming(1, {
      duration: 200,
    });

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording || isProcessing) return;

    setIsRecording(true);
    setRecordingTime(0);

    recordButtonScale.value = withTiming(0.8, {
      duration: 200,
    });

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((previous) => {
        if (previous >= MAX_DURATION) {
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }

          return previous;
        }

        return previous + 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION,
      });

      resetRecordingUi();

      if (!video?.uri) {
        throw new Error("Recording did not produce a video URI");
      }

      console.log("Video recorded:", video.uri);

      // No upload, queue insertion, token, or location request here.
      // Just navigate to the local video preview.
      if (isMountedRef.current) {
        navigation.navigate("VideoPreview", {
          videoUri: video.uri,
          uploaded: false,
          uploadState: undefined,
          localVideoId: undefined,
          videoId: undefined,
        });
      }
    } catch (error) {
      console.error("Recording error:", error);

      if (isMountedRef.current) {
        showToast(
          "error",
          "",
          "Failed to record video"
        );
      }
    } finally {
      resetRecordingUi();
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error("Stop recording error:", error);
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
