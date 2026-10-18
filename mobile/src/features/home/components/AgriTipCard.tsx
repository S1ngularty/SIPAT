import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Lightbulb } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";
import type { AgriTip } from "../utils/agriTips";

type Props = {
  tip: AgriTip;
};

/**
 * One farm tip for the session. Static card matching the home tile language:
 * white surface, hairline outline, green used only as a small accent.
 */
export const AgriTipCard: React.FC<Props> = ({ tip }) => (
  <View style={styles.card}>
    <View style={styles.icon}>
      <Lightbulb size={20} color={colors.green} strokeWidth={1.8} />
    </View>

    <View style={styles.body}>
      <Text style={styles.title}>{tip.title}</Text>
      <Text style={styles.description}>{tip.description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
