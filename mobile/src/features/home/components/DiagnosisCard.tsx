import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { colors, radii, spacing } from "../../../theme";
import type { VideoAnalysis } from "../../diagnosis/diagnosisTypes";
import {
  formatRelativeTime,
  getDiagnosisSubtitle,
  getDiagnosisTitle,
  getStatusTone,
  getTopFinding,
  isProcessing,
  type StatusTone,
} from "../utils/diagnosis";

/**
 * Swap this file to replace the illustration used when a diagnosis has no
 * evidence image. Drop your own asset at the same path to keep it working.
 */
const PLACEHOLDER_IMAGE = require("../../../../assets/images/crop-placeholder.png");

type Props = {
  analysis: VideoAnalysis;
  width: number;
  onPress: (analysis: VideoAnalysis) => void;
};

const TONE_COLORS: Record<StatusTone, string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  neutral: colors.textMuted,
};

export const DiagnosisCard: React.FC<Props> = ({ analysis, width, onPress }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const title = getDiagnosisTitle(analysis);
  const subtitle = getDiagnosisSubtitle(analysis);
  const tone = getStatusTone(analysis);
  const topFinding = getTopFinding(analysis);
  const processing = isProcessing(analysis);

  const evidenceUri = topFinding?.evidenceUrl;
  useEffect(() => {
    setImageFailed(false);
  }, [evidenceUri]);

  const imageSource: ImageSourcePropType =
    evidenceUri && !imageFailed
      ? { uri: evidenceUri }
      : PLACEHOLDER_IMAGE;

  const metaParts = [formatRelativeTime(analysis.createdAt)].filter(Boolean);
  if (topFinding && analysis.video?.status === "completed") {
    metaParts.push(`${Math.round(topFinding.confidence * 100)}% confidence`);
  } else if (analysis.results?.length) {
    metaParts.push(
      `${analysis.results.length} finding${analysis.results.length > 1 ? "s" : ""}`,
    );
  }

  const imageHeight = Math.round(width * 0.62);

  return (
    <Pressable
      onPress={() => onPress(analysis)}
      accessibilityRole="button"
      accessibilityLabel={`Open diagnosis ${title}`}
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.imageWrap, { height: imageHeight }]}>
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          accessibilityIgnoresInvertColors
        />
        <View style={[StyleSheet.absoluteFill, styles.scrim]} pointerEvents="none" />

        {processing ? (
          <View style={styles.statusPill}>
            <ActivityIndicator size="small" color={colors.forest} />
            <Text style={styles.statusPillText}>Analyzing</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.subtitleRow}>
          <View style={[styles.dot, { backgroundColor: TONE_COLORS[tone] }]} />
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {metaParts.length > 0 ? (
          <Text style={styles.meta} numberOfLines={1}>
            {metaParts.join("  ·  ")}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pressed: {
    opacity: 0.9,
  },
  imageWrap: {
    width: "100%",
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  scrim: {
    backgroundColor: "rgba(24, 53, 29, 0.10)",
  },
  statusPill: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  statusPillText: {
    color: colors.forest,
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subtitle: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    opacity: 0.85,
  },
});
