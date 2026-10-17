import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import { ProfileAvatar } from "../../../components/common/ProfileAvatar";
import { CircularIconButton } from "../../../components/ui/CircularIconButton";
import { colors, spacing } from "../../../theme";

type Props = {
  name: string;
  avatarUrl?: string | null;
  onPressAvatar: () => void;
  onPressNotifications: () => void;
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

/** Greeting row: avatar + two-line greeting on the left, notifications on the right. */
export const GreetingHeader: React.FC<Props> = ({
  name,
  avatarUrl,
  onPressAvatar,
  onPressNotifications,
}) => {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPressAvatar}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        hitSlop={6}
        style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
      >
        <ProfileAvatar uri={avatarUrl} name={name} size={44} />

        <View style={styles.greetingText}>
          <Text style={styles.greeting} numberOfLines={1}>
            {getGreeting()}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </Pressable>

      <CircularIconButton
        onPress={onPressNotifications}
        accessibilityLabel="View recent activity"
      >
        <Bell size={20} color={colors.textOnDark} strokeWidth={1.8} />
      </CircularIconButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
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
  name: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
});
