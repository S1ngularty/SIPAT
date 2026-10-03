import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import {
  Home,
  History,
  ScanLine,
  BookOpen,
  User,
  Leaf,
  LucideIcon,
  Microscope,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

//Screens
import HomeScreen from "../features/home/screens/Home";
import { DiagnosisListScreen } from "../features/diagnosis/screens/DiagnosisListScreen";
import { UserStackParamList } from "./UserNavigation"; // Import your stack param list

// Define types for navigation
type TabParamList = {
  Home: undefined;
  History: undefined;
  Scan: undefined;
  Articles: undefined;
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

interface CustomTabIconProps {
  route: {
    name: keyof TabParamList;
  };
  focused: boolean;
  color: string;
  size: number;
}

interface AnimatedIconProps {
  focused: boolean;
  children: React.ReactNode;
}

// Placeholder Screens
const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ route }) => {
  const screenContent: Record<keyof TabParamList, ScreenContent> = {
    Home: {
      icon: Home,
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
    Articles: {
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
    <View style={styles.placeholderContainer}>
      <View style={styles.placeholderIconContainer}>
        <IconComponent size={48} color="#4CAF50" strokeWidth={1.5} />
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

  return (
    <View style={styles.placeholderContainer}>
      <View style={styles.placeholderIconContainer}>
        <ScanLine size={48} color="#4CAF50" strokeWidth={1.5} />
      </View>
      <Text style={styles.placeholderTitle}>Scan</Text>
      <Text style={styles.placeholderSubtitle}>
        Scan your crops for health analysis
      </Text>
      <TouchableOpacity
        style={styles.scanActionButton}
        onPress={() => navigation.navigate("VideoScanning")}
      >
        <ScanLine size={20} color="#fff" strokeWidth={2} />
        <Text style={styles.scanActionButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );
};

const Tab = createBottomTabNavigator<TabParamList>();

const AnimatedIcon: React.FC<AnimatedIconProps> = ({ focused, children }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(focused ? 1.1 : 1, {
            damping: 10,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

const CustomTabIcon: React.FC<CustomTabIconProps> = ({
  route,
  focused,
  color,
  size,
}) => {
  const icons: Record<keyof TabParamList, LucideIcon> = {
    Home: Home,
    History: History,
    Scan: ScanLine,
    Articles: Microscope,
    Profile: User,
  };

  const IconComponent: LucideIcon = icons[route.name] || Home;

  return (
    <AnimatedIcon focused={focused}>
      <IconComponent
        size={size}
        color={color}
        strokeWidth={focused ? 2.5 : 1.5}
      />
    </AnimatedIcon>
  );
};

const HomeTabNavigator: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<UserStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => (
          <CustomTabIcon
            route={route}
            focused={focused}
            color={color}
            size={22}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="History"
        component={PlaceholderScreen}
        options={{ tabBarLabel: "History" }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanPlaceholderScreen}
        options={{
          tabBarLabel: "Scan",
          tabBarIcon: ({ focused }) => (
            <AnimatedIcon focused={focused}>
              <View
                style={[styles.scanButton, focused && styles.scanButtonFocused]}
              >
                <ScanLine size={28} color="#fff" strokeWidth={2} />
              </View>
            </AnimatedIcon>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            // Prevent default tab navigation
            e.preventDefault();
            // Navigate to stack screen instead
            navigation.navigate("VideoScanning");
          },
        }}
      />
      <Tab.Screen
        name="Articles"
        component={DiagnosisListScreen}
        options={{ tabBarLabel: "Diagnosis" }}
      />
      <Tab.Screen
        name="Profile"
        component={PlaceholderScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};

interface Styles {
  tabBar: ViewStyle;
  tabBarLabel: TextStyle;
  scanButton: ViewStyle;
  scanButtonFocused: ViewStyle;
  placeholderContainer: ViewStyle;
  placeholderIconContainer: ViewStyle;
  placeholderTitle: TextStyle;
  placeholderSubtitle: TextStyle;
  placeholderBadge: ViewStyle;
  placeholderBadgeText: TextStyle;
  scanActionButton: ViewStyle;
  scanActionButtonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 25 : 12,
    height: Platform.OS === "ios" ? 85 : 70,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -25,
    borderWidth: 4,
    borderColor: "#F5F5F0",
    shadowColor: "#4CAF50",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonFocused: {
    backgroundColor: "#2E7D32",
    shadowOpacity: 0.5,
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: "#F5F5F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  placeholderIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  placeholderBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  placeholderBadgeText: {
    color: "#FF9800",
    fontSize: 14,
    fontWeight: "500",
  },
  scanActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  scanActionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeTabNavigator;
