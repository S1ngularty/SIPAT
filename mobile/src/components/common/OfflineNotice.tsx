import React from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { WifiOff } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";

type Props = {
  title?: string;
  message?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Inline explanation shown while SIPAT is in its limited, offline mode.
 * Purely informational — it never blocks the guide content underneath.
 */
export const OfflineNotice: React.FC<Props> = ({
  title = "You're offline",
  message = "Browse crop care guides and symptom tips. Scanning, diagnoses, Flora and your profile come back when you're online.",
  style,
}) => (
  <View
    style={[styles.card, style]}
    accessibilityRole="alert"
    accessibilityLabel={`${title}. ${message}`}
  >
    <View style={styles.iconWrap}>
      <WifiOff size={20} color={colors.green} strokeWidth={1.9} />
    </View>

    <View style={styles.body}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
