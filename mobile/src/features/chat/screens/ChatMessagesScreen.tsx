import React, { useCallback, useEffect, useRef } from "react";
import {
  Alert,
  Animated,
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
import chatQuestions from "../../../data/chat-questions.json";
import { useRotatingQuestions } from "../../home/hooks/useRotatingQuestions";
import { useChatbot } from "../ChatProvider";
import { ChatComposer } from "../components/ChatComposer";
import { RichMessageText } from "../components/RichMessageText";
import type { ChatMessage } from "../chatTypes";
import type { UserStackParamList } from "../../../navigations/UserNavigation";
import { Wave } from "react-native-animated-spinkit";

const BORDER = "#E3E8E0";
const SUGGESTION_FILL = "#F6FAF1";

type Props = NativeStackScreenProps<UserStackParamList, "Chat">;

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === "user";
  const entrance = useRef(new Animated.Value(isUser ? 1 : 0)).current;

  /** Assistant replies fade/slide in as they are appended to the list. */
  useEffect(() => {
    if (isUser) return;

    Animated.timing(entrance, {
      toValue: 1,
      duration: 340,
      useNativeDriver: true,
    }).start();
  }, [entrance, isUser]);

  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAssistant,
        !isUser && {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <RichMessageText
          text={message.content}
          highlightTerms={isUser ? undefined : message.highlightTerms}
          boldTexts={isUser ? undefined : message.boldTexts}
          style={
            isUser
              ? [styles.messageText, styles.userMessageText]
              : styles.messageText
          }
        />
      </View>
    </Animated.View>
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
  const suggestionsFade = useRef(new Animated.Value(1)).current;

  /**
   * Quick prompts docked above the composer — same rotating pool as the Home
   * bar: a shuffled 2–4 questions, replaced every 15 s.
   */
  const questions = useRotatingQuestions(chatQuestions, {
    intervalMs: 15_000,
    minCount: 2,
    maxCount: 4,
  });

  /** Soft swap whenever the rotating question set changes. */
  useEffect(() => {
    suggestionsFade.setValue(0);

    Animated.timing(suggestionsFade, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [questions, suggestionsFade]);

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
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
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

        {messages.length <= 0 && (
          <Animated.View
            style={[styles.suggestions, { opacity: suggestionsFade }]}
          >
            {questions.map((question) => (
              <Pressable
                key={question}
                onPress={() => handleSend(question)}
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
        )}

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
  /** Wrapping chip cloud docked above the composer. */
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  suggestion: {
    maxWidth: "100%",
    minHeight: 34,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SUGGESTION_FILL,
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
