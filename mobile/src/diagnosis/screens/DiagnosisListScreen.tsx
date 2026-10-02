import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useDiagnosisList } from "../hooks/useDiagnosisList";
import type { VideoAnalysis, TrackResult } from "../diagnosisTypes";

// ==========================================
// HELPERS
// ==========================================

const getTopFinding = (analysis: VideoAnalysis): TrackResult | null => {
  if (!analysis.results || analysis.results.length === 0) return null;
  return analysis.results.reduce((best, curr) =>
    curr.confidence > best.confidence ? curr : best,
  );
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// ==========================================
// DATE BUCKETS
// ==========================================

type DateBucket = "today" | "yesterday" | "last3Days" | "last7Days" | "older";

const BUCKET_ORDER: DateBucket[] = [
  "today",
  "yesterday",
  "last3Days",
  "last7Days",
  "older",
];

const BUCKET_LABELS: Record<DateBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last3Days: "Last 3 days",
  last7Days: "Last 7 days",
  older: "Older",
};

const getDateBucket = (dateString: string): DateBucket => {
  const date = new Date(dateString);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf3DaysAgo = startOfToday - 2 * 86400000;
  const startOf7DaysAgo = startOfToday - 6 * 86400000;

  const ts = date.getTime();

  if (ts >= startOfToday) return "today";
  if (ts >= startOfYesterday) return "yesterday";
  if (ts >= startOf3DaysAgo) return "last3Days";
  if (ts >= startOf7DaysAgo) return "last7Days";
  return "older";
};

// ==========================================
// FILTER CHIPS
// ==========================================

type FilterValue = "all" | DateBucket;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last3Days", label: "Last 3 days" },
  { value: "last7Days", label: "Last 7 days" },
];

interface FilterChipsProps {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ active, onChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.chipsContent}
  >
    {FILTERS.map((filter) => {
      const isActive = filter.value === active;
      return (
        <TouchableOpacity
          key={filter.value}
          onPress={() => onChange(filter.value)}
          activeOpacity={0.7}
          style={[styles.chip, isActive && styles.chipActive]}
        >
          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// ==========================================
// LIST ITEM
// ==========================================

interface DiagnosisItemProps {
  analysis: VideoAnalysis;
  onPress: (analysis: VideoAnalysis) => void;
}

const DiagnosisItem: React.FC<DiagnosisItemProps> = ({ analysis, onPress }) => {
  const rotation = useSharedValue(0);
  const status = analysis.video?.status ?? "processing";
  const topFinding = getTopFinding(analysis);
  const isProcessing = status === "processing" || status === "uploaded";

  React.useEffect(() => {
    if (isProcessing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }),
        -1,
        false,
      );
    }
  }, [isProcessing]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getStatusLabel = (): string => {
    switch (status) {
      case "pending_upload":
        return "Waiting to upload";
      case "uploaded":
        return "Queued for analysis";
      case "processing":
        return "Analyzing";
      case "completed":
        return topFinding
          ? `${topFinding.crop} · ${topFinding.condition}`
          : "Analysis complete";
      case "failed":
        return "Analysis failed";
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case "completed":
        return "#16a34a";
      case "failed":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => onPress(analysis)}
      activeOpacity={0.7}
    >
      <View style={styles.thumbnail}>
        <Text style={styles.thumbnailIcon}>🎬</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {analysis.video?.originalFileName || "Untitled video"}
        </Text>
        <View style={styles.subtitleRow}>
          <View
            style={[styles.statusDot, { backgroundColor: getStatusColor() }]}
          />
          <Text style={styles.subtitle} numberOfLines={1}>
            {getStatusLabel()}
          </Text>
        </View>
        <Text style={styles.meta}>{formatRelativeTime(analysis.createdAt)}</Text>
      </View>

      <View style={styles.trailing}>
        {isProcessing && (
          <Animated.Text style={[styles.spinner, spinnerStyle]}>
            ⟳
          </Animated.Text>
        )}
        {status === "completed" && topFinding && (
          <Text style={styles.percent}>
            {Math.round(topFinding.confidence * 100)}%
          </Text>
        )}
        {status === "failed" && <Text style={styles.failed}>!</Text>}
      </View>
    </TouchableOpacity>
  );
};

// ==========================================
// SECTION HEADER
// ==========================================

const SectionHeader: React.FC<{ title: string; count: number }> = ({
  title,
  count,
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionCount}>{count}</Text>
  </View>
);

// ==========================================
// EMPTY STATE
// ==========================================

interface EmptyStateProps {
  onRecord: () => void;
  hasFilter: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onRecord, hasFilter }) => (
  <View style={styles.empty}>
    <View style={styles.emptyIconContainer}>
      <Text style={styles.emptyIcon}>{hasFilter ? "🔍" : "🌱"}</Text>
    </View>
    <Text style={styles.emptyTitle}>
      {hasFilter ? "No results" : "No diagnoses yet"}
    </Text>
    <Text style={styles.emptyText}>
      {hasFilter
        ? "Try a different filter or record a new video."
        : "Record a short video of your crops to get started."}
    </Text>
    <TouchableOpacity
      style={styles.emptyButton}
      onPress={onRecord}
      activeOpacity={0.7}
    >
      <Text style={styles.emptyButtonText}>Record Video</Text>
    </TouchableOpacity>
  </View>
);

// ==========================================
// HEADER
// ==========================================

const Header: React.FC = () => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>Diagnoses</Text>
    <Text style={styles.headerSubtitle}>Your crop analysis history</Text>
  </View>
);

// ==========================================
// MAIN SCREEN
// ==========================================

export const DiagnosisListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { analyses, isLoading, isRefreshing, refresh, loadMore, hasMore } =
    useDiagnosisList();

  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleItemPress = (analysis: VideoAnalysis) => {
    navigation.navigate("DiagnosisDetail", { videoId: analysis.videoId });
  };

  const handleRecord = () => {
    navigation.getParent()?.navigate("VideoScanning");
  };

  // Build sections from filtered analyses
  const sections = useMemo(() => {
    const filtered =
      activeFilter === "all"
        ? analyses
        : analyses.filter((a) => getDateBucket(a.createdAt) === activeFilter);

    const grouped: Record<DateBucket, VideoAnalysis[]> = {
      today: [],
      yesterday: [],
      last3Days: [],
      last7Days: [],
      older: [],
    };

    filtered.forEach((analysis) => {
      grouped[getDateBucket(analysis.createdAt)].push(analysis);
    });

    return BUCKET_ORDER.filter((bucket) => grouped[bucket].length > 0).map(
      (bucket) => ({
        key: bucket,
        title: BUCKET_LABELS[bucket],
        data: grouped[bucket],
      }),
    );
  }, [analyses, activeFilter]);

  const hasFilter = activeFilter !== "all";

  if (isLoading && analyses.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header />
        <FilterChips active={activeFilter} onChange={setActiveFilter} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6b7280" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header />
      <FilterChips active={activeFilter} onChange={setActiveFilter} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <DiagnosisItem analysis={item} onPress={handleItemPress} />
        )}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} count={section.data.length} />
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={
          sections.length === 0 ? styles.listEmpty : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor="#6b7280"
          />
        }
        onEndReached={hasMore && activeFilter === "all" ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState onRecord={handleRecord} hasFilter={hasFilter} />
        }
        ListFooterComponent={
          hasMore && activeFilter === "all" ? (
            <View style={styles.footer}>
              <ActivityIndicator color="#6b7280" />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },

  // Chips
  chipsContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  chipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9ca3af",
  },

  // List
  list: {
    paddingBottom: 24,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginLeft: 76,
  },

  // Item
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    gap: 14,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailIcon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    flex: 1,
  },
  meta: {
    fontSize: 12,
    color: "#9ca3af",
  },
  trailing: {
    width: 44,
    alignItems: "flex-end",
  },
  spinner: {
    fontSize: 18,
    color: "#6b7280",
  },
  percent: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16a34a",
  },
  failed: {
    fontSize: 15,
    fontWeight: "700",
    color: "#dc2626",
  },

  // Empty
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Footer
  footer: {
    paddingVertical: 20,
  },
});