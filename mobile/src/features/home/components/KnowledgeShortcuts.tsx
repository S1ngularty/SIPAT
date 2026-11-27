import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { colors, radii, spacing } from "../../../theme";
import { CropProblemImage } from "../../crop-problems/components/CropProblemImage";
import type { CropProblem } from "../../crop-problems/types";

type BrowseCropProblemsProps = {
  problems: readonly CropProblem[];
  seeMoreLabel: string;
  onPressProblem: (problem: CropProblem) => void;
  onPressSeeMore: () => void;
};

export const BrowseCropProblems: React.FC<BrowseCropProblemsProps> = ({
  problems,
  seeMoreLabel,
  onPressProblem,
  onPressSeeMore,
}) => {
  const { width } = useWindowDimensions();

  const horizontalPadding = spacing.lg;
  const tileGap = spacing.md;

  const tileWidth = Math.floor((width - horizontalPadding * 2 - tileGap) / 2);

  const tileHeight = tileWidth;

  return (
    <View style={styles.grid}>
      {problems.map((problem) => (
        <Pressable
          key={problem.id}
          onPress={() => onPressProblem(problem)}
          accessibilityRole="button"
          accessibilityLabel={problem.name}
          style={({ pressed }) => [
            styles.tile,
            {
              width: tileWidth,
              height: tileHeight,
            },
            pressed && styles.pressed,
          ]}
        >
          <CropProblemImage
            path={problem.images[0] ?? ""}
            label={problem.name}
            style={styles.tileImage}
          />

          {/* Overall image dimming */}
          <View pointerEvents="none" style={styles.imageDim} />

          {/* Bottom gradient */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              "transparent",
              "rgba(0, 0, 0, 0.15)",
              "rgba(0, 0, 0, 0.75)",
            ]}
            locations={[0, 0.45, 1]}
            style={styles.bottomGradient}
          />

          {/* Crop problem label */}
          <View pointerEvents="none" style={styles.labelContainer}>
            <Text style={styles.tileName} numberOfLines={2}>
              {problem.name}
            </Text>
          </View>
        </Pressable>
      ))}

      {/* See More tile */}
      <Pressable
        onPress={onPressSeeMore}
        accessibilityRole="button"
        accessibilityLabel={seeMoreLabel}
        style={({ pressed }) => [
          styles.seeMoreTile,
          {
            width: tileWidth,
            height: tileHeight,
          },
          pressed && styles.pressed,
        ]}
      >
        <Image
          source={require("../../../../assets/browse-images/eggplant-leaf-borer.webp")}
          style={styles.seeMoreImage}
          resizeMode="cover"
        />

        {/* Overall image dimming */}
        <View pointerEvents="none" style={styles.imageDim} />

        {/* Bottom gradient */}
        <LinearGradient
          pointerEvents="none"
          colors={["transparent", "rgba(0, 0, 0, 0.15)", "rgba(0, 0, 0, 0.75)"]}
          locations={[0, 0.45, 1]}
          style={styles.bottomGradient}
        />

        {/* Centered ellipsis */}
        <View pointerEvents="none" style={styles.seeMoreContent}>
          <Text style={styles.seeMoreText}>...</Text>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.md,
  paddingHorizontal: spacing.lg,
},

  // Crop problem tile
  tile: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },

  tileImage: {
    ...StyleSheet.absoluteFill,
    width: undefined,
    height: undefined,
    borderRadius: radii.md,
  },

  // Shared image overlays
  imageDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
  },

  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
  },

  // Crop problem label
  labelContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  tileName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.white,
  },

  // See More tile
  seeMoreTile: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },

  seeMoreImage: {
    ...StyleSheet.absoluteFill,
    width: undefined,
    height: undefined,
  },

  seeMoreContent: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },

  seeMoreText: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "600",
    color: colors.white,
    letterSpacing: 3,
    marginTop: -8,
  },

  // Press feedback
  pressed: {
    opacity: 0.75,
  },
});
