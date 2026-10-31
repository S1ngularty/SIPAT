import React from "react";
import {
  ImageBackground,
  StyleSheet,
  type ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radii, spacing } from "../../../theme";
import type { WeatherState } from "../weather";
import { GreetingHeader } from "./GreetingHeader";
import { WeatherBlock } from "./WeatherBlock";

/**
 * Shared background for the upper sheet. Drop your own photo at this path (or
 * change the `require` below) to swap it — one image backs the whole sheet.
 */
const SHEET_BACKGROUND: ImageSourcePropType = require("../../../../assets/images/tomato-farm.jpg");

/**
 * Forest-tinted top fading into charcoal, so the white text and the slim
 * outlines stay readable over any part of the photo.
 */
const SHEET_OVERLAY = [
  "rgba(24, 53, 29, 0.72)",
  "rgba(20, 24, 26, 0.90)",
] as const;

type Props = {
  name: string;
  avatarUrl?: string | null;
  onPressAvatar: () => void;
  onPressNotifications: () => void;
  onPressChat: () => void;
  weather: WeatherState;
};

/**
 * Upper sheet on the home dashboard: profile, notifications and weather live
 * together on one photographic panel instead of separate cards.
 */
export const HomeHeroSheet: React.FC<Props> = ({
  name,
  avatarUrl,
  onPressAvatar,
  onPressNotifications,
  onPressChat,
  weather,
}) => {
  return (
    <ImageBackground
      source={SHEET_BACKGROUND}
      resizeMode="cover"
      style={styles.sheet}
      imageStyle={styles.sheetImage}
      accessibilityIgnoresInvertColors
    >
      <LinearGradient
        colors={SHEET_OVERLAY}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.overlay}
      >
        <GreetingHeader
          name={name}
          avatarUrl={avatarUrl}
          onPressAvatar={onPressAvatar}
          onPressNotifications={onPressNotifications}
          onPressChat={onPressChat}
          tone="light"
        />

        <WeatherBlock state={weather} />
      </LinearGradient>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  sheet: {
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    overflow: "hidden",
    /* Fallback tone while the photo decodes. */
    backgroundColor: colors.charcoal,
  },
  sheetImage: {
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
  },
  overlay: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
});
