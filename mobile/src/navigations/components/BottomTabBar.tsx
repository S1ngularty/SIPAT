import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs";
import {
  History,
  Home,
  Microscope,
  Plus,
  User,
  type LucideIcon,
} from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";

type TabItemConfig = {
  name: string;
  label: string;
  Icon: LucideIcon;
};

/**
 * Destinations rendered by the custom tab bar. The `Scan` entry is treated as
 * the emphasized center action and opens the stack-level recording flow rather
 * than switching to its own tab screen.
 */
const TAB_ITEMS: TabItemConfig[] = [
  { name: "Home", label: "Home", Icon: Home },
  { name: "Diagnoses", label: "Diagnoses", Icon: Microscope },
  { name: "Scan", label: "Scan", Icon: Plus },
  { name: "History", label: "History", Icon: History },
  { name: "Profile", label: "Profile", Icon: User },
];

const CENTER_TAB = "Scan";

/**
 * Dark-green floating bottom navigation with a lime center action.
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
        {state.routes.map((route, index) => {
          const config = TAB_ITEMS.find((item) => item.name === route.name);
          if (!config) return null;

          const focused = state.index === index;
          const isCenter = route.name === CENTER_TAB;

          if (isCenter) {
            return (
              <Pressable
                key={route.key}
                onPress={() => handlePress(route.name, route.key, focused)}
                onLongPress={() => handleLongPress(route.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel="Start a new diagnosis"
                style={({ pressed }) => [styles.centerItem, pressed && styles.pressed]}
              >
                <View style={styles.centerCircle}>
                  <config.Icon
                    size={26}
                    color={colors.forest}
                    strokeWidth={2.4}
                  />
                </View>
                <Text style={[styles.label, styles.centerLabel]} numberOfLines={1}>
                  {config.label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={() => handlePress(route.name, route.key, focused)}
              onLongPress={() => handleLongPress(route.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={config.label}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <config.Icon
                size={22}
                color={focused ? colors.lime : colors.textOnDark}
                strokeWidth={focused ? 2.4 : 1.6}
                style={focused ? undefined : styles.inactiveIcon}
              />
              <Text
                style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
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
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.forest,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  centerItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    borderWidth: 4,
    borderColor: colors.forest,
  },
  centerLabel: {
    color: colors.lime,
    fontWeight: "700",
  },
  inactiveIcon: {
    opacity: 0.6,
  },
  label: {
    fontSize: 10,
  },
  labelActive: {
    color: colors.lime,
    fontWeight: "700",
  },
  labelInactive: {
    color: colors.textOnDark,
    opacity: 0.6,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.7,
  },
});
