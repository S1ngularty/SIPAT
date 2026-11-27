import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { colors, radii, spacing } from "../../../theme";
import { CropProblemImage } from "../../crop-problems/components/CropProblemImage";
import type { CropProblem } from "../../crop-problems/types";

const TILE_TEXT_HEIGHT = 38;

type BrowseCropProblemsProps = {
  problems: readonly CropProblem[];
  seeMoreLabel: string;
  onPressProblem: (problem: CropProblem) => void;
  onPressSeeMore: () => void;
};

/**
 * Home preview of the offline crop-care guide: the first few records plus a
 * tile into the complete list.
 */
export const BrowseCropProblems: React.FC<BrowseCropProblemsProps> = ({
  problems,
  seeMoreLabel,
  onPressProblem,
  onPressSeeMore,
}) => {
  const { width } = useWindowDimensions();
  const tileWidth = Math.round(
    (width - spacing.xl * 2 - spacing.md) / 2,
  );
  const tileImageHeight = Math.round(tileWidth * 0.75);
  const tileHeight = tileImageHeight + spacing.sm + TILE_TEXT_HEIGHT;

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
            { width: tileWidth, height: tileHeight },
            pressed && styles.pressed,
          ]}
        >
          <CropProblemImage
            path={problem.images[0] ?? ""}
            label={problem.name}
            style={[
              styles.tileImage,
              { width: tileWidth, height: tileImageHeight },
            ]}
          />
          <Text style={styles.tileName} numberOfLines={2}>
            {problem.name}
          </Text>
        </Pressable>
      ))}

      <Pressable
        onPress={onPressSeeMore}
        accessibilityRole="button"
        accessibilityLabel={seeMoreLabel}
        style={({ pressed }) => [
          styles.seeMoreTile,
          { width: tileWidth, height: tileHeight },
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.seeMoreText}>{seeMoreLabel}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  tile: {
    backgroundColor: colors.white,
  },
  tileImage: {
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  tileName: {
    marginTop: spacing.sm,
    minHeight: TILE_TEXT_HEIGHT,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.text,
  },
  seeMoreTile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.75,
  },
});
