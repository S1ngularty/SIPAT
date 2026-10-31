import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Bell, MessageCircle } from "lucide-react-native";
import { ProfileAvatar } from "../../../components/common/ProfileAvatar";
import { CircularIconButton } from "../../../components/ui/CircularIconButton";
import { colors, spacing } from "../../../theme";

type Props = {
  name: string;
  avatarUrl?: string | null;
  onPressAvatar: () => void;
  onPressNotifications: () => void;
  /** Opens the Flora chat screen. Hidden when omitted. */
  onPressChat?: () => void;
  /** "light" when placed over photography/dark surfaces, "dark" on light surfaces. */
  tone?: "light" | "dark";
  style?: StyleProp<ViewStyle>;
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

/**
 * Profile row: avatar + two-line greeting on the left, notifications on the
 * right. Used inside the home hero sheet, so it adapts to a dark/photographic
 * background via `tone`.
 */
export const GreetingHeader: React.FC<Props> = ({
  name,
  avatarUrl,
  onPressAvatar,
  onPressNotifications,
  onPressChat,
  tone = "dark",
  style,
}) => {
  const onDark = tone === "light";

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={onPressAvatar}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        hitSlop={6}
        style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
      >
        <View style={[styles.avatar, onDark && styles.avatarOnDark]}>
          <ProfileAvatar uri={avatarUrl} name={name} size={44} />
        </View>

        <View style={styles.greetingText}>
          <Text
            style={[styles.greeting, onDark && styles.greetingOnDark]}
            numberOfLines={1}
          >
            {getGreeting()}
          </Text>
          <Text
            style={[styles.name, onDark && styles.nameOnDark]}
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        {onPressChat ? (
          <CircularIconButton
            onPress={onPressChat}
            accessibilityLabel="Open the Flora chat"
            variant={onDark ? "outline" : "solid"}
          >
            <MessageCircle
              size={20}
              color={colors.textOnDark}
              strokeWidth={1.8}
            />
          </CircularIconButton>
        ) : null}

        <CircularIconButton
          onPress={onPressNotifications}
          accessibilityLabel="View recent activity"
          variant={onDark ? "outline" : "solid"}
        >
          <Bell size={20} color={colors.textOnDark} strokeWidth={1.8} />
        </CircularIconButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    borderRadius: 999,
  },
  avatarOnDark: {
    borderWidth: 1,
    borderColor: colors.outlineOnDark,
    padding: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  greetingText: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: colors.textMuted,
  },
  greetingOnDark: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  name: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  nameOnDark: {
    color: colors.textOnDark,
  },
});
