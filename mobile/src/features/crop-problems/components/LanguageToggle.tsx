import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../../../theme";
import { useLanguage } from "../../../modules/language/LanguageProvider";
import { getCropProblemsCopy } from "../copy";
import type { Language } from "../types";

const OPTIONS: readonly Language[] = ["tl", "en"];

/**
 * Compact TL | EN switch used by the guide screens. Both options are always
 * visible so the current language is unambiguous.
 */
export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const copy = getCropProblemsCopy(language);

  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
      accessibilityLabel={copy.language}
    >
      {OPTIONS.map((option) => {
        const isActive = option === language;
        const label = option === "tl" ? copy.tagalog : copy.english;

        return (
          <Pressable
            key={option}
            onPress={() => setLanguage(option)}
            style={[styles.option, isActive && styles.optionActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            hitSlop={4}
          >
            <Text
              style={[styles.label, isActive && styles.labelActive]}
              numberOfLines={1}
            >
              {option.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },
  option: {
    minWidth: 34,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  optionActive: {
    backgroundColor: colors.lime,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.forest,
  },
});
