import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
import { Skeleton } from "../../../components/ui/SkeletonComponent";

export interface WeatherData {
  location: string;
  temperatureC: number;
  condition: string;
  /** ISO timestamp of the reading, if the source provides one. */
  observedAt?: string;
  humidityPct?: number;
  precipitationPct?: number;
  windKph?: number;
}

export type WeatherState =
  | { status: "loading" }
  | { status: "unavailable"; location?: string; message?: string }
  | { status: "ready"; data: WeatherData };

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

const CardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LinearGradient
    colors={[colors.olive, colors.forest]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.card}
  >
    {children}
  </LinearGradient>
);

/**
 * Weather summary card.
 *
 * The component intentionally supports an explicit loading and unavailable
 * state: SIPAT has no configured weather provider yet, so the dashboard shows
 * an honest "unavailable" card instead of inventing readings.
 */
export const WeatherSummaryCard: React.FC<Props> = ({ state, onRetry }) => {
  if (state.status === "loading") {
    return (
      <CardShell>
        <View style={styles.locationRow}>
          <MapPin size={15} color={colors.textOnDark} strokeWidth={1.8} />
          <Skeleton
            width={120}
            height={12}
            borderRadius={6}
            style={styles.skeletonOnDark}
          />
        </View>

        <View style={styles.mainRow}>
          <View style={styles.mainLeft}>
            <Skeleton
              width={104}
              height={44}
              borderRadius={10}
              style={styles.skeletonOnDark}
            />
            <Skeleton
              width={140}
              height={12}
              borderRadius={6}
              style={styles.skeletonOnDarkSpaced}
            />
          </View>
          <Skeleton
            width={56}
            height={56}
            borderRadius={28}
            style={styles.skeletonOnDark}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.metricsRow}>
          {[0, 1, 2].map((key) => (
            <View key={key} style={styles.metric}>
              <Skeleton
                width={44}
                height={10}
                borderRadius={5}
                style={styles.skeletonOnDark}
              />
              <Skeleton
                width={56}
                height={12}
                borderRadius={6}
                style={styles.skeletonOnDarkSpaced}
              />
            </View>
          ))}
        </View>
      </CardShell>
    );
  }

  if (state.status === "unavailable") {
    return (
      <CardShell>
        <View style={styles.unavailable}>
          <View style={styles.unavailableIcon}>
            <CloudOff size={22} color={colors.lime} strokeWidth={1.8} />
          </View>

          <View style={styles.unavailableText}>
            <Text style={styles.unavailableTitle}>Weather unavailable</Text>
            <Text style={styles.unavailableBody}>
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
              style={({ pressed }) => [
                styles.retry,
                pressed && styles.retryPressed,
              ]}
            >
              <RefreshCw size={16} color={colors.textOnDark} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      </CardShell>
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
    <CardShell>
      <View style={styles.locationRow}>
        <MapPin size={15} color={colors.lime} strokeWidth={1.8} />
        <Text style={styles.location} numberOfLines={1}>
          {data.location}
        </Text>
      </View>

      <View style={styles.mainRow}>
        <View style={styles.mainLeft}>
          <Text style={styles.temperature} allowFontScaling={false}>
            {Math.round(data.temperatureC)}°
          </Text>
          <Text style={styles.condition} numberOfLines={1}>
            {data.condition}
          </Text>
          {updated ? <Text style={styles.updated}>{updated}</Text> : null}
        </View>

        <ConditionIcon size={60} color={colors.textOnDark} strokeWidth={1.3} />
      </View>

      {metrics.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.metricsRow}>
            {metrics.map(({ label, value, Icon }) => (
              <View key={label} style={styles.metric}>
                <View style={styles.metricLabelRow}>
                  <Icon size={13} color={colors.lime} strokeWidth={2} />
                  <Text style={styles.metricLabel}>{label}</Text>
                </View>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </CardShell>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xl,
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: "hidden",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 20,
  },
  location: {
    flex: 1,
    color: colors.textOnDark,
    fontSize: 13,
    fontWeight: "600",
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  mainLeft: {
    flex: 1,
  },
  temperature: {
    color: colors.textOnDark,
    fontSize: 48,
    fontWeight: "400",
    letterSpacing: -1,
    lineHeight: 54,
  },
  condition: {
    color: colors.textOnDark,
    fontSize: 14,
    opacity: 0.95,
    marginTop: spacing.xs,
  },
  updated: {
    color: colors.textOnDark,
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    marginVertical: spacing.lg,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
  },
  metricLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metricLabel: {
    color: colors.textOnDark,
    fontSize: 11,
    opacity: 0.75,
  },
  metricValue: {
    color: colors.textOnDark,
    fontSize: 14,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  skeletonOnDark: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  skeletonOnDarkSpaced: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    marginTop: spacing.sm,
  },
  unavailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  unavailableIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: "rgba(134, 198, 83, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  unavailableText: {
    flex: 1,
  },
  unavailableTitle: {
    color: colors.textOnDark,
    fontSize: 15,
    fontWeight: "700",
  },
  unavailableBody: {
    color: colors.textOnDark,
    fontSize: 12,
    opacity: 0.78,
    marginTop: 3,
    lineHeight: 17,
  },
  retry: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  retryPressed: {
    opacity: 0.7,
  },
});
