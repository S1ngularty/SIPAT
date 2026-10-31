import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Mic, Send } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";

const BORDER = "#E3E8E0";

/** Grows with the message up to ~five lines, then scrolls. */
const MIN_TEXT_HEIGHT = 20;
const MAX_TEXT_HEIGHT = 100;

type Props = {
  onSend: (message: string) => void;
  /** Voice entry point — recording is not implemented yet. */
  onPressMic?: () => void;
  isSending?: boolean;
};

/** Bottom composer for the chat screen. */
export const ChatComposer: React.FC<Props> = ({
  onSend,
  onPressMic,
  isSending = false,
}) => {
  const [value, setValue] = useState("");
  const [textHeight, setTextHeight] = useState(MIN_TEXT_HEIGHT);

  const canSend = value.trim().length > 0 && !isSending;

  const handleSend = () => {
    if (!canSend) return;

    onSend(value.trim());
    setValue("");
    setTextHeight(MIN_TEXT_HEIGHT);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <View style={styles.inputWrap}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Message Flora..."
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
            accessibilityLabel="Message Flora"
          />
        </View>

        <Pressable
          onPress={onPressMic}
          accessibilityRole="button"
          accessibilityLabel="Ask with your voice"
          accessibilityState={{ disabled: !onPressMic }}
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
