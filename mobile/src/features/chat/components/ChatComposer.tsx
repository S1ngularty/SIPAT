
import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Mic, MicOff, Send } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";
import { useSpeechRecognition } from "../../../module/speech-recognition/hooks/useSpeechRecognition";

const BORDER = "#E3E8E0";

const MIN_TEXT_HEIGHT = 20;
const MAX_TEXT_HEIGHT = 100;

type Props = {
  onSend: (message: string) => void;
  onPressMic?: () => void;
  isSending?: boolean;
};

export const ChatComposer: React.FC<Props> = ({
  onSend,
  isSending = false,
}) => {
  const [value, setValue] = useState("");
  const [textHeight, setTextHeight] = useState(MIN_TEXT_HEIGHT);

  const previousDraft = useRef("");

  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition();

  const canSend = value.trim().length > 0 && !isSending;

  // Update the voice portion without duplicating interim results.
  useEffect(() => {
    if (!isListening || !transcript) return;

    const nextValue = [previousDraft.current, transcript]
      .filter(Boolean)
      .join(" ");

    setValue(nextValue);
  }, [transcript, isListening]);

  // Stop recognition if the composer becomes unavailable.
  useEffect(() => {
    if (isSending && isListening) {
      stopListening();
    }
  }, [isSending, isListening, stopListening]);

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

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <View style={styles.inputWrap}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={isListening ? "Listening..." : "Message Flora..."}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { height: textHeight }]}
            multiline
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            onContentSizeChange={(event) => {
              const next = Math.min(
                MAX_TEXT_HEIGHT,
                Math.max(
                  MIN_TEXT_HEIGHT,
                  Math.ceil(event.nativeEvent.contentSize.height),
                ),
              );

              setTextHeight((current) =>
                current === next ? current : next,
              );
            }}
            selectionColor={colors.green}
            editable={!isSending}
            accessibilityLabel="Message Flora"
          />
        </View>

        <Pressable
          onPress={handleMicPress}
          disabled={isSending}
          accessibilityRole="button"
          accessibilityLabel={
            isListening ? "Stop voice recognition" : "Start voice recognition"
          }
          accessibilityState={{
            disabled: isSending,
            selected: isListening,
          }}
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
          <Send
            size={18}
            color={canSend ? colors.white : colors.textMuted}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      {/* {isListening && (
        <Text style={styles.speechStatus}>
          Listening...
        </Text>
      )} */}

      {error && (
        <Text style={styles.speechError}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    minHeight: 54,
    paddingVertical: 8,
    paddingLeft: spacing.lg,
    paddingRight: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: colors.white,
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 9,
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
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.green,
  },
  speechError: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: "#C0392B",
  },
  pressed: {
    opacity: 0.7,
  },
});
