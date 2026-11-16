import { useState } from "react";
import { Alert } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import showToast from "../../../helper/toast";
import { useProfile } from "./useProfile";
import {
  formatFarmLocation,
  formatPreferredCrops,
} from "../profileTypes";
import type { UserStackParamList } from "../../../navigations/UserNavigation";

export default function useAccountSettings() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const navigation = useNavigation();

  const { profile, isLoading: isProfileLoading } = useProfile();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Prefer the profile stored in our API; Clerk is the fallback while the
  // request is in flight or if the record is missing.
  const userEmail =
    profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? "—";

  const userName =
    profile?.name?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Guest";

  const userInitial = (userName[0] ?? "?").toUpperCase();

  const userPhoneNumber = profile?.phoneNumber?.trim() || "Not set";
  const userFarmLocation = formatFarmLocation(profile?.farmLocation);
  const userPreferredCrops = formatPreferredCrops(profile?.preferredCrops);

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

  const handleEditProfile = () => {
    navigation
      .getParent<NativeStackNavigationProp<UserStackParamList>>()
      ?.navigate("EditProfile");
  };

  const handleChangePassword = () => {
    navigation
      .getParent<NativeStackNavigationProp<UserStackParamList>>()
      ?.navigate("ChangePassword");
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
    userPhoneNumber,
    userFarmLocation,
    userPreferredCrops,
    isProfileLoading,

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
