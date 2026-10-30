import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowUp, Mic, Sparkles } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";

/** Softer than the shared `borderStrong` so the green accents stay the focus. */
const RESTING_BORDER = "#E3E8E0";
const FOCUS_FILL = "#F6FAF1";

type Props = {
  /** Called with the trimmed text when the user submits a question. */
  onSend: (message: string) => void;
  /** Voice entry point — recording is not implemented yet. */
  onPressMic: () => void;
  /** Label shown above the bar. */
  label?: string;
  /** Muted text shown next to the label. */
  hint?: string;
  placeholder?: string;
  /** Shows a spinner in the send button and locks the input. */
  isSending?: boolean;
};

/**
 * Home entry point for the AI assistant: a label, then a horizontal bar with
 * the assistant sparkle on the left, a free-text field, and the mic / send
 * actions on the right. Sits between the hero sheet and "Agri Tips".
 *
 * The bar gently lifts when focused: the outline shifts from a soft neutral to
 * the brand green, the fill warms slightly, and it scales up a touch.
 */
export const ChatPromptBar: React.FC<Props> = ({
  onSend,
  onPressMic,
  label = "Flora",
  hint = "Your AI crop assistant",
  placeholder = "Ask Flora",
  isSending = false,
}) => {
  const [value, setValue] = useState("");
  const focusAnim = useRef(new Animated.Value(0)).current;

  const canSend = value.trim().length > 0 && !isSending;

  const animateFocus = useCallback(
    (toValue: number) => {
      Animated.timing(focusAnim, {
        toValue,
        duration: 180,
        useNativeDriver: false,
      }).start();
    },
    [focusAnim],
  );

  const handleSend = () => {
    if (!canSend) return;

    onSend(value.trim());
    setValue("");
  };

  const animatedBarStyle = {
    borderColor: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [RESTING_BORDER, colors.green],
    }),
    backgroundColor: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.white, "#FFFF"],
    }),
    transform: [
      {
        scale: focusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.02],
        }),
      },
    ],
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint} numberOfLines={1}>
          {hint}
        </Text>
      </View>

      <Animated.View style={[styles.bar, animatedBarStyle]}>
        <View style={styles.leading} accessibilityElementsHidden>
          <Sparkles size={20} color={colors.green} strokeWidth={2.2} />
        </View>

        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          onFocus={() => animateFocus(1)}
          onBlur={() => animateFocus(0)}
          editable={!isSending}
          selectionColor={colors.green}
          autoCapitalize="sentences"
          accessibilityLabel="Ask the AI assistant"
        />

        <Pressable
          onPress={onPressMic}
          accessibilityRole="button"
          accessibilityLabel="Ask with your voice"
          hitSlop={6}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Mic size={19} color={colors.green} strokeWidth={2} />
        </Pressable>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          hitSlop={6}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
            pressed && canSend && styles.pressed,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <ArrowUp
              size={19}
              color={canSend ? colors.white : colors.textMuted}
              strokeWidth={2.4}
            />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  hint: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 58,
    paddingLeft: spacing.md,
    paddingRight: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.white,
  },
  /** Bare sparkle — no filled badge, so the icon reads as part of the field. */
  leading: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 42,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.7,
  },
});
