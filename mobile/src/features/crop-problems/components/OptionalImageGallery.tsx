import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../../theme";
import { getCropProblemsCopy } from "../copy";
import { getCropProblemImageSource } from "../imageAssets";
import type { Language } from "../types";
import { CropProblemImage } from "./CropProblemImage";

interface Props {
  images: string[];
  language: Language;
}

/**
 * Optional photo strip for symptoms, management steps, treatments and
 * diagnosis guidance. It renders nothing at all when the record has no images
 * for that field, so no empty media section is ever shown.
 */
export const OptionalImageGallery: React.FC<Props> = ({ images, language }) => {
  // Hide optional media whose file has not been bundled yet, instead of
  // showing a placeholder inside an otherwise text-only section.
  const availableImages = images.filter(
    (path) => getCropProblemImageSource(path) !== null,
  );

  if (availableImages.length === 0) return null;

  const copy = getCropProblemsCopy(language);
  const isSingle = availableImages.length === 1;

  return (
    <View style={styles.container}>
      {isSingle ? (
        <CropProblemImage
          path={availableImages[0]}
          label={copy.photoLabel(1)}
          style={styles.single}
        />
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {availableImages.map((path, index) => (
            <CropProblemImage
              key={`${path || "empty"}-${index}`}
              path={path}
              label={copy.photoLabel(index + 1)}
              style={styles.thumb}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  single: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  thumb: {
    width: 148,
    height: 111,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
});
