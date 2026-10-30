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
import * as VideoThumbnails from "expo-video-thumbnails";

type VideoScanningRouteProp = RouteProp<UserStackParamList, "VideoPreview">;

/** `expo-video-thumbnails` always renders a JPEG. */
const THUMBNAIL_CONTENT_TYPE = "image/jpeg";
const THUMBNAIL_QUALITY = 0.7;

/**
 * Content types accepted by the backend, keyed by file extension. Derived from
 * the recording itself because iOS captures `.mov` while Android captures
 * `.mp4`, and the value must match the one the upload URL is signed with.
 */
const VIDEO_CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

function videoContentType(uri: string): string {
  const extension = uri.split(".").pop()?.toLowerCase() ?? "";

  return VIDEO_CONTENT_TYPES[extension] ?? "video/mp4";
}

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
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  const uploadIdRef = useRef<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  // Rendering a frame is only worth doing once per recording.
  const thumbnailRequestedRef = useRef(false);

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

    try {
      buttonScale.value = withTiming(1, { duration: 100 });
      await handlePresignUpload();
      navigation.navigate("HomeTabs", {
        screen: "Diagnoses",
      });

      showToast(
        "info",
        "Uploaded Successfully",
        "Video is now being processed",
      );
    } catch (error) {
      console.log(error);
      showToast(
        "error",
        "Upload Failed",
        "Something went wrong, please try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
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
      const contentType = videoContentType(videoUri);

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

      await handleObjectStorageUpload(upload.uploadUrl, contentType);

      // Stored before the video is marked uploaded so the processing job always
      // sees the preview image key.
      await handleThumbnailUpload(upload.videoId, token);

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
    contentType: string,
  ): Promise<void> => {
    if (!videoUri) {
      throw new Error("Missing video URI");
    }

    if (!presignedUrl) throw new Error("missing presigned url");

    await videoApi.uploadLocalFileToObjectStorage(
      presignedUrl,
      videoUri,
      contentType,
    );
  };

  /**
   * Uploads the already-rendered preview image and records its key on the video.
   *
   * The image goes straight to object storage through a presigned PUT, so it
   * never passes through the API. A failure here is logged and swallowed — the
   * video upload itself must still succeed.
   *
   * Note there is deliberately no `expo-file-system` existence check here:
   * `expo-video-thumbnails` writes into the raw Android cache directory, which
   * Expo Go's file-system permission gate refuses to read. The file is fine; the
   * read is what fails. RN's networking opens it natively instead.
   */
  const handleThumbnailUpload = async (videoId: string, token: string) => {
    if (!thumbnailUri) return;

    try {
      const presigned = await videoApi.requestThumbnailUpload(
        videoId,
        THUMBNAIL_CONTENT_TYPE,
        token,
      );

      await videoApi.uploadLocalFileToObjectStorage(
        presigned.uploadUrl,
        thumbnailUri,
        THUMBNAIL_CONTENT_TYPE,
      );

      await videoApi.attachThumbnail(
        videoId,
        presigned.thumbnailStorageKey,
        token,
      );
    } catch (error) {
      console.error("Thumbnail upload failed:", error);
    }
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
