import React, { useCallback, useEffect, useState } from "react";
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
import { useNetwork } from "../network/NetworkProvider";
import { OFFLINE_ROUTE_NAMES } from "./offlineRoutes";

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

/**
 * Root guard for limited/offline mode: whenever a connection is lost, any
 * online-only screen is replaced by the Home tab (see `offlineRoutes`).
 */
export default function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isOffline } = useNetwork();
  const navigationRef = useNavigationContainerRef<ParamListBase>();
  const [statusBarStyle, setStatusBarStyle] = useState<"light" | "dark">("dark");

  // Once the app has rendered either the signed-in or the limited experience,
  // keep navigation mounted while Clerk catches up after reconnecting. Without
  // this the navigator would blank out between "offline" and "Clerk loaded".
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  useEffect(() => {
    if (isLoaded || isOffline) setHasBootstrapped(true);
  }, [isLoaded, isOffline]);

  const syncStatusBar = useCallback(() => {
    const route = navigationRef.getCurrentRoute();
    setStatusBarStyle(
      route && DARK_SURFACE_ROUTES.has(route.name) ? "light" : "dark",
    );
  }, [navigationRef]);

  /**
   * Pops any online-only screen and lands on the Home tab. Resetting (instead
   * of navigating) also clears the back stack, so the hardware back button
   * cannot return to a screen that needs a connection.
   */
  const goToOfflineHome = useCallback(() => {
    if (!navigationRef.isReady()) return;

    const route = navigationRef.getCurrentRoute();
    if (route && OFFLINE_ROUTE_NAMES.has(route.name)) return;

    navigationRef.reset({
      index: 0,
      routes: [{ name: "User" }],
    });
  }, [navigationRef]);

  useEffect(() => {
    if (isOffline) goToOfflineHome();
  }, [isOffline, goToOfflineHome]);

  const handleNavigationChange = useCallback(() => {
    syncStatusBar();
    if (isOffline) goToOfflineHome();
  }, [syncStatusBar, isOffline, goToOfflineHome]);

  if (!hasBootstrapped && !isOffline && !isLoaded) {
    return <StatusBar style={statusBarStyle} animated />;
  }

  /**
   * Offline is a limited, guest-capable mode: the guide screens do not need a
   * Clerk session, so an offline cold start goes straight to Home instead of
   * an auth screen that cannot reach the network. As soon as connectivity is
   * back, Clerk takes over again.
   */
  const showUserExperience = isOffline || isSignedIn || !isLoaded;

  console.log("Is signedIn?:", isSignedIn, "Is offline?:", isOffline);
  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={handleNavigationChange}
        onStateChange={handleNavigationChange}
      >
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {showUserExperience ? (
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
