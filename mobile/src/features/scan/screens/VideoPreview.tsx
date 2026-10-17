import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView } from "expo-video";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  ScanLine,
  Save,
  Leaf,
} from "lucide-react-native";
import { formatTime } from "../../../utils/formatTime";
import usePreview from "../hooks/usePreview";
import { CircularIconButton } from "../../../components/ui/CircularIconButton";
import { colors, radii, spacing } from "../../../theme";

/** Slim outline strokes, per DESIGN.md §11.1. */
const ICON_STROKE = 1.5;
const CONTROL_SIZE = 40;

const VideoPreviewScreen = () => {
  const {
    isPlaying,
    isLoading,
    videoDuration,
    currentPosition,
    hasEnded,
    isAnalyzing,
    isSaving,
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
  } = usePreview();

  const isBusy = isAnalyzing || isSaving;

  const handleBack = () => {
    if (player) {
      player.pause();
    }
    navigation.goBack();
  };

  if (!videoUri) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Leaf size={28} color={colors.green} strokeWidth={ICON_STROKE} />
        </View>
        <Text style={styles.errorTitle}>No video found</Text>
        <Text style={styles.errorText}>
          Record a clip before opening the preview.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <CircularIconButton
          onPress={handleBack}
          accessibilityLabel="Close video preview"
          variant="neutral"
          size={CONTROL_SIZE}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={ICON_STROKE} />
        </CircularIconButton>

        <Text style={styles.headerTitle}>Video Preview</Text>

        <View style={styles.headerPlaceholder} />
      </Animated.View>

      {/* Video card */}
      <View style={styles.videoContainer}>
        {/* Poster: a frame rendered from this very recording, so the card is
            never a black hole while the player warms up. */}
        {isLoading && thumbnailUri && (
          <Image
            source={{ uri: thumbnailUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessible={false}
          />
        )}

        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          // Android's SurfaceView ignores the parent's rounded corners.
          surfaceType="textureView"
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.lime} />
          </View>
        )}

        {/* Play/Pause Overlay */}
        {!isLoading && (
          <TouchableOpacity
            style={styles.playOverlay}
            onPress={handlePlayPause}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
          >
            {hasEnded ? (
              <View style={styles.replayButton}>
                <RotateCcw
                  size={18}
                  color={colors.textOnDark}
                  strokeWidth={ICON_STROKE}
                />
                <Text style={styles.replayText}>Replay</Text>
              </View>
            ) : (
              <Animated.View
                style={[styles.playButton, animatedPlayButtonStyle]}
              >
                {isPlaying ? (
                  <Pause
                    size={30}
                    color={colors.textOnDark}
                    strokeWidth={ICON_STROKE}
                  />
                ) : (
                  <Play
                    size={30}
                    color={colors.textOnDark}
                    strokeWidth={ICON_STROKE}
                  />
                )}
              </Animated.View>
            )}
          </TouchableOpacity>
        )}

        {/* Video Progress Bar */}
        {!isLoading && videoDuration > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentPosition / videoDuration) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.timeText}>
              {formatTime(currentPosition)} / {formatTime(videoDuration)}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(400)}
        style={styles.actionsContainer}
      >
        {/* Analyze Button - Primary */}
        <Animated.View style={animatedButtonStyle}>
          <TouchableOpacity
            style={[styles.analyzeButton, isBusy && styles.buttonDisabled]}
            onPress={handleAnalyze}
            disabled={isBusy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Analyze plant"
          >
            {isAnalyzing ? (
              <ActivityIndicator color={colors.forest} size="small" />
            ) : (
              <>
                <ScanLine size={18} color={colors.forest} strokeWidth={1.9} />
                <Text style={styles.analyzeButtonText}>Analyze Plant</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
            onPress={handleRecapture}
            disabled={isBusy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Recapture video"
          >
            <RotateCcw
              size={18}
              color={colors.green}
              strokeWidth={ICON_STROKE}
            />
            <Text style={styles.secondaryButtonText}>Recapture</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
            onPress={handleSaveDraft}
            disabled={isBusy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Save video to drafts"
          >
            {isSaving ? (
              <ActivityIndicator color={colors.green} size="small" />
            ) : (
              <>
                <Save
                  size={18}
                  color={colors.green}
                  strokeWidth={ICON_STROKE}
                />
                <Text style={styles.secondaryButtonText}>Save to Draft</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // Missing-video state — mirrors the app's other empty states (§11.6).
  errorContainer: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  errorText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.lime,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  primaryButtonText: {
    color: colors.forest,
    fontSize: 16,
    fontWeight: "700",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  headerPlaceholder: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
  },

  // Video card — a dark rounded surface rather than a full-bleed band.
  videoContainer: {
    flex: 1,
    margin: spacing.xl,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.charcoal,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    flex: 1,
    width: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.backdrop,
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.outlineOnDark,
  },
  replayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.backdrop,
    borderWidth: 1,
    borderColor: colors.outlineOnDark,
  },
  replayText: {
    color: colors.textOnDark,
    fontSize: 14,
    fontWeight: "600",
  },
  progressContainer: {
    position: "absolute",
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
  },
  progressBackground: {
    height: 3,
    backgroundColor: colors.outlineOnDark,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.lime,
    borderRadius: radii.pill,
  },
  timeText: {
    color: colors.textOnDark,
    fontSize: 12,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    gap: spacing.lg,
  },
  analyzeButton: {
    backgroundColor: colors.lime,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    color: colors.forest,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default VideoPreviewScreen;
