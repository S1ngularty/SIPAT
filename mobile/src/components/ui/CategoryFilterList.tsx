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
 * The selected chip is not indicated by color alone: it also gains a check
 * icon and bold text, and exposes `accessibilityState.selected`.
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
                <Check size={12} color={colors.forest} strokeWidth={3} />
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
  },
  chipActive: {
    backgroundColor: colors.lime,
  },
  chipInactive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
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
  },
  labelActive: {
    color: colors.forest,
    fontWeight: "700",
  },
  labelInactive: {
    color: colors.textMuted,
    fontWeight: "500",
  },
});
