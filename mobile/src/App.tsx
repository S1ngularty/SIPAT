import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import * as SplashScreen from "expo-splash-screen";
import RootNavigator from "./navigations/RootNavigation";
import AnimatedSplashScreen from "./components/AnimatedSplashScreen";
import { toastConfig } from "./helper/toast";
import Toast from "react-native-toast-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

// Keep the native splash visible while the JS bundle boots. The custom splash
// is rendered underneath it and hides it only after its first layout pass.
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn("SIPAT: unable to keep the native splash screen visible.", error);
});

function AppContent() {
  const { isLoaded } = useAuth();
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setIsSplashVisible(false);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <RootNavigator />
      {isSplashVisible ? (
        <AnimatedSplashScreen
          isAppReady={isLoaded}
          onFinish={handleSplashFinish}
        />
      ) : null}
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AppContent />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
