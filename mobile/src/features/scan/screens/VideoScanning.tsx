import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useState, useCallback } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import {
  ArrowLeft,
  Leaf,
  Timer,
  Mic,
  MicOff,
  Camera as CameraIcon,
  Image as ImageIcon,
} from "lucide-react-native";
import useScanning from "../hooks/useScanning";
import { formatTime } from "../../../utils/formatTime";
import { colors, radii, spacing } from "../../../theme";

const MAX_DURATION = 15; // seconds
/** Diameter of the round top controls (close / mute), in px. */
const TOP_CONTROL_SIZE = 40;
const { width, height } = Dimensions.get("window");

const VideoScanningScreen = () => {
  const [isPickingVideo, setPickingVideo] = useState(false);
  const insets = useSafeAreaInsets();

  const {
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
  } = useScanning();

  // Hand off the picked video to your preview screen.
  const handleVideoReady = useCallback(
    (uri: string) => {
      console.log("Video ready for processing:", uri);
      navigation.navigate("VideoPreview", { videoUri: uri });
    },
    [navigation],
  );

  // Pick a video from the user's gallery using expo-image-picker.
  const handlePickVideo = useCallback(async () => {
    if (isRecording || isProcessing || isPickingVideo) return;

    try {
      setPickingVideo(true);

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant media library access to upload a video.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"], // ✅ new API, replaces MediaTypeOptions.Videos
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      handleVideoReady(asset.uri);
    } catch (error) {
      console.error("Failed to pick video:", error);
      Alert.alert("Error", "Could not open the video picker.");
    } finally {
      setPickingVideo(false);
    }
  }, [isRecording, isProcessing, isPickingVideo, handleVideoReady]);

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={colors.lime} />
        <Text style={styles.permissionText}>
          Requesting camera and microphone permission...
        </Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <CameraIcon size={48} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={styles.permissionTitle}>Permissions Required</Text>
        <Text style={styles.permissionText}>
          Please grant camera and microphone permissions to record plant videos.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      {/*
        expo-camera (v57) exposes no tap-to-focus API — only this `autofocus`
        mode prop, and it is iOS-only. "off" keeps the camera refocusing
        continuously as the plant moves; "on" would focus once and then lock.
        (The previous `focusable` prop is not part of expo-camera and was being
        swallowed by React Native's generic View prop.)
      */}
      <CameraView
        ref={cameraRef}
        mode="video"
        style={StyleSheet.absoluteFill}
        facing="back"
        videoQuality="720p"
        mute={isMuted}
        ratio="16:9"
        autofocus="off"
        onCameraReady={() => {
          console.log("Camera is ready");
        }}
        onMountError={(event) => {
          console.error("Camera mount error:", event.message);
        }}
      />

      {/* Top Overlay */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.topOverlay, { paddingTop: insets.top + spacing.xl }]}
      >
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          disabled={isRecording}
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
        >
          <ArrowLeft size={22} color={colors.white} strokeWidth={1.5} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Leaf size={20} color={colors.lime} strokeWidth={1.5} />
          <Text style={styles.titleText}>Scan Plant</Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={toggleMute}
          disabled={isRecording}
          accessibilityRole="button"
          accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? (
            <MicOff size={22} color={colors.white} strokeWidth={1.5} />
          ) : (
            <Mic size={22} color={colors.white} strokeWidth={1.5} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Scanning Frame */}
      <View style={styles.scanFrameContainer} pointerEvents="none">
        <View style={[styles.scanFrame, isRecording && styles.scanFrameActive]}>
          <View
            style={[
              styles.corner,
              styles.cornerTopLeft,
              isRecording && styles.cornerActive,
            ]}
          />
          <View
            style={[
              styles.corner,
              styles.cornerTopRight,
              isRecording && styles.cornerActive,
            ]}
          />
          <View
            style={[
              styles.corner,
              styles.cornerBottomLeft,
              isRecording && styles.cornerActive,
            ]}
          />
          <View
            style={[
              styles.corner,
              styles.cornerBottomRight,
              isRecording && styles.cornerActive,
            ]}
          />
        </View>
      </View>

      {/* Recording Indicator */}
      {isRecording && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.recordingIndicator,
            { top: insets.top + spacing.xl * 2 + TOP_CONTROL_SIZE },
          ]}
        >
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Scanning...</Text>
        </Animated.View>
      )}

      {/* Bottom Controls */}
      <Animated.View
        entering={FadeInUp.duration(400)}
        style={[
          styles.bottomControls,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        {isRecording && (
          <View style={styles.timerContainer}>
            <Timer size={18} color={colors.lime} strokeWidth={1.5} />
            <Text
              style={[
                styles.timerText,
                recordingTime >= MAX_DURATION - 5 && styles.timerWarning,
              ]}
            >
              {formatTime(recordingTime)} / {formatTime(MAX_DURATION)}
            </Text>
          </View>
        )}

        <View style={styles.controlsRow}>
          <Animated.View
            style={[styles.recordButtonWrapper, animatedRecordButton]}
          >
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.white} size="large" />
              ) : (
                <View
                  style={[
                    styles.recordButtonInner,
                    isRecording && styles.recordButtonInnerActive,
                  ]}
                />
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Upload / Gallery Button (left side, absolute) */}
          <TouchableOpacity
            style={[
              styles.sideButton,
              styles.galleryButtonPosition,
              (isRecording || isProcessing) && styles.sideButtonDisabled,
            ]}
            onPress={handlePickVideo}
            disabled={isRecording || isProcessing || isPickingVideo}
            activeOpacity={0.7}
          >
            {isPickingVideo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ImageIcon size={22} color={colors.white} strokeWidth={1.5} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.helpText}>
          {isRecording
            ? "Tap to stop scanning"
            : `Tap to start scanning (Max ${MAX_DURATION}s)`}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.white,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  permissionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  permissionButton: {
    backgroundColor: colors.lime,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  permissionButtonText: {
    color: colors.forest,
    fontSize: 16,
    fontWeight: "700",
  },

  // Top overlay
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 10,
  },
  /** Round control with a thin outline only — no fill. */
  iconButton: {
    width: TOP_CONTROL_SIZE,
    height: TOP_CONTROL_SIZE,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  titleText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },

  // Scanning frame — minimalist: a faint hairline box plus thin corner brackets.
  scanFrameContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  scanFrame: {
    width: width * 0.85,
    height: height * 0.6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: radii.xl,
  },
  scanFrameActive: {
    borderColor: "rgba(134, 198, 83, 0.55)",
  },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: colors.white,
  },
  cornerActive: {
    borderColor: colors.lime,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: radii.xl,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: radii.xl,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: radii.xl,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: radii.xl,
  },

  // Recording indicator
  // `top` is supplied by the screen, since it depends on the status-bar inset.
  recordingIndicator: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  recordingText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Bottom controls
  // `paddingBottom` is supplied by the screen, since it depends on the inset.
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 10,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  timerText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  timerWarning: {
    color: colors.danger,
  },
  controlsRow: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    height: 72,
  },
  galleryButtonPosition: {
    position: "absolute",
    left: 40,
    top: 8,
  },
  /** Secondary control: thin outline, no fill. */
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  sideButtonDisabled: {
    opacity: 0.35,
  },
  recordButtonWrapper: {
    alignItems: "center",
  },
  /** Primary action: a thin ring around a solid dot, no fill on the ring. */
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  recordButtonActive: {
    borderColor: colors.lime,
  },
  recordButtonInner: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  recordButtonInnerActive: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.lime,
  },
  helpText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
  },
});

export default VideoScanningScreen;