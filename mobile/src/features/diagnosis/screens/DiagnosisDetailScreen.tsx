import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { useDiagnosisDetail } from "../hooks/useDiagnosisDetail";
import type { TrackResult } from "../diagnosisTypes";

// ==========================================
// ICONS
// ==========================================

interface IconProps {
  size?: number;
  color?: string;
}

const BackIcon: React.FC<IconProps> = ({
  size = 20,
  color = "#111827",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 6L9 12L15 18"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const VideoIcon: React.FC<IconProps> = ({
  size = 20,
  color = "#6b7280",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="6"
      width="13"
      height="12"
      rx="2"
      stroke={color}
      strokeWidth="1.5"
    />
    <Path
      d="M16 10L21 7.5V16.5L16 14"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRightIcon: React.FC<IconProps> = ({
  size = 16,
  color = "#9ca3af",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 6L15 12L9 18"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SparkleIcon: React.FC<IconProps> = ({
  size = 16,
  color = "#111827",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3L13.6 9.4L20 11L13.6 12.6L12 19L10.4 12.6L4 11L10.4 9.4L12 3Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertIcon: React.FC<IconProps> = ({
  size = 20,
  color = "#dc2626",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3L22 20H2L12 3Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <Path
      d="M12 10V14"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <Circle cx="12" cy="17" r="0.9" fill={color} />
  </Svg>
);

// ==========================================
// ROUTE TYPE
// ==========================================

type DiagnosisDetailRoute = RouteProp<
  { DiagnosisDetail: { videoId: string } },
  "DiagnosisDetail"
>;

// ==========================================
// HELPERS
// ==========================================

const STORAGE_BASE = "https://your-cdn.example.com";

const resolveStorageUrl = (
  key: string | undefined | null,
): string | null => {
  if (!key) return null;
  if (key.startsWith("http")) return key;
  return `${STORAGE_BASE}/${key}`;
};

const prettifyLabel = (raw: string): string =>
  raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

interface EvidenceGroup {
  key: string;
  crop: string;
  condition: string;
  detections: TrackResult[];
  topConfidence: number;
  totalObservations: number;
  totalDuration: number;
  imageUrls: string[];
}

const groupIntoEvidence = (results: TrackResult[]): EvidenceGroup[] => {
  const map = new Map<string, EvidenceGroup>();

  results.forEach((r) => {
    const key = `${r.crop}__${r.condition}`;
    const existing = map.get(key);
    const url = resolveStorageUrl(r.evidenceKey);

    if (existing) {
      existing.detections.push(r);
      existing.topConfidence = Math.max(
        existing.topConfidence,
        r.confidence,
      );
      existing.totalObservations += r.observations ?? 0;
      existing.totalDuration += r.duration ?? 0;
      if (url) existing.imageUrls.push(url);
    } else {
      map.set(key, {
        key,
        crop: r.crop,
        condition: r.condition,
        detections: [r],
        topConfidence: r.confidence,
        totalObservations: r.observations ?? 0,
        totalDuration: r.duration ?? 0,
        imageUrls: url ? [url] : [],
      });
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => b.topConfidence - a.topConfidence,
  );
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ==========================================
// STACKED THUMBNAILS
// ==========================================

interface StackedThumbnailsProps {
  urls: string[];
  size?: number;
}

const MAX_VISIBLE = 3;
const STACK_OFFSET = 10;

const StackedThumbnails: React.FC<StackedThumbnailsProps> = ({
  urls,
  size = 48,
}) => {
  const visible = urls.slice(0, MAX_VISIBLE);
  const hasMore = urls.length > MAX_VISIBLE;
  const containerWidth = size + (visible.length - 1) * STACK_OFFSET;

  if (visible.length === 0) {
    return (
      <View
        style={[
          styles.stackContainer,
          { width: size, height: size },
        ]}
      >
        <View style={[styles.stackItem, { width: size, height: size }]}>
          <AlertIcon size={18} color="#dc2626" />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.stackContainer,
        { width: containerWidth, height: size },
      ]}
    >
      {visible.map((url, idx) => {
        const zIndex = visible.length - idx;
        const left = idx * STACK_OFFSET;

        return (
          <View
            key={`${url}-${idx}`}
            style={[
              styles.stackItem,
              {
                width: size,
                height: size,
                left,
                zIndex,
              },
            ]}
          >
            <Image
              source={{ uri: url }}
              style={styles.stackImage}
              resizeMode="cover"
            />
            {hasMore && idx === visible.length - 1 && (
              <View style={styles.stackMoreOverlay}>
                <Text style={styles.stackMoreText}>
                  +{urls.length - MAX_VISIBLE + 1}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

// ==========================================
// AI SUMMARY CARD
// ==========================================

interface AISummaryCardProps {
  evidenceGroups: EvidenceGroup[];
  hasResults: boolean;
}

const AISummaryCard: React.FC<AISummaryCardProps> = ({
  evidenceGroups,
  hasResults,
}) => {
  const totalDetections = evidenceGroups.reduce(
    (sum, g) => sum + g.detections.length,
    0,
  );

  const topGroup = evidenceGroups[0];

  return (
    <View style={styles.aiCard}>
      <View style={styles.aiHeader}>
        <View style={styles.aiIconWrap}>
          <SparkleIcon size={14} color="#111827" />
        </View>
        <Text style={styles.aiLabel}>AI Summary</Text>
      </View>

      {!hasResults ? (
        <View style={styles.aiSkeleton}>
          <View style={[styles.aiSkeletonLine, { width: "90%" }]} />
          <View style={[styles.aiSkeletonLine, { width: "70%" }]} />
          <View style={[styles.aiSkeletonLine, { width: "50%" }]} />
        </View>
      ) : (
        <Text style={styles.aiText}>
          {totalDetections} detection
          {totalDetections !== 1 ? "s" : ""} across{" "}
          {evidenceGroups.length} condition
          {evidenceGroups.length !== 1 ? "s" : ""}.
          {topGroup
            ? ` Most prominent: ${topGroup.condition} on ${prettifyLabel(
                topGroup.crop,
              )} at ${Math.round(topGroup.topConfidence * 100)}% confidence.`
            : ""}
        </Text>
      )}
    </View>
  );
};

// ==========================================
// EVIDENCE CARD
// ==========================================

interface EvidenceCardProps {
  group: EvidenceGroup;
  onPress: (group: EvidenceGroup) => void;
}

const EvidenceCard: React.FC<EvidenceCardProps> = ({
  group,
  onPress,
}) => {
  const count = group.detections.length;
  const confidence = Math.round(group.topConfidence * 100);

  return (
    <TouchableOpacity
      style={styles.evidenceCard}
      onPress={() => onPress(group)}
      activeOpacity={0.7}
    >
      <StackedThumbnails urls={group.imageUrls} size={44} />

      <View style={styles.evidenceContent}>
        <Text style={styles.evidenceTitle} numberOfLines={1}>
          {group.condition}
        </Text>

        <Text style={styles.evidenceCrop} numberOfLines={1}>
          {prettifyLabel(group.crop)}
        </Text>

        <View style={styles.evidenceMetaRow}>
          <Text style={styles.evidenceMeta}>
            {count} detection{count !== 1 ? "s" : ""}
          </Text>
          <View style={styles.evidenceDot} />
          <Text style={styles.evidenceConfidence}>{confidence}%</Text>
        </View>
      </View>

      <ChevronRightIcon size={16} />
    </TouchableOpacity>
  );
};

// ==========================================
// HEADER
// ==========================================

interface HeaderProps {
  onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
      style={styles.headerBackButton}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <BackIcon size={20} color="#111827" />
    </TouchableOpacity>

    <Text style={styles.headerTitle}>Diagnosis</Text>

    <View style={styles.headerSpacer} />
  </View>
);

// ==========================================
// SCREEN
// ==========================================

export const DiagnosisDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<DiagnosisDetailRoute>();
  const { videoId } = route.params;

  const { analysis, isLoading, isRefreshing, error, refresh } =
    useDiagnosisDetail(videoId);

  const evidenceGroups = useMemo(() => {
    if (!analysis?.results?.length) return [];
    return groupIntoEvidence(analysis.results);
  }, [analysis?.results]);

  const handleEvidencePress = useCallback(
    (group: EvidenceGroup) => {
      navigation.navigate("EvidencePreview", {
        crop: group.crop,
        condition: group.condition,
        detections: group.detections,
      });
    },
    [navigation],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (isLoading && !analysis) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header onBack={handleBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6b7280" />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !analysis) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header onBack={handleBack} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header onBack={handleBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor="#6b7280"
          />
        }
      >
        {/* Video */}
        <View style={styles.videoWrapper}>
          <View style={styles.videoPlaceholder}>
            <VideoIcon size={26} color="#9ca3af" />
            <Text style={styles.videoPlaceholderText}>
              Video player here
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle} numberOfLines={1}>
            Video #{analysis?.videoId?.slice(-6) || "—"}
          </Text>
          <Text style={styles.infoMeta}>
            {analysis?.createdAt ? formatDate(analysis.createdAt) : ""}
          </Text>
        </View>

        {/* AI Summary */}
        <View style={styles.section}>
          <AISummaryCard
            evidenceGroups={evidenceGroups}
            hasResults={evidenceGroups.length > 0}
          />
        </View>

        {/* Evidence */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Evidence</Text>
            <View style={styles.sectionCountContainer}>
              <Text style={styles.sectionCount}>
                {evidenceGroups.length}
              </Text>
            </View>
          </View>

          {evidenceGroups.length === 0 ? (
            <View style={styles.evidenceEmpty}>
              <Text style={styles.evidenceEmptyText}>
                No evidence detected for this video.
              </Text>
            </View>
          ) : (
            evidenceGroups.map((group) => (
              <EvidenceCard
                key={group.key}
                group={group}
                onPress={handleEvidencePress}
              />
            ))
          )}
        </View>
      </ScrollView>
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
  errorText: {
    fontSize: 14,
    color: "#dc2626",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  headerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },

  scrollContent: {
    paddingBottom: 32,
  },

  // Video
  videoWrapper: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  videoPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  videoPlaceholderText: {
    fontSize: 12,
    color: "#9ca3af",
  },

  // Info
  infoSection: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  infoMeta: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 3,
  },

  // Section
  section: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  sectionCountContainer: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
  },

  // AI Summary
  aiCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  aiIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    letterSpacing: 0.2,
  },
  aiText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
  },
  aiSkeleton: {
    gap: 6,
    paddingTop: 2,
  },
  aiSkeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e5e7eb",
  },

  // Evidence card
  evidenceCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    backgroundColor: "#ffffff",
    gap: 12,
  },
  evidenceContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  evidenceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  evidenceCrop: {
    fontSize: 12,
    color: "#6b7280",
  },
  evidenceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  evidenceMeta: {
    fontSize: 11,
    color: "#6b7280",
  },
  evidenceDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#d1d5db",
  },
  evidenceConfidence: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "600",
  },

  // Stacked thumbnails
  stackContainer: {
    position: "relative",
    flexShrink: 0,
  },
  stackItem: {
    position: "absolute",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  stackImage: {
    width: "100%",
    height: "100%",
  },
  stackMoreOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17, 24, 39, 0.01)",
    justifyContent: "center",
    alignItems: "center",
  },
  stackMoreText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },

  // Empty
  evidenceEmpty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  evidenceEmptyText: {
    fontSize: 13,
    color: "#9ca3af",
  },
});