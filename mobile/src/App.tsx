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
import { NetworkProvider, useNetwork } from "./network/NetworkProvider";
import { LanguageProvider } from "./modules/language/LanguageProvider";
import { initDatabase } from "./database/schema";
import { VideoSyncProvider } from "./features/scan/VideoSyncProvider";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

// Keep the native splash visible while the JS bundle boots. The custom splash
// is rendered underneath it and hides it only after its first layout pass.
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn(
    "SIPAT: unable to keep the native splash screen visible.",
    error,
  );
});

function AppContent() {
  const { isLoaded } = useAuth();
  const { isOffline, isInitialized } = useNetwork();
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  const handleSplashFinish = useCallback(async() => {
    await initDatabase();
    setIsSplashVisible(false);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <VideoSyncProvider>
        <RootNavigator />
      </VideoSyncProvider>
      {isSplashVisible ? (
        <AnimatedSplashScreen
          // Offline cold starts never finish Clerk's network bootstrap. Let the
          // limited experience in instead of holding the splash forever. The
          // NetInfo reading is awaited too so online-only UI never flashes
          // before the first offline detection.
          isAppReady={(isLoaded && isInitialized) || isOffline}
          onFinish={handleSplashFinish}
        />
      ) : null}
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <NetworkProvider>
      <LanguageProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <AppContent />
        </ClerkProvider>
      </LanguageProvider>
    </NetworkProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
