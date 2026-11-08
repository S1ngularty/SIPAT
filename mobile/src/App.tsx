import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { AppBootstrap } from "./components/boot/AppBootstrap";
import { toastConfig } from "./helper/toast";
import { SpeechProvider } from "./modules/speech-recognition";
import RootNavigator from "./navigations/RootNavigation";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SpeechProvider>
            <AppBootstrap>
              <RootNavigator />
              <Toast config={toastConfig} />
            </AppBootstrap>
          </SpeechProvider>
        </GestureHandlerRootView>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
