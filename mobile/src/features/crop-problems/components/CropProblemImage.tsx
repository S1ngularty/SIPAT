import React from "react";
import { Image, StyleSheet, type ImageStyle, type StyleProp } from "react-native";
import { colors } from "../../../theme";
import {
  CROP_PROBLEM_PLACEHOLDER_IMAGE,
  getCropProblemImageSource,
} from "../imageAssets";

interface Props {
  /** Path exactly as it appears in the JSON record. */
  path: string;
  /** Accessibility description of the image. */
  label: string;
  style?: StyleProp<ImageStyle>;
}

/**
 * Renders a crop-problem image. Until the real asset exists, it shows the
 * bundled leaf placeholder rather than a broken image or an extra icon.
 */
export const CropProblemImage: React.FC<Props> = ({ path, label, style }) => {
  const source = getCropProblemImageSource(path) ?? CROP_PROBLEM_PLACEHOLDER_IMAGE;
  return (
    <Image
      source={source}
      style={[styles.image, style]}
      resizeMode="cover"
      accessibilityLabel={label}
      accessibilityIgnoresInvertColors
    />
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceMuted,
  },
});
