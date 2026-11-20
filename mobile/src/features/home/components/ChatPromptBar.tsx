
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
import { Mic, MicOff, Send, Sparkles } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";
import chatQuestions from "../../../data/chat-questions.json";
import { useRotatingQuestions } from "../hooks/useRotatingQuestions";
import { useSpeechRecognition } from "../../../module/speech-recognition/hooks/useSpeechRecognition";

/** Softer than the shared borderStrong. */
const RESTING_BORDER = "#E3E8E0";
const FOCUS_FILL = "#F6FAF1";

const MIN_TEXT_HEIGHT = 20;
const MAX_TEXT_HEIGHT = 100;

type Props = {
  onSend: (message: string) => void;
  onPressMic?: () => void;
  label?: string;
  hint?: string;
  placeholder?: string;
  suggestions?: readonly string[];
  isSending?: boolean;
};

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

  // Speech recognition
  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition();

  // Preserve text that existed before voice input started.
  const previousDraft = useRef("");

  const pool = suggestions ?? chatQuestions;

  const questions = useRotatingQuestions(pool, {
    enabled: suggestions === undefined,
    intervalMs: 15_000,
    minCount: 2,
    maxCount: 4,
  });

  useEffect(() => {
    suggestionsFade.setValue(0);

    Animated.timing(suggestionsFade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [questions, suggestionsFade]);

  // Synchronize speech recognition results with the input.
  useEffect(() => {
    if (!isListening || !transcript) return;

    const nextValue = [previousDraft.current, transcript]
      .filter(Boolean)
      .join(" ");

    setValue(nextValue);
  }, [transcript, isListening]);

  // Stop listening when the composer becomes unavailable.
  useEffect(() => {
    if (isSending && isListening) {
      stopListening();
    }
  }, [isSending, isListening, stopListening]);

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

  const handleContentSizeChange = (contentHeight: number) => {
    const next = Math.min(
      MAX_TEXT_HEIGHT,
      Math.max(MIN_TEXT_HEIGHT, Math.ceil(contentHeight)),
    );

    setTextHeight((current) => current === next ? current : next);
  };

  const handleSend = () => {
    if (!canSend) return;

    if (isListening) {
      stopListening();
    }

    onSend(value.trim());

    setValue("");
    setTextHeight(MIN_TEXT_HEIGHT);
    clearTranscript();
    previousDraft.current = "";
  };

  const handleMicPress = async () => {
    if (isSending) return;

    if (isListening) {
      stopListening();
      return;
    }

    previousDraft.current = value.trim();
    clearTranscript();

    await startListening();
  };

  const handleSuggestionPress = (question: string) => {
    if (isSending) return;

    if (isListening) {
      stopListening();
    }

    clearTranscript();
    previousDraft.current = "";

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
            placeholder={isListening ? "Listening..." : placeholder}
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
          onPress={handleMicPress}
          disabled={isSending}
          accessibilityRole="button"
          accessibilityLabel={
            isListening ? "Stop voice recognition" : "Start voice recognition"
          }
          accessibilityState={{ disabled: isSending }}
          hitSlop={6}
          style={({ pressed }) => [
            styles.iconButton,
            isListening && styles.micActive,
            pressed && styles.pressed,
          ]}
        >
          {isListening ? (
            <MicOff size={19} color={colors.white} strokeWidth={2} />
          ) : (
            <Mic size={19} color={colors.green} strokeWidth={2} />
          )}
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

      {isListening && (
        <Text style={styles.speechStatus}>
          Listening to your voice...
        </Text>
      )}

      {error && (
        <Text style={styles.speechError}>
          {error}
        </Text>
      )}

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
  leading: {
    width: 24,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
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
  micActive: {
    backgroundColor: colors.green,
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
  speechStatus: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    color: colors.green,
  },
  speechError: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    color: "#C0392B",
  },
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
