import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Mic, Send, Sparkles } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";
import chatQuestions from "../../../data/chat-questions.json";
import { useRotatingQuestions } from "../hooks/useRotatingQuestions";

/** Softer than the shared `borderStrong` so the green accents stay the focus. */
const RESTING_BORDER = "#E3E8E0";
const FOCUS_FILL = "#F6FAF1";

/** Text area grows with the message, then scrolls past this height. */
const MIN_TEXT_HEIGHT = 20;
const MAX_TEXT_HEIGHT = 100;

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
  /**
   * Static questions to show instead of the rotating pool. Pass `[]` to hide
   * the chips entirely.
   */
  suggestions?: readonly string[];
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
  suggestions,
  isSending = false,
}) => {
  const [value, setValue] = useState("");
  const [textHeight, setTextHeight] = useState(MIN_TEXT_HEIGHT);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const suggestionsFade = useRef(new Animated.Value(1)).current;

  const pool = suggestions ?? chatQuestions;
  const questions = useRotatingQuestions(pool, {
    enabled: suggestions === undefined,
    intervalMs: 15_000,
    minCount: 2,
    maxCount: 4,
  });

  /**
   * Fade the chip cloud whenever the rotating set changes so the swap reads as
   * a refresh rather than a flicker.
   */
  useEffect(() => {
    suggestionsFade.setValue(0);

    Animated.timing(suggestionsFade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [questions, suggestionsFade]);

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

  /** Grows the input between one and ~five lines, then lets it scroll. */
  const handleContentSizeChange = (contentHeight: number) => {
    const next = Math.min(
      MAX_TEXT_HEIGHT,
      Math.max(MIN_TEXT_HEIGHT, Math.ceil(contentHeight)),
    );

    setTextHeight((current) => (current === next ? current : next));
  };

  const handleSend = () => {
    if (!canSend) return;

    onSend(value.trim());
    setValue("");
    setTextHeight(MIN_TEXT_HEIGHT);
  };

  /** Chips fill the bar and send in one tap. */
  const handleSuggestionPress = (question: string) => {
    if (isSending) return;

    setValue(question);
    onSend(question);
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

        <View style={styles.inputWrap}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { height: textHeight }]}
            multiline
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            onContentSizeChange={(event) =>
              handleContentSizeChange(event.nativeEvent.contentSize.height)
            }
            onFocus={() => animateFocus(1)}
            onBlur={() => animateFocus(0)}
            editable={!isSending}
            autoCapitalize="sentences"
            accessibilityLabel="Ask the AI assistant"
          />
        </View>

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
            <Send
              size={19}
              color={canSend ? colors.white : colors.textMuted}
              strokeWidth={2.4}
            />
          )}
        </Pressable>
      </Animated.View>

      {questions.length > 0 ? (
        <Animated.View
          style={[
            styles.suggestions,
            {
              opacity: suggestionsFade,
              transform: [
                {
                  translateY: suggestionsFade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 0],
                  }),
                },
              ],
            },
          ]}
          accessibilityLabel="Suggested questions"
        >
          {questions.map((question) => (
            <Pressable
              key={question}
              onPress={() => handleSuggestionPress(question)}
              disabled={isSending}
              accessibilityRole="button"
              accessibilityLabel={question}
              accessibilityState={{ disabled: isSending }}
              style={({ pressed }) => [
                styles.suggestion,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.suggestionText}>{question}</Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
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
    fontSize: 21,
    fontWeight: "700",
    color: colors.text,
  },
  hint: {
    flexShrink: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 58,
    paddingVertical: 8,
    paddingLeft: spacing.md,
    paddingRight: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.white,
  },
  /** Bare sparkle — no filled badge, so the icon reads as part of the field. */
  leading: {
    width: 24,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  /** Pads the text area vertically so the bar stays 58 tall for one line. */
  inputWrap: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    justifyContent: "center",
  },
  input: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: "top",
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
  /** Wrapping chip cloud — fills each row before starting a new one. */
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  suggestion: {
    maxWidth: "100%",
    minHeight: 34,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: RESTING_BORDER,
    backgroundColor: FOCUS_FILL,
    justifyContent: "center",
  },
  suggestionText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.green,
  },
  pressed: {
    opacity: 0.7,
  },
});
