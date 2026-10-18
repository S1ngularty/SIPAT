import React from "react";
import {
  Dimensions,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, BookOpen, ChevronRight } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";

/**
 * TEMPORARY home shortcuts.
 *
 * These two sections are a placeholder so the entry points are visible while
 * the real Crop Care guide and symptom browser are being built. The tile
 * backgrounds live in `assets/images/symptoms/` — drop your own images over
 * those files (same names) to swap them, no code change needed.
 */

const ICON_STROKE = 1.8;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
/** Two square tiles per row, with the screen + grid gutters removed. */
const TILE_SIZE = Math.round(
  (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2,
);

type ExploreCropCareCardProps = {
  onPress: () => void;
};

/** Featured entry point: learn about diseases and pests, their symptoms and care. */
export const ExploreCropCareCard: React.FC<ExploreCropCareCardProps> = ({
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Explore Crop Care"
    style={({ pressed }) => [styles.feature, pressed && styles.pressed]}
  >
    <View style={styles.featureIcon}>
      <BookOpen size={20} color={colors.green} strokeWidth={ICON_STROKE} />
    </View>

    <View style={styles.featureBody}>
      <Text style={styles.featureTitle}>Explore Crop Care</Text>
      <Text style={styles.featureText} numberOfLines={2}>
        Diseases and pests — symptoms, prevention and treatment.
      </Text>
    </View>

    <ChevronRight size={18} color={colors.textMuted} strokeWidth={ICON_STROKE} />
  </Pressable>
);

type Symptom = {
  label: string;
  image: ImageSourcePropType;
};

/** Placeholder art — replace the PNGs in assets/images/symptoms/. */
const SYMPTOMS: readonly Symptom[] = [
  {
    label: "Yellowing leaves",
    image: require("../../../../assets/browse-images/chili-yellow-leaves.webp"),
  },
  {
    label: "Dark spots",
    image: require("../../../../assets/browse-images/potato-leaf-dark-spots.jpeg"),
  },
  {
    label: "Leaf Blight",
    image: require("../../../../assets/browse-images/tomato-leaf-blight2.jpeg"),
  },
];

const SEE_MORE_IMAGE: ImageSourcePropType = require("../../../../assets/browse-images/eggplant-leaf-borer.webp");

/**
 * Bottom fade so the white labels stay legible over any photo, plus a light
 * base tint over the whole tile so bright images don't glare. Tune the first
 * value to dim more or less.
 */
const TILE_SCRIM = ["rgba(20, 24, 26, 0.30)", "rgba(20, 24, 26, 0.85)"] as const;

type BrowseSymptomsProps = {
  onPressSymptom: (label: string) => void;
  onPressSeeMore: () => void;
};

/** Visual shortcut: pick what you see to narrow down possible causes. */
export const BrowseSymptoms: React.FC<BrowseSymptomsProps> = ({
  onPressSymptom,
  onPressSeeMore,
}) => (
  <View style={styles.grid}>
    {SYMPTOMS.map(({ label, image }) => (
      <Pressable
        key={label}
        onPress={() => onPressSymptom(label)}
        accessibilityRole="button"
        accessibilityLabel={`Browse symptom ${label}`}
        style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      >
        <ImageBackground
          source={image}
          style={styles.tileImage}
          imageStyle={styles.tileImageInner}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        >
          <LinearGradient
            colors={TILE_SCRIM}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.tileScrim}
            pointerEvents="none"
          />
          <Text style={styles.tileLabel} numberOfLines={2}>
            {label}
          </Text>
        </ImageBackground>
      </Pressable>
    ))}

    <Pressable
      onPress={onPressSeeMore}
      accessibilityRole="button"
      accessibilityLabel="See more symptoms"
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <ImageBackground
        source={SEE_MORE_IMAGE}
        style={styles.tileImage}
        imageStyle={styles.tileImageInner}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      >
        <LinearGradient
          colors={TILE_SCRIM}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.tileScrim}
          pointerEvents="none"
        />
        <View style={styles.seeMoreRow}>
          <Text style={styles.tileLabel}>See more</Text>
          <ArrowRight size={18} color={colors.textOnDark} strokeWidth={2} />
        </View>
      </ImageBackground>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureBody: {
    flex: 1,
    gap: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  featureText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  tileImage: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  tileImageInner: {
    borderRadius: radii.lg,
  },
  tileScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textOnDark,
  },
  seeMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
