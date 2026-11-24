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
import { getVideoLocation } from "../utils/videoLocation";
import { useAuth } from "@clerk/expo";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useNetwork } from "../../../network/NetworkProvider";
import {
  discardQueuedVideo,
  handleVideoForUpload,
} from "../services/videoQueue";
import type { VideoLocation } from "../../../types/video";

type VideoScanningRouteProp = RouteProp<UserStackParamList, "VideoPreview">;

const THUMBNAIL_QUALITY = 0.7;

export default function usePreview() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VideoScanningRouteProp>();
  const videoUri = route.params?.videoUri;
  const isUploaded = route.params.uploaded;
  const uploadState = route.params.uploadState;
  const localVideoId = route.params.localVideoId;

  const { getToken, isLoaded, isSignedIn, userId, sessionId } = useAuth();

  // console.log("[CLERK STATE]", {
  //   isLoaded,
  //   isSignedIn,
  //   userId,
  //   sessionId,
  // });
  const { isConnected, isInternetReachable, isServerReachable } = useNetwork();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  // Rendering a frame is only worth doing once per recording.
  const thumbnailRequestedRef = useRef(false);

  const buttonScale = useSharedValue(1);
  const playButtonScale = useSharedValue(1);

  // Use a ref to track if the player is still valid
  const isPlayerValid = useRef(true);
  // Use a ref to track if component is mounted
  const isMounted = useRef(true);

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

  // Render a single frame from the recording to serve as its preview image.
  // It doubles as the poster while the player loads and as the thumbnail that
  // gets stored alongside the upload.
  useEffect(() => {
    if (!videoUri || videoDuration <= 0 || thumbnailRequestedRef.current) {
      return;
    }

    thumbnailRequestedRef.current = true;

    // A quarter of the way in clears the first frames (often still focusing)
    // while staying safely inside the clip.
    const timeMs = Math.round(Math.min(videoDuration * 0.25, 1) * 1000);

    VideoThumbnails.getThumbnailAsync(videoUri, {
      time: timeMs,
      quality: THUMBNAIL_QUALITY,
    })
      .then(({ uri }) => {
        if (isMounted.current) setThumbnailUri(uri);
      })
      .catch((error) => {
        // A missing preview image must never block previewing or uploading.
        console.error("Failed to generate video thumbnail:", error);
      });
  }, [videoUri, videoDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      isPlayerValid.current = false;

      // Don't try to pause the player directly - let expo-video handle cleanup
      // The player will be released automatically when the component unmounts
    };
  }, []);

  const pausePlayback = () => {
    if (isPlaying && player && isPlayerValid.current) {
      try {
        player.pause();
        setIsPlaying(false);
      } catch (error) {
        console.error("Error pausing video:", error);
      }
    }
  };

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

  /**
   * The scanner already uploaded (or queued) this clip. The button becomes a
   * shortcut back into the app instead of starting a second upload.
   */
  const handleAlreadyHandled = () => {
    if (uploadState === "uploaded") {
      navigation.navigate("HomeTabs", { screen: "Diagnoses" });
      showToast(
        "info",
        "Already Uploaded",
        "This video is already being processed.",
      );
      return;
    }

    navigation.navigate("HomeTabs", { screen: "Home" });
    showToast(
      "info",
      "Saved for Upload",
      "It will upload automatically when the server is reachable.",
    );
  };

  const handleAnalyze = async () => {
    if (!isMounted.current || isAnalyzing) return;

    pausePlayback();

    // Already uploaded videos should not be uploaded again.
    if (isUploaded) {
      navigation.navigate("HomeTabs", {
        screen: "Diagnoses",
      });
      return;
    }

    // Support previously queued videos from older workflows.
    if (uploadState) {
      handleAlreadyHandled();
      return;
    }

    setIsAnalyzing(true);
    buttonScale.value = withTiming(0.95, { duration: 100 });

    try {
      if (!videoUri) {
        throw new Error("Missing video URI");
      }
      // console.log("[DEBUG] Starting token retrieval");

      // const tokenPromise = getToken()
      //   .then((value) => {
      //     console.log("[DEBUG] Token resolved:", Boolean(value));
      //     return value;
      //   })
      //   .catch((error) => {
      //     console.log("[DEBUG] Token failed:", error);
      //     return null;
      //   });

      // console.log("[DEBUG] Starting location retrieval");

      // const locationPromise = getVideoLocation()
      //   .then((value) => {
      //     console.log("[DEBUG] Location resolved:", value);
      //     return value;
      //   })
      //   .catch((error) => {
      //     console.log("[DEBUG] Location failed:", error);
      //     return undefined;
      //   });

      // const [token, location] = await Promise.all([
      //   tokenPromise,
      //   locationPromise,
      // ]);

      // console.log("[DEBUG] Both resolved");

      const location = await getVideoLocation();

      // 3. Check whether the application can communicate
      // with the backend.
      const online =
        isConnected !== false &&
        isInternetReachable !== false &&
        isServerReachable === true;

      // 4. Queue or upload the video.
      const outcome = await handleVideoForUpload({
        localUri: videoUri,
        ownerId: userId ?? null,
        token: null,
        online: false,
        location,
        thumbnailUri,
      });

      if (!isMounted.current) return;

      // 5. Handle the upload outcome.
      if (outcome.status === "uploaded") {
        showToast(
          "success",
          "Uploaded Successfully",
          "Video is now being processed",
        );

        navigation.navigate("HomeTabs", {
          screen: "Diagnoses",
        });
      } else {
        showToast(
          "info",
          "Saved for Upload",
          "Your video will be uploaded automatically when the server is reachable.",
        );

        navigation.navigate("HomeTabs", {
          screen: "Home",
        });
      }
    } catch (error) {
      console.error("Video analysis failed:", error);

      if (isMounted.current) {
        showToast(
          "error",
          "Upload Failed",
          "Something went wrong, please try again.",
        );
      }
    } finally {
      if (isMounted.current) {
        setIsAnalyzing(false);
        buttonScale.value = withTiming(1, { duration: 100 });
      }
    }
  };

  const handleRecapture = () => {
    const message =
      uploadState === "uploaded"
        ? "This scan has already been uploaded and will stay in your diagnoses. Record a new one?"
        : "Are you sure you want to discard this video and record a new one?";

    Alert.alert("Recapture Video", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Recapture",
        style: "destructive",
        onPress: () => {
          // The scanner already auto-queued this clip. Recapturing means the
          // user does not want it, so drop the pending local copy before it
          // can be synced later.
          if (localVideoId) {
            void discardQueuedVideo(localVideoId);
          }

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
    ]);
  };

  const handleSaveDraft = async () => {
    if (!isMounted.current) return;

    setIsSaving(true);
    buttonScale.value = withTiming(0.95, { duration: 100 });

    pausePlayback();

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
      navigation.navigate("HomeTabs", {
        screen: "Home",
      });
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
    uploadState,
    buttonScale,
    playButtonScale,
    animatedPlayButtonStyle,
    animatedButtonStyle,
    player,
    videoUri,
    thumbnailUri,
    navigation,

    handlePlayPause,
    handleRecapture,
    handleAnalyze,
    handleSaveDraft,
  };
}
