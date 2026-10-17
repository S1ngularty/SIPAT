import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii } from "../../theme";

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  /** "solid" for dark-green controls on light surfaces, "translucent" for use over photography. */
  variant?: "solid" | "translucent";
  size?: number;
  badge?: string | number | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact circular action control (notifications, back, etc.).
 * Always renders as a single tappable target with an accessibility label.
 */
export const CircularIconButton: React.FC<Props> = ({
  children,
  onPress,
  accessibilityLabel,
  variant = "solid",
  size = 44,
  badge = null,
  style,
}) => {
  const isSolid = variant === "solid";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        isSolid ? styles.solid : styles.translucent,
        pressed && styles.pressed,
        style,
      ]}
    >
      {children}

      {badge !== null && badge !== undefined && badge !== "" ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} allowFontScaling={false}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  solid: {
    backgroundColor: colors.forest,
  },
  translucent: {
    backgroundColor: "rgba(24, 53, 29, 0.55)",
  },
  pressed: {
    opacity: 0.75,
  },
  badge: {
    position: "absolute",
    top: -1,
    right: -1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.forest,
    fontSize: 10,
    fontWeight: "700",
  },
});
