import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Volume2, VolumeX } from "lucide-react-native";
import { colors, radii } from "../../../theme";
import { useTextToSpeechControls } from "../context/TextToSpeechProvider";

type Props = {
  /** Unique key of the section this button controls. */
  id: string;
  /** Exactly the content this button should read — nothing else. */
  text: string;
  /** Section name, announced to screen readers. */
  label: string;
  variant?: "pill" | "icon";
  disabled?: boolean;
};

/**
 * Speaker toggle for a single section. Lives inside a
 * {@link TextToSpeechProvider}, so starting one section stops the previous.
 */
export const SpeakButton: React.FC<Props> = ({
  id,
  text,
  label,
  variant = "pill",
  disabled = false,
}) => {
  const { activeId, speakSection, stop } = useTextToSpeechControls();
  const isActive = activeId === id;
  const canSpeak = !disabled && text.trim().length > 0;

  const handlePress = useCallback(() => {
    if (!canSpeak) return;

    if (isActive) {
      stop();
      return;
    }

    speakSection(id, text);
  }, [canSpeak, id, isActive, speakSection, stop, text]);

  const accessibilityLabel = isActive
    ? `Stop reading ${label}`
    : `Read ${label} aloud`;

  const icon = isActive ? (
    <VolumeX size={14} color={colors.green} strokeWidth={2.2} />
  ) : (
    <Volume2 size={14} color={colors.textMuted} strokeWidth={2.2} />
  );

  if (variant === "icon") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={!canSpeak}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !canSpeak, selected: isActive }}
        style={({ pressed }) => [
          styles.iconButton,
          isActive && styles.iconButtonActive,
          !canSpeak && styles.disabled,
          pressed && canSpeak && styles.pressed,
        ]}
      >
        {icon}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={!canSpeak}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !canSpeak, selected: isActive }}
      style={({ pressed }) => [
        styles.pill,
        isActive && styles.pillActive,
        !canSpeak && styles.disabled,
        pressed && canSpeak && styles.pressed,
      ]}
    >
      <View style={styles.pillIcon}>{icon}</View>

      <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
        {isActive ? "Stop" : "Listen"}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    flexShrink: 0,
  },
  pillActive: {
    borderColor: colors.green,
    backgroundColor: colors.surfaceMuted,
  },
  pillIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  pillLabelActive: {
    color: colors.green,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  iconButtonActive: {
    backgroundColor: "#EAF3DF",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
