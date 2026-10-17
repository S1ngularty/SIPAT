import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  CloudOff,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCw,
  Sun,
  Wind,
} from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";
import type { WeatherState } from "../weather";

type Props = {
  state: WeatherState;
  onRetry?: () => void;
};

const getConditionIcon = (condition: string) => {
  const value = condition.toLowerCase();
  if (value.includes("rain") || value.includes("shower")) return CloudRain;
  if (value.includes("cloud") || value.includes("overcast")) return CloudSun;
  return Sun;
};

const formatObservedAt = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return "Updated just now";
  if (diffMins < 60) return `Updated ${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Updated ${diffHours}h ago`;

  return `Updated ${date.toLocaleDateString()}`;
};

const SkeletonLine: React.FC<{ width: number | `${number}%`; height: number }> = ({
  width,
  height,
}) => (
  <View
    style={[styles.skeleton, { width, height, borderRadius: height / 2 }]}
  />
);

/**
 * Weather block for the home hero sheet.
 *
 * Rendered on top of photography, so it stays a slim hairline outline rather
 * than a solid card. Supports an explicit loading and unavailable state: SIPAT
 * has no configured weather provider yet, so the dashboard shows an honest
 * "unavailable" block instead of inventing readings.
 */
export const WeatherBlock: React.FC<Props> = ({ state, onRetry }) => {
  if (state.status === "loading") {
    return (
      <View style={styles.block}>
        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.lime} strokeWidth={1.8} />
          <SkeletonLine width={120} height={11} />
        </View>

        <View style={styles.mainRow}>
          <View style={styles.mainLeft}>
            <SkeletonLine width={92} height={30} />
            <SkeletonLine width={132} height={11} />
          </View>
          <ActivityIndicator size="small" color={colors.lime} />
        </View>
      </View>
    );
  }

  if (state.status === "unavailable") {
    return (
      <View style={styles.block}>
        <View style={styles.unavailableRow}>
          <View style={styles.unavailableIcon}>
            <CloudOff size={18} color={colors.lime} strokeWidth={1.8} />
          </View>

          <View style={styles.unavailableText}>
            <Text style={styles.unavailableTitle}>Weather unavailable</Text>
            <Text style={styles.unavailableBody} numberOfLines={2}>
              {state.message ??
                "Local conditions can't be shown right now. This won't affect your crop diagnosis."}
            </Text>
          </View>

          {onRetry ? (
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry weather"
              hitSlop={8}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            >
              <RefreshCw size={15} color={colors.textOnDark} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const { data } = state;
  const ConditionIcon = getConditionIcon(data.condition);
  const updated = formatObservedAt(data.observedAt);

  const metrics: { label: string; value: string; Icon: typeof Droplets }[] = [];
  if (data.humidityPct !== undefined) {
    metrics.push({
      label: "Humidity",
      value: `${Math.round(data.humidityPct)}%`,
      Icon: Droplets,
    });
  }
  if (data.precipitationPct !== undefined) {
    metrics.push({
      label: "Rain",
      value: `${Math.round(data.precipitationPct)}%`,
      Icon: CloudRain,
    });
  }
  if (data.windKph !== undefined) {
    metrics.push({
      label: "Wind",
      value: `${Math.round(data.windKph)} km/h`,
      Icon: Wind,
    });
  }

  return (
    <View style={styles.block}>
      <View style={styles.locationRow}>
        <MapPin size={14} color={colors.lime} strokeWidth={1.8} />
        <Text style={styles.location} numberOfLines={1}>
          {data.location}
        </Text>
        {updated ? (
          <Text style={styles.updated} numberOfLines={1}>
            {updated}
          </Text>
        ) : null}
      </View>

      <View style={styles.mainRow}>
        <Text style={styles.temperature} allowFontScaling={false}>
          {Math.round(data.temperatureC)}°
        </Text>
        <View style={styles.conditionWrap}>
          <ConditionIcon size={20} color={colors.textOnDark} strokeWidth={1.6} />
          <Text style={styles.condition} numberOfLines={1}>
            {data.condition}
          </Text>
        </View>
      </View>

      {metrics.length > 0 ? (
        <View style={styles.metricsRow}>
          {metrics.map(({ label, value, Icon }) => (
            <View key={label} style={styles.metric}>
              <Icon size={12} color={colors.lime} strokeWidth={2} />
              <Text style={styles.metricText} numberOfLines={1}>
                {label} {value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    borderWidth: 1,
    borderColor: colors.outlineOnDark,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 18,
  },
  location: {
    flex: 1,
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: "600",
  },
  updated: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  mainLeft: {
    gap: spacing.xs,
  },
  temperature: {
    color: colors.textOnDark,
    fontSize: 34,
    fontWeight: "300",
    letterSpacing: -1,
    lineHeight: 38,
  },
  conditionWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  condition: {
    flex: 1,
    color: colors.textOnDark,
    fontSize: 13,
    opacity: 0.92,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineOnDark,
    paddingTop: spacing.sm,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metricText: {
    color: colors.textOnDark,
    fontSize: 11,
    opacity: 0.85,
  },
  skeleton: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  unavailableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  unavailableIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineOnDark,
    alignItems: "center",
    justifyContent: "center",
  },
  unavailableText: {
    flex: 1,
  },
  unavailableTitle: {
    color: colors.textOnDark,
    fontSize: 13,
    fontWeight: "700",
  },
  unavailableBody: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  retry: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineOnDark,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
