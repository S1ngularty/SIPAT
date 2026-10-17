import React, { useCallback, useState } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
  type ParamListBase,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@clerk/expo";
import AuthNavigator from "./AuthStackNavigation";
import UserNavigation from "./UserNavigation";

export type RootStackParamList = { Auth: undefined; User: undefined };

const RootStack = createNativeStackNavigator<RootStackParamList>();

/**
 * Routes whose screen paints a dark surface behind the status bar. Every other
 * screen in SIPAT uses a light background, so the status bar defaults to dark
 * icons.
 *
 * This is resolved from the navigation state rather than from per-screen
 * `<StatusBar>` components: pushed screens stay mounted, so a screen level
 * status bar would keep overriding the bar after the user navigates away.
 */
const DARK_SURFACE_ROUTES: ReadonlySet<string> = new Set(["VideoScanning"]);

export default function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigationRef = useNavigationContainerRef<ParamListBase>();
  const [statusBarStyle, setStatusBarStyle] = useState<"light" | "dark">("dark");

  const syncStatusBar = useCallback(() => {
    const route = navigationRef.getCurrentRoute();
    setStatusBarStyle(
      route && DARK_SURFACE_ROUTES.has(route.name) ? "light" : "dark",
    );
  }, [navigationRef]);

  if (!isLoaded) {
    return <StatusBar style={statusBarStyle} animated />;
  }

  console.log("Is signedIn?:", isSignedIn);
  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={syncStatusBar}
        onStateChange={syncStatusBar}
      >
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {isSignedIn ? (
            <RootStack.Screen name="User" component={UserNavigation} />
          ) : (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>

      <StatusBar style={statusBarStyle} animated />
    </>
  );
}
