import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  History,
  ScanLine,
  BookOpen,
  User,
  LucideIcon,
  Microscope,
} from "lucide-react-native";
import {
  useBottomTabBarHeight,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

//Screens
import HomeScreen from "../features/home/screens/Home";
import { DiagnosisListScreen } from "../features/diagnosis/screens/DiagnosisListScreen";
import { BottomTabBar } from "./components/BottomTabBar";
import { UserStackParamList } from "./UserNavigation"; // Import your stack param list
import { colors, spacing } from "../theme";
import AccountSettingsScreen from "../features/profile/screen/AccountSettingsScreen";

// Define types for navigation
export type TabParamList = {
  Home: undefined;
  Diagnoses: undefined;
  Scan: undefined;
  History: undefined;
  Profile: undefined;
};

interface ScreenContent {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

interface PlaceholderScreenProps {
  route: {
    name: keyof TabParamList;
  };
}

// Placeholder Screens
const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ route }) => {
  const tabBarHeight = useBottomTabBarHeight();

  const screenContent: Record<keyof TabParamList, ScreenContent> = {
    Home: {
      icon: BookOpen,
      title: "Home",
      subtitle: "Welcome to your agricultural dashboard",
    },
    History: {
      icon: History,
      title: "History",
      subtitle: "Your recent activities and scans",
    },
    Scan: {
      icon: ScanLine,
      title: "Scan",
      subtitle: "Scan your crops for health analysis",
    },
    Diagnoses: {
      icon: BookOpen,
      title: "Diagnosis",
      subtitle: "Crop Diagnosis",
    },
    Profile: {
      icon: User,
      title: "Profile",
      subtitle: "Manage your account settings",
    },
  };

  const content: ScreenContent =
    screenContent[route.name] || screenContent.Home;
  const IconComponent: LucideIcon = content.icon;

  return (
    <View style={[styles.placeholderContainer, { paddingBottom: tabBarHeight }]}>
      <View style={styles.placeholderIconContainer}>
        <IconComponent size={48} color={colors.green} strokeWidth={1.5} />
      </View>
      <Text style={styles.placeholderTitle}>{content.title}</Text>
      <Text style={styles.placeholderSubtitle}>{content.subtitle}</Text>
      <View style={styles.placeholderBadge}>
        <Text style={styles.placeholderBadgeText}>Coming Soon</Text>
      </View>
    </View>
  );
};

// Special Scan placeholder that navigates to VideoScanning
const ScanPlaceholderScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<UserStackParamList>>();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={[styles.placeholderContainer, { paddingBottom: tabBarHeight }]}>
      <View style={styles.placeholderIconContainer}>
        <ScanLine size={48} color={colors.green} strokeWidth={1.5} />
      </View>
      <Text style={styles.placeholderTitle}>Scan</Text>
      <Text style={styles.placeholderSubtitle}>
        Scan your crops for health analysis
      </Text>
      <TouchableOpacity
        style={styles.scanActionButton}
        onPress={() => navigation.navigate("VideoScanning")}
        accessibilityRole="button"
        accessibilityLabel="Start scanning"
      >
        <ScanLine size={20} color={colors.forest} strokeWidth={2} />
        <Text style={styles.scanActionButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );
};

const Tab = createBottomTabNavigator<TabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <BottomTabBar {...props} />;

const HomeTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Diagnoses"
        component={DiagnosisListScreen}
        options={{ tabBarLabel: "Diagnosis" }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanPlaceholderScreen}
        options={{ tabBarLabel: "Scan" }}
      />
      <Tab.Screen
        name="History"
        component={PlaceholderScreen}
        options={{ tabBarLabel: "History" }}
      />
      <Tab.Screen
        name="Profile"
        component={AccountSettingsScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  placeholderIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  placeholderBadge: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  placeholderBadgeText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  scanActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lime,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 14,
    borderRadius: 25,
    gap: spacing.sm,
  },
  scanActionButtonText: {
    color: colors.forest,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeTabNavigator;
