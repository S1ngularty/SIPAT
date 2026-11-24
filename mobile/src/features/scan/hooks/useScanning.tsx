import React, { useState, useRef, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@clerk/expo";
import { Camera, CameraView } from "expo-camera";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import showToast from "../../../helper/toast";
import { useNetwork } from "../../../network/NetworkProvider";
import type { VideoLocation } from "../../../types/video";
import { handleVideoForUpload } from "../services/videoQueue";
import { NavigationProp } from "../types/navigationTypes";
import { getVideoLocation } from "../utils/videoLocation";

const MAX_DURATION = 15;

export default function useScanning() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const navigation = useNavigation<NavigationProp>();

  const { getToken, userId } = useAuth();
  const { isConnected, isInternetReachable, isServerReachable } = useNetwork();

  const cameraRef = useRef<CameraView | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  // Started with the recording so a GPS fix is normally ready by the time the
  // clip is finished. The coordinates are stored with the queued row so an
  // offline analysis keeps its weather context.
  const locationPromiseRef = useRef<Promise<VideoLocation | undefined> | null>(
    null,
  );

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
      isMountedRef.current = false;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const resetRecordingUi = () => {
    setIsRecording(false);
    setRecordingTime(0);
    recordButtonScale.value = withTiming(1, { duration: 200 });

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    setIsRecording(true);
    setRecordingTime(0);
    recordButtonScale.value = withTiming(0.8, { duration: 200 });
    locationPromiseRef.current = getVideoLocation();

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

      // The clip is on disk now; stop showing the camera as recording while the
      // video is persisted/uploaded.
      resetRecordingUi();

      if (!video) return;

      console.log("Video recorded:", video.uri);
      setIsProcessing(true);

      try {
        const online =
          isConnected !== false &&
          isInternetReachable !== false &&
          isServerReachable === true;
        const token = online
          ? await getToken().catch(() => null)
          : null;

        const location = await (
          locationPromiseRef.current ?? getVideoLocation()
        );
        locationPromiseRef.current = null;

        const outcome = await handleVideoForUpload({
          localUri: video.uri,
          ownerId: userId ?? null,
          token,
          // With no session or no confirmed backend health check, queue it.
          online: online && !!token,
          location,
        });

        if (outcome.status === "uploaded") {
          showToast(
            "success",
            "Uploaded Successfully",
            "Video is now being processed",
          );
        } else {
          showToast(
            "info",
            "Saved for Upload",
            "We'll upload this scan automatically once the server is reachable.",
          );
        }

        if (isMountedRef.current) {
          navigation.navigate("VideoPreview", {
            videoUri: outcome.localUri,
            uploaded: false,
            uploadState: outcome.status,
            localVideoId: outcome.localVideoId,
            videoId: outcome.remoteVideoId ?? undefined,
          });
        }
      } catch (error) {
        console.error("Failed to save recorded video:", error);
        showToast("error", "", "Failed to save the recorded video");

        // Still let the user preview the clip; the Analyze action can queue it
        // again from the preview screen.
        if (isMountedRef.current) {
          navigation.navigate("VideoPreview", {
            videoUri: video.uri,
            uploaded: false,
          });
        }
      } finally {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Recording error:", error);
      showToast("error", "", "Failed to record video");
    } finally {
      // Clean up after recording finishes (naturally or manually stopped) and
      // after any upload attempt has settled.
      resetRecordingUi();
      setIsProcessing(false);
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        await cameraRef.current.stopRecording();
        // Timer and state are cleaned up in startRecording once recordAsync
        // resolves. Processing starts right after that.
      } catch (error) {
        console.error("Stop recording error:", error);
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
