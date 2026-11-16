import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
} from "lucide-react-native";
import { useChangePassword } from "../hooks/useChangePassword";

const COLORS = {
  background: "#F5F5F0",
  card: "#FFFFFF",
  border: "#E0E0E0",
  text: "#333333",
  textMuted: "#8A8A8A",
  green: "#2E7D32",
  greenSoft: "#E8F5E9",
  greenIcon: "#4CAF50",
  lime: "#D8F3A3",
};

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisibility: () => void;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  visible,
  onToggleVisibility,
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        selectionColor={COLORS.green}
      />
      <TouchableOpacity
        onPress={onToggleVisibility}
        style={styles.eyeButton}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        hitSlop={8}
      >
        {visible ? (
          <EyeOff size={18} color={COLORS.textMuted} strokeWidth={1.8} />
        ) : (
          <Eye size={18} color={COLORS.textMuted} strokeWidth={1.8} />
        )}
      </TouchableOpacity>
    </View>
  </View>
);

const ChangePasswordScreen: React.FC = () => {
  const {
    user,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showPasswords,
    toggleShowPasswords,
    submit,
    isSaving,
    navigation,
    passwordEnabled,
  } = useChangePassword();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <ChevronLeft size={22} color={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Change Password</Text>
          <Text style={styles.headerSubtitle}>
            Keep your account secure
          </Text>
        </View>
      </View>

      {!user ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.green} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <ShieldCheck
                  size={26}
                  color={COLORS.greenIcon}
                  strokeWidth={1.8}
                />
              </View>
              <Text style={styles.heroTitle}>Password & security</Text>
              <Text style={styles.heroText}>
                Your password is stored securely by Clerk. We never see or save
                it in the SIPAT database.
              </Text>
            </View>
          </Animated.View>

          {passwordEnabled ? (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <View style={styles.card}>
                <PasswordField
                  label="Current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  visible={showPasswords}
                  onToggleVisibility={toggleShowPasswords}
                />

                <View style={styles.divider} />

                <PasswordField
                  label="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 8 characters"
                  visible={showPasswords}
                  onToggleVisibility={toggleShowPasswords}
                />

                <PasswordField
                  label="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your new password"
                  visible={showPasswords}
                  onToggleVisibility={toggleShowPasswords}
                />

                <View style={styles.tipRow}>
                  <Lock size={14} color={COLORS.textMuted} strokeWidth={1.8} />
                  <Text style={styles.tipText}>
                    Use at least 8 characters with a mix of letters, numbers
                    and symbols.
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <View style={styles.noticeCard}>
                <KeyRound
                  size={20}
                  color={COLORS.greenIcon}
                  strokeWidth={1.8}
                />
                <Text style={styles.noticeText}>
                  This account signs in with a social provider, so there is no
                  password to change here.
                </Text>
              </View>
            </Animated.View>
          )}

          {passwordEnabled ? (
            <Animated.View entering={FadeInDown.delay(180).duration(400)}>
              <TouchableOpacity
                onPress={submit}
                activeOpacity={0.8}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Update password"
                style={[
                  styles.saveButton,
                  isSaving && styles.saveButtonDisabled,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.green} />
                ) : (
                  <Text style={styles.saveButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.green,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 20,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  heroText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.lime,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.green,
  },
});

export default ChangePasswordScreen;
