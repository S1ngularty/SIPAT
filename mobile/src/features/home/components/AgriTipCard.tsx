import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Lightbulb } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";
import type { AgriTip } from "../utils/agriTips";

type Props = {
  tip: AgriTip;
};

/** "pest-prevention" -> "Pest prevention". */
const formatCategory = (category: string): string => {
  const spaced = category.replace(/-/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

/**
 * One farm tip for the session. Soft tinted panel with a green edge so it
 * reads as a gentle nudge rather than another content card.
 */
export const AgriTipCard: React.FC<Props> = ({ tip }) => (
  <View style={styles.card}>
    <View style={styles.accent} />

    <View style={styles.icon}>
      <Lightbulb size={18} color={colors.green} strokeWidth={2} />
    </View>

    <View style={styles.body}>
      <Text style={styles.eyebrow} numberOfLines={1}>
        Agri tip · {formatCategory(tip.category)}
      </Text>
      <Text style={styles.title}>{tip.title}</Text>
      <Text style={styles.description}>{tip.description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  /** Slim green edge marking the card as a hint. */
  accent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: colors.green,
  },
  icon: {
    width: 32,
    height: 32,
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
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.green,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
