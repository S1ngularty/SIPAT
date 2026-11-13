import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { MapPin, MapPinOff } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";
import type { CurrentLocation } from "../hooks/useCurrentLocation";

type Props = {
  location: CurrentLocation;
};

/**
 * Slim place-name pill for the home hero sheet.
 *
 * It sits on photography, so it stays a hairline outline rather than a solid
 * card. Each visual state mirrors the `useCurrentLocation` hook exactly:
 * locating, resolved place, permission denied and no fix / services off.
 * Tapping retries the fix, or opens Settings once the OS stops prompting.
 */
export const LocationBadge: React.FC<Props> = ({ location }) => {
  const { status, place, message, refresh } = location;

  const isLocating = status === "loading";
  const needsAttention = status === "denied" || status === "unavailable";
  const isReady = status === "ready" && place !== null;

  const label = isReady
    ? place.label
    : message ?? "Finding your location…";

  const accessibilityLabel = isReady
    ? `Current location: ${place.label}. Tap to refresh.`
    : `${label} Tap to try again.`;

  return (
    <Pressable
      onPress={refresh}
      disabled={isLocating}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isLocating }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.badge,
        needsAttention && styles.badgeAttention,
        pressed && !isLocating && styles.pressed,
      ]}
    >
      {isLocating ? (
        <ActivityIndicator size="small" color={colors.lime} />
      ) : needsAttention ? (
        <MapPinOff size={14} color={colors.lime} strokeWidth={1.8} />
      ) : (
        <MapPin size={14} color={colors.lime} strokeWidth={1.8} />
      )}

      <Text
        style={[styles.text, isLocating && styles.textMuted]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    maxWidth: "100%",
    minHeight: 30,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineOnDark,
  },
  /** A warmer outline hints that the pill is the thing to tap. */
  badgeAttention: {
    borderColor: "rgba(134, 198, 83, 0.7)",
  },
  text: {
    flexShrink: 1,
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: "600",
  },
  textMuted: {
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.7,
  },
});
