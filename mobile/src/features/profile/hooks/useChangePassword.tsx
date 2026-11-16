import { useCallback, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "@clerk/expo";
import showToast from "../../../helper/toast";

/** Clerk's default minimum password length. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Changes the signed-in user's password through Clerk. Passwords never touch
 * the SIPAT API or database — Clerk owns credentials.
 */
export const useChangePassword = () => {
  const navigation = useNavigation();
  const { user } = useUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const toggleShowPasswords = useCallback(
    () => setShowPasswords((current) => !current),
    [],
  );

  const submit = useCallback(async () => {
    if (!user) {
      showToast("error", "Not signed in", "Please sign in again.");
      return;
    }

    if (!currentPassword) {
      showToast(
        "error",
        "Current password required",
        "Enter your current password to continue.",
      );
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showToast(
        "error",
        "Password is too short",
        `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast(
        "error",
        "Passwords don't match",
        "Make sure both new password fields match.",
      );
      return;
    }

    if (newPassword === currentPassword) {
      showToast(
        "error",
        "Choose a new password",
        "Your new password must be different from the current one.",
      );
      return;
    }

    setIsSaving(true);

    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: false,
      });

      showToast(
        "success",
        "Password updated",
        "Your password has been changed successfully.",
      );
      navigation.goBack();
    } catch (err: any) {
      // Clerk returns a structured `errors` array; surface the friendly text.
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Please check your current password and try again.";

      showToast("error", "Couldn't change password", message);
    } finally {
      setIsSaving(false);
    }
  }, [user, currentPassword, newPassword, confirmPassword, navigation]);

  return {
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
    passwordEnabled: user?.passwordEnabled ?? true,
  };
};
