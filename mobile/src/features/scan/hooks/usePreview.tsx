import React, { useState, useRef, useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSequence,
} from "react-native-reanimated";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NavigationProp } from "../types/navigationTypes";
import { UserStackParamList } from "../../../navigations/UserNavigation";
import { useVideoPlayer } from "expo-video";
import showToast from "../../../helper/toast";
import { Alert } from "react-native";
import { videoApi } from "../videoApi";
import { File } from "expo-file-system";
import { useAuth } from "@clerk/expo";
import * as Crypto from "expo-crypto";

type VideoScanningRouteProp = RouteProp<UserStackParamList, "VideoPreview">;

export default function usePreview() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VideoScanningRouteProp>();
  const videoUri = route.params?.videoUri;

  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const uploadIdRef = useRef<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const buttonScale = useSharedValue(1);
  const playButtonScale = useSharedValue(1);

  // Use a ref to track if the player is still valid
  const isPlayerValid = useRef(true);
  // Use a ref to track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    if (!videoUri) return;
    uploadIdRef.current = Crypto.randomUUID();
    idempotencyKeyRef.current = Crypto.randomUUID();
  }, [videoUri]);

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const animatedPlayButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: playButtonScale.value }],
    };
  });

  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.playbackRate = 1.0;
    player.timeUpdateEventInterval = 0.5;
  });

  // Listen to player status changes
  useEffect(() => {
    if (!player) return;

    const subscription = player.addListener("statusChange", (event) => {
      if (!isMounted.current) return;

      if (event.status === "readyToPlay") {
        setIsLoading(false);
        setVideoDuration(player.duration);
      } else if (event.status === "error") {
        setIsLoading(false);
        showToast("error", "", "Failed to load video");
      }
    });

    const timeUpdateSubscription = player.addListener("timeUpdate", (event) => {
      if (!isMounted.current) return;

      setCurrentPosition(event.currentTime);

      // Check if video has ended
      if (player.duration > 0 && event.currentTime >= player.duration - 0.1) {
        setIsPlaying(false);
        setHasEnded(true);
      }
    });

    return () => {
      subscription.remove();
      timeUpdateSubscription.remove();
    };
  }, [player]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      isPlayerValid.current = false;

      // Don't try to pause the player directly - let expo-video handle cleanup
      // The player will be released automatically when the component unmounts
    };
  }, []);

  const handlePlayPause = async () => {
    if (!player || !isPlayerValid.current) return;

    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        if (hasEnded) {
          player.currentTime = 0;
          setHasEnded(false);
        }
        player.play();
        setIsPlaying(true);
      }

      // Animate play button
      playButtonScale.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(1, { duration: 100 }),
      );
    } catch (error) {
      console.error("Error in play/pause:", error);
    }
  };

  const handleReplay = async () => {
    if (!player || !isPlayerValid.current) return;

    try {
      player.currentTime = 0;
      player.play();
      setIsPlaying(true);
      setHasEnded(false);
    } catch (error) {
      console.error("Error in replay:", error);
    }
  };

  const handleAnalyze = async () => {
    if (!isMounted.current) return;

    setIsAnalyzing(true);
    buttonScale.value = withTiming(0.95, { duration: 100 });

    // Pause video if playing
    if (isPlaying && player && isPlayerValid.current) {
      try {
        player.pause();
        setIsPlaying(false);
      } catch (error) {
        console.error("Error pausing video:", error);
      }
    }

    // Simulate analysis
    setTimeout(async () => {
      if (!isMounted.current) return;

      setIsAnalyzing(false);
      buttonScale.value = withTiming(1, { duration: 100 });

      await handlePresignUpload();
    }, 1000);
  };

  const handlePresignUpload = async () => {
    try {
      if (!isSignedIn) {
        throw new Error("Clerk session is not active");
      }

      const token = await getToken();

      if (!token) {
        throw new Error("Failed to get Clerk token");
      }

      const capturedVideo = new File(videoUri);

      const fileSize = capturedVideo.exists ? capturedVideo.size : 0;

      const fileName = `video_${uploadIdRef.current}`;
      const fileExtension = fileName.split(".").pop()?.toLowerCase();
      const contentType =
        fileExtension === "mov" ? "video/quicktime" : "video/mp4";

      const idempotencyKey = idempotencyKeyRef.current;

      // console.log({ fileName, contentType, fileSize }, token);
      if (!idempotencyKey) {
        throw new Error("Missing idempotency key");
      }

      const upload = await videoApi.requestVideoUpload(
        {
          fileName,
          fileSize,
          contentType,
        },
        token,
        idempotencyKey,
      );

      await handleObjectStorageUpload(upload.uploadUrl);

      const updateStatus = await videoApi.completeVideoUpload(
        upload.videoId,
        token,
      );

      console.log(updateStatus);
    } catch (error) {
      console.error(error);
    }
  };

  const handleObjectStorageUpload = async (
    presignedUrl: string,
  ): Promise<void> => {
    if (!videoUri) {
      throw new Error("Missing video URI");
    }

    const videoFile = new File(videoUri);

    if (!videoFile.exists) {
      throw new Error(`Video file does not exist: ${videoUri}`);
    }

    if (!presignedUrl) throw new Error("missing presigned url");

    // console.log("Uploading local file:", {
    //   uri: videoFile.uri,
    //   size: videoFile.size,
    // });

    const uploadResponse = await videoApi.videoUploadObjectStorage(
      presignedUrl,
      videoFile,
    );
  };

  const handleRecapture = () => {
    Alert.alert(
      "Recapture Video",
      "Are you sure you want to discard this video and record a new one?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Recapture",
          style: "destructive",
          onPress: () => {
            if (player && isPlayerValid.current) {
              try {
                player.pause();
              } catch (error) {
                console.error("Error pausing video:", error);
              }
            }
            navigation.navigate("VideoScanning");
          },
        },
      ],
    );
  };

  const handleSaveDraft = async () => {
    if (!isMounted.current) return;

    setIsSaving(true);
    buttonScale.value = withTiming(0.95, { duration: 100 });

    if (isPlaying && player && isPlayerValid.current) {
      try {
        player.pause();
        setIsPlaying(false);
      } catch (error) {
        console.error("Error pausing video:", error);
      }
    }

    // Simulate saving
    setTimeout(() => {
      if (!isMounted.current) return;

      setIsSaving(false);
      buttonScale.value = withTiming(1, { duration: 100 });
      showToast(
        "success",
        "Draft Saved",
        "Your video has been saved to drafts.",
      );
      navigation.navigate("HomeTabs");
    }, 1500);
  };

  return {
    isPlaying,
    isLoading,
    videoDuration,
    currentPosition,
    hasEnded,
    isAnalyzing,
    isSaving,
    buttonScale,
    playButtonScale,
    animatedPlayButtonStyle,
    animatedButtonStyle,
    player,
    videoUri,
    navigation,

    handlePlayPause,
    handleRecapture,
    handleAnalyze,
    handleSaveDraft,
  };
}
