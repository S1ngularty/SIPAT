import { useState } from "react";
import { Alert } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { useNavigation } from "@react-navigation/native";
import showToast from "../../../helper/toast";

export default function useAccountSettings() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const navigation = useNavigation();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Derived user info
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "—";
  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Guest";
  const userInitial = (userName[0] ?? "?").toUpperCase();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: performLogout,
        },
      ],
    );
  };

  const performLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      // Clerk will automatically redirect to the sign-in flow
      // If you have manual navigation, uncomment below:
      // navigation.reset({ index: 0, routes: [{ name: "SignIn" }] });
    } catch (error) {
      console.error("Logout error:", error);
      showToast("error", "Logout Failed", "Please try again.");
      setIsLoggingOut(false);
    }
  };

  // Placeholder handlers for future features
  const handleEditProfile = () => {
    showToast("info", "Coming Soon", "Profile editing will be available soon.");
  };

  const handleChangePassword = () => {
    showToast("info", "Coming Soon", "Password change will be available soon.");
  };

  const handleNotifications = () => {
    showToast("info", "Coming Soon", "Notification settings coming soon.");
  };

  const handleLanguage = () => {
    showToast("info", "Coming Soon", "Language settings coming soon.");
  };

  const handlePrivacy = () => {
    showToast("info", "Coming Soon", "Privacy settings coming soon.");
  };

  const handleHelp = () => {
    showToast("info", "Coming Soon", "Help center coming soon.");
  };

  const handleAbout = () => {
    showToast("info", "Coming Soon", "About page coming soon.");
  };

  return {
    // User data
    userEmail,
    userName,
    userInitial,

    // State
    isLoggingOut,

    // Handlers
    handleLogout,
    handleEditProfile,
    handleChangePassword,
    handleNotifications,
    handleLanguage,
    handlePrivacy,
    handleHelp,
    handleAbout,
  };
}