import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import LottieView from "lottie-react-native";

/**
 * Matches the native splash screen background in app.json so the hand-off from
 * the native splash to this React view is invisible.
 */
const SPLASH_BACKGROUND = "#27AE78";

/**
 * Startup should not depend on an unbounded network call. If Clerk has not
 * finished initializing by then, leave the splash so the app is never stuck.
 */
const STARTUP_TIMEOUT_MS = 12_000;

/**
 * The Lottie source is ~1.87s long and plays at 2x. This fallback only exists
 * so a missing animation-completion callback can never trap the user on the
 * splash screen.
 */
const LOTTIE_FALLBACK_MS = 2_200;

type AnimatedSplashScreenProps = {
  /** True once Clerk has finished restoring the session. */
  isAppReady: boolean;
  /** Called after the splash has faded out and can be unmounted. */
  onFinish: () => void;
};

export default function AnimatedSplashScreen({
  isAppReady,
  onFinish,
}: AnimatedSplashScreenProps) {
  const logoOpacity = useRef(new Animated.Value(0.25)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyOffset = useRef(new Animated.Value(12)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const [introFinished, setIntroFinished] = useState(false);
  const [lottieFinished, setLottieFinished] = useState(false);
  const [startupTimedOut, setStartupTimedOut] = useState(false);
  const hasHiddenNativeSplash = useRef(false);
  const hasStartedExit = useRef(false);

  /**
   * The native splash is only hidden once this view has been laid out, which
   * guarantees the animated splash is already on screen underneath it.
   */
  const handleLayout = useCallback(() => {
    if (hasHiddenNativeSplash.current) {
      return;
    }
    hasHiddenNativeSplash.current = true;
    SplashScreen.hideAsync().catch((error) => {
      console.warn("SIPAT: unable to hide the native splash screen.", error);
    });
  }, []);

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(copyOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(copyOffset, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    intro.start(({ finished }) => {
      if (finished) {
        setIntroFinished(true);
      }
    });

    return () => intro.stop();
  }, [copyOffset, copyOpacity, logoOpacity, logoScale]);

  const handleLottieFinish = useCallback(() => {
    setLottieFinished(true);
  }, []);

  const handleLottieFailure = useCallback((error: string) => {
    console.warn("SIPAT: splash animation failed to load.", error);
    setLottieFinished(true);
  }, []);

  useEffect(() => {
    if (lottieFinished) {
      return;
    }

    const timeout = setTimeout(() => {
      console.warn(
        "SIPAT: splash animation did not report completion; continuing.",
      );
      setLottieFinished(true);
    }, LOTTIE_FALLBACK_MS);

    return () => clearTimeout(timeout);
  }, [lottieFinished]);

  useEffect(() => {
    if (isAppReady) {
      return;
    }

    const timeout = setTimeout(() => {
      console.warn(
        "SIPAT: startup initialization timed out; continuing without blocking the splash screen.",
      );
      setStartupTimedOut(true);
    }, STARTUP_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isAppReady]);

  const canExit =
    introFinished && lottieFinished && (isAppReady || startupTimedOut);

  useEffect(() => {
    if (!canExit || hasStartedExit.current) {
      return;
    }
    hasStartedExit.current = true;

    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // Unmount even if the fade was interrupted, so the user is never left
      // looking at the splash after initialization has completed.
      onFinish();
    });
  }, [canExit, onFinish, screenOpacity]);

  return (
    <Animated.View
      style={[styles.container, { opacity: screenOpacity }]}
      onLayout={handleLayout}
    >
      <StatusBar style="light" />

      <Animated.View
        accessible
        accessibilityRole="image"
        accessibilityLabel="SIPAT logo"
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <LottieView
          // Splash-specific copy of the SIPAT mark: the original animation
          // draws in green, which disappears on the green splash background.
          source={require("../../assets/animations/sipat-icon-splash.json")}
          style={styles.lottie}
          resizeMode="contain"
          autoPlay
          loop={false}
          speed={1}
          onAnimationFinish={handleLottieFinish}
          onAnimationFailure={handleLottieFailure}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.copy,
          {
            opacity: copyOpacity,
            transform: [{ translateY: copyOffset }],
          },
        ]}
      >
        <Text style={styles.name}>SIPAT</Text>
        <Text style={styles.tagline}>
          Crop disease &amp; pest identification
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logo: {
    // The final Lottie mark fills about 57% of its 92x92 viewBox, so a 280dp
    // box renders the visible logo at ~160dp, matching the native splash.
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
  copy: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    marginTop: 108,
    alignItems: "center",
  },
  name: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
  },
  tagline: {
    color: "rgba(255, 255, 255, 0.84)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
    marginTop: 6,
    textAlign: "center",
  },
});
