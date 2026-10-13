import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import {
  User,
  Mail,
  Lock,
  Bell,
  Globe,
  Shield,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Leaf,
  LucideIcon,
} from "lucide-react-native";
import useAccountSettings from "../hooks/useAccountSettings";

interface SettingsItemProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon: Icon,
  label,
  value,
  onPress,
  danger,
  isLast,
}) => {
  const color = danger ? "#EF5350" : "#333";

  return (
    <TouchableOpacity
      style={[styles.item, !isLast && styles.itemBorder]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={!onPress}
    >
      <View style={[styles.itemIconWrap, danger && styles.itemIconWrapDanger]}>
        <Icon
          size={18}
          color={danger ? "#EF5350" : "#4CAF50"}
          strokeWidth={1.8}
        />
      </View>
      <Text style={[styles.itemLabel, { color }]}>{label}</Text>
      {value ? (
        <Text style={styles.itemValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress && !danger ? (
        <ChevronRight size={18} color="#BBB" strokeWidth={2} />
      ) : null}
    </TouchableOpacity>
  );
};

const AccountSettingsScreen = () => {
  const {
    userEmail,
    userName,
    userInitial,
    isLoggingOut,
    handleLogout,
    handleEditProfile,
    handleChangePassword,
    handleNotifications,
    handleLanguage,
    handlePrivacy,
    handleHelp,
    handleAbout,
  } = useAccountSettings();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Account</Text>
          <Text style={styles.headerSubtitle}>
            Manage your profile and preferences
          </Text>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.profileCard}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {userEmail}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Account Section */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <SettingsItem
              icon={User}
              label="Edit Profile"
              onPress={handleEditProfile}
            />
            <SettingsItem
              icon={Mail}
              label="Email Address"
              value={userEmail}
            />
            <SettingsItem
              icon={Lock}
              label="Change Password"
              onPress={handleChangePassword}
              isLast
            />
          </View>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <SettingsItem
              icon={Bell}
              label="Notifications"
              onPress={handleNotifications}
            />
            <SettingsItem
              icon={Globe}
              label="Language"
              value="English"
              onPress={handleLanguage}
            />
            <SettingsItem
              icon={Shield}
              label="Privacy & Security"
              onPress={handlePrivacy}
              isLast
            />
          </View>
        </Animated.View>

        {/* Support Section */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <SettingsItem
              icon={HelpCircle}
              label="Help Center"
              onPress={handleHelp}
            />
            <SettingsItem
              icon={Info}
              label="About"
              value="v1.0.0"
              onPress={handleAbout}
              isLast
            />
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)}>
          <View style={styles.card}>
            <SettingsItem
              icon={LogOut}
              label={isLoggingOut ? "Logging out..." : "Log Out"}
              onPress={isLoggingOut ? undefined : handleLogout}
              danger
              isLast
            />
            {isLoggingOut && (
              <ActivityIndicator
                color="#EF5350"
                size="small"
                style={styles.logoutLoader}
              />
            )}
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(500)}
          style={styles.footer}
        >
          <Leaf size={14} color="#BBB" strokeWidth={1.5} />
          <Text style={styles.footerText}>Grow with us</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F0",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: "#999",
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
  },
  editButtonText: {
    color: "#2E7D32",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 24,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemIconWrapDanger: {
    backgroundColor: "#FFEBEE",
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  itemValue: {
    fontSize: 13,
    color: "#999",
    maxWidth: 150,
    marginRight: 6,
  },
  logoutLoader: {
    position: "absolute",
    right: 16,
    top: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#BBB",
  },
});

export default AccountSettingsScreen;