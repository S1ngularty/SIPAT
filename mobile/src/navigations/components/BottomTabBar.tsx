import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs";
import {
  History,
  Home,
  Microscope,
  ScanLine,
  User,
  type LucideIcon,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, radii, spacing } from "../../theme";

type TabItemConfig = {
  name: string;
  /** Used for the accessibility label — the bar is icon-only. */
  label: string;
  Icon: LucideIcon;
};

/**
 * Destinations rendered by the custom tab bar. The `Scan` entry is the center
 * action: it opens the stack-level recording flow rather than switching to its
 * own tab screen.
 */
const TAB_ITEMS: TabItemConfig[] = [
  { name: "Home", label: "Home", Icon: Home },
  { name: "Diagnoses", label: "Diagnoses", Icon: Microscope },
  { name: "Scan", label: "Scan", Icon: ScanLine },
  { name: "History", label: "History", Icon: History },
  { name: "Profile", label: "Profile", Icon: User },
];

const CENTER_TAB = "Scan";

const ICON_SIZE = 22;
/** Slim outline weight, marginally heavier when the destination is selected. */
const ICON_STROKE = 1.3;
const ICON_STROKE_ACTIVE = 1.9;

const ITEM_HEIGHT = 44;
const INDICATOR_INSET = -6;
const INDICATOR_V_INSET = -5;
const SLIDE_DURATION = 240;

/**
 * Dark oblong, icon-only bottom navigation.
 *
 * A single dark stadium is split into five destinations. One white-opacity
 * capsule slides between them to mark the selected destination, staying inside
 * the bar. Unselected icons are slim white outlines; the selected one turns
 * green. There are no visible labels, so every destination keeps a descriptive
 * accessibility label.
 *
 * Heights are reported through `BottomTabBarHeightCallbackContext` so screens
 * can pad their scroll content and never sit underneath the bar.
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
  insets,
}) => {
  const onHeightChange = React.useContext(BottomTabBarHeightCallbackContext);

  const [rowWidth, setRowWidth] = React.useState(0);
  const segmentWidth = rowWidth > 0 ? rowWidth / state.routes.length : 0;

  const indicatorX = useSharedValue(0);

  React.useEffect(() => {
    if (segmentWidth === 0) return;
    indicatorX.value = withTiming(state.index * segmentWidth, {
      duration: SLIDE_DURATION,
    });
  }, [state.index, segmentWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleLayout = (event: {
    nativeEvent: { layout: { height: number } };
  }) => {
    onHeightChange?.(event.nativeEvent.layout.height);
  };

  const handlePress = (routeName: string, routeKey: string, focused: boolean) => {
    // The center action always launches the recording flow instead of a tab.
    if (routeName === CENTER_TAB) {
      navigation.getParent()?.navigate("VideoScanning" as never);
      return;
    }

    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName as never);
    }
  };

  const handleLongPress = (routeKey: string) => {
    navigation.emit({ type: "tabLongPress", target: routeKey });
  };

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      onLayout={handleLayout}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        <View
          style={styles.row}
          onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
        >
          {segmentWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                { width: segmentWidth - INDICATOR_INSET * 2 },
                indicatorStyle,
              ]}
            />
          ) : null}

          {state.routes.map((route, index) => {
            const config = TAB_ITEMS.find((item) => item.name === route.name);
            if (!config) return null;

            const focused = state.index === index;
            const isCenter = route.name === CENTER_TAB;

            return (
              <Pressable
                key={route.key}
                onPress={() => handlePress(route.name, route.key, focused)}
                onLongPress={() => handleLongPress(route.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={
                  isCenter ? "Start a new diagnosis" : config.label
                }
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              >
                <config.Icon
                  size={ICON_SIZE}
                  color={focused ? colors.lime : colors.textOnDark}
                  strokeWidth={focused ? ICON_STROKE_ACTIVE : ICON_STROKE}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
  },
  bar: {
    minHeight: ITEM_HEIGHT + spacing.sm * 2,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.charcoal,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  indicator: {
    position: "absolute",
    left: INDICATOR_INSET,
    top: INDICATOR_V_INSET,
    bottom: INDICATOR_V_INSET,
    borderRadius: radii.pill,
    backgroundColor: colors.capsuleOnDark,
  },
  item: {
    flex: 1,
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
