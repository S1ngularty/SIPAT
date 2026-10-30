import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";

export interface CategoryFilter<T extends string = string> {
  value: T;
  label: string;
}

type Props<T extends string> = {
  categories: readonly CategoryFilter<T>[];
  active: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/**
 * Horizontally scrolling filter chips.
 *
 * Every chip stays white with a thin outline; the selected chip only takes the
 * green accent on its outline and label. Selection is never signalled by colour
 * alone — the active chip also gains a check icon and exposes
 * `accessibilityState.selected`.
 */
export function CategoryFilterList<T extends string>({
  categories,
  active,
  onChange,
  accessibilityLabel = "Filters",
}: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.content}
    >
      {categories.map((category) => {
        const isActive = category.value === active;

        return (
          <Pressable
            key={category.value}
            onPress={() => onChange(category.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={category.label}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : styles.chipInactive,
              pressed && styles.chipPressed,
            ]}
          >
            {isActive ? (
              <View style={styles.check}>
                <Check size={12} color={colors.green} strokeWidth={2.5} />
              </View>
            ) : null}
            <Text
              style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}
              numberOfLines={1}
            >
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
  },
  /** Selected: only the thin outline takes the accent. */
  chipActive: {
    borderColor: colors.green,
  },
  chipInactive: {
    borderColor: colors.borderStrong,
  },
  chipPressed: {
    opacity: 0.8,
  },
  check: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  /** Selected: only the label takes the accent. */
  labelActive: {
    color: colors.green,
  },
  labelInactive: {
    color: colors.textMuted,
  },
});
