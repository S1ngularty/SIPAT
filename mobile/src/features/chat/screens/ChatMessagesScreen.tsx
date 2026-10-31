import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radii, spacing } from "../../../theme";
import { useChatbot } from "../ChatProvider";
import { ChatComposer } from "../components/ChatComposer";
import type { ChatMessage } from "../chatTypes";
import type { UserStackParamList } from "../../../navigations/UserNavigation";
import { Wave } from "react-native-animated-spinkit";

const BORDER = "#E3E8E0";

type Props = NativeStackScreenProps<UserStackParamList, "Chat">;

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
};

const TypingBubble: React.FC = () => (
  <View style={[styles.row, styles.rowAssistant]}>
    <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
      <Wave size={22} color={colors.textMuted} />
      <Text style={styles.typingText}>Flora is thinking...</Text>
    </View>
  </View>
);

const EmptyChat: React.FC = () => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Sparkles size={26} color={colors.green} strokeWidth={1.9} />
    </View>
    <Text style={styles.emptyTitle}>Ask Flora anything</Text>
    <Text style={styles.emptyBody}>
      Crop problems, pests, watering, fertilizer — send a question below to
      start.
    </Text>
  </View>
);

/**
 * Full conversation screen. The history lives in `ChatProvider`, so going back
 * to Home and reopening the chat keeps every previous turn.
 */
export const ChatMessagesScreen: React.FC<Props> = ({ navigation }) => {
  const { messages, isSending, error, send, retry } = useChatbot();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleSend = useCallback(
    (message: string) => {
      void send(message);
    },
    [send],
  );

  const handleRetry = useCallback(() => {
    void retry();
  }, [retry]);

  const handleMicPress = useCallback(() => {
    Alert.alert("Flora", "Voice questions are coming soon.");
  }, []);

  /** Keep the latest message visible when the keyboard opens. */
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () =>
      listRef.current?.scrollToEnd({ animated: true }),
    );

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={navigation.goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>

        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Sparkles size={16} color={colors.green} strokeWidth={2.2} />
            <Text style={styles.title}>Flora</Text>
          </View>
          <Text style={styles.subtitle}>AI crop assistant</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, index) => `${item.role}-${index}`}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={<EmptyChat />}
          ListFooterComponent={
            isSending ? (
              <TypingBubble />
            ) : error ? (
              <View style={[styles.row, styles.rowAssistant]}>
                <View
                  style={[
                    styles.bubble,
                    styles.assistantBubble,
                    styles.errorBubble,
                  ]}
                >
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable
                    onPress={handleRetry}
                    accessibilityRole="button"
                    accessibilityLabel="Try again"
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          }
        />

        <ChatComposer
          onSend={handleSend}
          onPressMic={handleMicPress}
          isSending={isSending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatMessagesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 11,
    color: colors.textMuted,
  },
  body: {
    flex: 1,
  },
  messages: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    width: "100%",
    marginBottom: spacing.md,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAssistant: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  userBubble: {
    backgroundColor: colors.green,
    borderBottomRightRadius: radii.sm,
  },
  assistantBubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomLeftRadius: radii.sm,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  userMessageText: {
    color: colors.white,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  typingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  errorBubble: {
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.danger,
  },
  retryButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: colors.surfaceMuted,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.green,
  },
  empty: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  emptyBody: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: colors.textMuted,
    maxWidth: 280,
  },
  pressed: {
    opacity: 0.7,
  },
});
