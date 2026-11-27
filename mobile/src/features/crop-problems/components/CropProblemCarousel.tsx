import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { colors, radii, spacing } from "../../../theme";
import { getCropProblemsCopy } from "../copy";
import type { Language } from "../types";
import { CropProblemImage } from "./CropProblemImage";

interface Props {
  images: string[];
  language: Language;
}

/**
 * Full-width photo carousel for a crop problem. While the JSON paths are not
 * backed by real assets, each slide shows the bundled leaf placeholder.
 */
export const CropProblemCarousel: React.FC<Props> = ({ images, language }) => {
  const copy = getCropProblemsCopy(language);
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slideWidth = Math.max(1, width - spacing.xl * 2);
  const slideHeight = Math.round(Math.min(slideWidth * 0.75, 360));

  const slides = useMemo(
    () => (images.length > 0 ? images : [""]),
    [images],
  );

  const handleMomentumEnd = (offsetX: number) => {
    const next = Math.round(offsetX / slideWidth);
    setActiveIndex(Math.min(Math.max(next, 0), slides.length - 1));
  };

  const goToSlide = (index: number) => {
    listRef.current?.scrollToOffset({
      offset: index * slideWidth,
      animated: true,
    });
    setActiveIndex(index);
  };

  return (
    <View
      style={[styles.wrapper, { height: slideHeight }]}
      accessibilityLabel={copy.carouselLabel}
    >
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item, index) => `${item || "empty"}-${index}`}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={slides.length > 1}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: slideWidth,
          offset: slideWidth * index,
          index,
        })}
        onMomentumScrollEnd={(event) =>
          handleMomentumEnd(event.nativeEvent.contentOffset.x)
        }
        renderItem={({ item, index }) => (
          <CropProblemImage
            path={item}
            label={
              images.length > 0
                ? copy.photoOf(index + 1, images.length)
                : copy.noPhotoYet
            }
            style={[styles.slide, { width: slideWidth, height: slideHeight }]}
          />
        )}
      />

      {slides.length > 1 ? (
        <View style={styles.dotsRow} pointerEvents="box-none">
          {slides.map((_, index) => {
            const isActive = index === activeIndex;

            return (
              <Pressable
                key={`dot-${index}`}
                onPress={() => goToSlide(index)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={copy.photoLabel(index + 1)}
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.xl,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  slide: {
    borderRadius: radii.sm,
  },
  dotsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  dot: {
    height: 5,
    borderRadius: radii.pill,
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.textMuted,
  },
  dotInactive: {
    width: 5,
    backgroundColor: colors.borderStrong,
  },
});
