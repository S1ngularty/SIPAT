import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Mic, Send, Square } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";

const BORDER = "#E3E8E0";

/** Grows with the message up to ~five lines, then scrolls. */
const MIN_TEXT_HEIGHT = 20;
const MAX_TEXT_HEIGHT = 100;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (message: string) => void;
  /** Starts/stops the microphone capture. */
  onPressMic: () => void;
  isSending?: boolean;
  isRecording?: boolean;
  isTranscribing?: boolean;
  /** Whisper progress, 0–100. */
  transcribeProgress?: number;
};

/** Bottom composer for the chat screen, including voice input state. */
export const ChatComposer: React.FC<Props> = ({
  value,
  onChangeText,
  onSend,
  onPressMic,
  isSending = false,
  isRecording = false,
  isTranscribing = false,
  transcribeProgress = 0,
}) => {
  const [textHeight, setTextHeight] = useState(MIN_TEXT_HEIGHT);

  const isBusy = isSending || isTranscribing;

  const canSend =
    value.trim().length > 0 && !isBusy && !isRecording;

  // Collapse the field back to one line when the draft is cleared.
  useEffect(() => {
    if (value.length === 0) setTextHeight(MIN_TEXT_HEIGHT);
  }, [value]);

  const handleSend = () => {
    if (!canSend) return;

    onSend(value.trim());
    onChangeText("");
    setTextHeight(MIN_TEXT_HEIGHT);
  };

  const progressLabel =
    transcribeProgress > 0 ? ` · ${Math.round(transcribeProgress)}%` : "";

  return (
    <View style={styles.wrapper}>
      {/* {(isRecording || isTranscribing) && (
        <View style={styles.voiceRow}>
          {isTranscribing ? (
            <ActivityIndicator size="small" color={colors.green} />
          ) : (
            <View style={styles.recordingDot} />
          )}
          <Text style={styles.voiceText}>
            {isTranscribing
              ? `Transcribing${progressLabel}…`
              : "Listening… tap the mic to stop"}
          </Text>
        </View>
      )} */}

      <View style={styles.bar}>
        <View style={styles.inputWrap}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={
              isRecording ? "Listening…" : isTranscribing ? "Transcribing…" : "Message Flora..."
            }
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { height: textHeight }]}
            multiline
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            onContentSizeChange={(event) => {
              const next = Math.min(
                MAX_TEXT_HEIGHT,
                Math.max(MIN_TEXT_HEIGHT, Math.ceil(event.nativeEvent.contentSize.height)),
              );

              setTextHeight((current) => (current === next ? current : next));
            }}
            selectionColor={colors.green}
            editable={!isRecording && !isTranscribing}
            accessibilityLabel="Message Flora"
          />
        </View>

        <Pressable
          onPress={onPressMic}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel={
            isRecording ? "Stop voice input" : "Ask with your voice"
          }
          accessibilityState={{ disabled: isBusy }}
          hitSlop={6}
          style={({ pressed }) => [
            styles.iconButton,
            isRecording && styles.micRecording,
            pressed && !isBusy && styles.pressed,
          ]}
        >
          {isTranscribing ? (
            <ActivityIndicator size="small" color={colors.green} />
          ) : isRecording ? (
            <Square size={15} color={colors.danger} strokeWidth={2.4} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
  },
  voiceText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
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
  micRecording: {
    backgroundColor: "rgba(180, 67, 58, 0.12)",
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
