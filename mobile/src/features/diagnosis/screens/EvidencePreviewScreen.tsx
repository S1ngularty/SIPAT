import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import Svg, { Path, Circle } from "react-native-svg";

import { useEvidencePreview } from "../hooks/useEvidencePreview";
import type { TrackResult } from "../diagnosisTypes";

// ==========================================
// ICONS
// ==========================================

interface IconProps {
  size?: number;
  color?: string;
}

const BackIcon: React.FC<IconProps> = ({ size = 20, color = "#111827" }) => (
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

const ChevronLeftIcon: React.FC<IconProps> = ({
  size = 16,
  color = "#9ca3af",
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

const AlertIcon: React.FC<IconProps> = ({ size = 20, color = "#dc2626" }) => (
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

type EvidencePreviewRoute = RouteProp<
  {
    EvidencePreview: {
      crop: string;
      condition: string;
      detections: TrackResult[];
    };
  },
  "EvidencePreview"
>;

// ==========================================
// HELPERS
// ==========================================

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GALLERY_WIDTH = SCREEN_WIDTH - 36;
const GALLERY_HEIGHT = Math.round(GALLERY_WIDTH * 0.72);

const prettifyLabel = (raw: string): string =>
  raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

    <Text style={styles.headerTitle}>Evidence Preview</Text>

    <View style={styles.headerSpacer} />
  </View>
);

// ==========================================
// GALLERY
// ==========================================

interface GalleryProps {
  urls: string[];
}

const Gallery: React.FC<GalleryProps> = ({ urls }) => {
  const [index, setIndex] = useState(0);

  if (urls.length === 0) {
    return (
      <View style={styles.galleryEmpty}>
        <AlertIcon size={22} color="#dc2626" />
        <Text style={styles.galleryEmptyText}>
          No captured frames available
        </Text>
      </View>
    );
  }

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / GALLERY_WIDTH);
    if (next !== index) setIndex(next);
  };

  return (
    <View>
      <FlatList
        data={urls}
        keyExtractor={(url, idx) => `${url}-${idx}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={{ width: GALLERY_WIDTH, paddingHorizontal: 0 }}>
            <Image
              source={{ uri: item }}
              style={styles.galleryImage}
              resizeMode="cover"
            />
          </View>
        )}
      />

      {urls.length > 1 && (
        <View style={styles.galleryDots}>
          {urls.map((_, i) => (
            <View
              key={i}
              style={[
                styles.galleryDot,
                i === index && styles.galleryDotActive,
              ]}
            />
          ))}
        </View>
      )}

      {urls.length > 1 && (
        <View style={styles.galleryCounter}>
          <Text style={styles.galleryCounterText}>
            {index + 1} / {urls.length}
          </Text>
        </View>
      )}
    </View>
  );
};

// ==========================================
// LIST BLOCK
// ==========================================

interface ListBlockProps {
  title: string;
  items?: string[];
}

const ListBlock: React.FC<ListBlockProps> = ({ title, items }) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {items.map((item, idx) => (
        <View key={idx} style={styles.bulletRow}>
          <View style={styles.bullet} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
};

// ==========================================
// SCREEN
// ==========================================

export const EvidencePreviewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<EvidencePreviewRoute>();
  const { crop, condition, detections } = route.params;

  const { diseaseInfo, isLoading } = useEvidencePreview(crop, condition);

  const handleBack = () => navigation.goBack();

  const imageUrls = useMemo(
    () =>
      detections
        .map((d) => d.evidenceUrl)
        .filter((u): u is string => !!u),
    [detections],
  );

  const topConfidence = useMemo(
    () =>
      detections.reduce((best, d) => Math.max(best, d.confidence), 0),
    [detections],
  );

  const totalObservations = useMemo(
    () =>
      detections.reduce((sum, d) => sum + (d.observations ?? 0), 0),
    [detections],
  );

  const totalDuration = useMemo(
    () => detections.reduce((sum, d) => sum + (d.duration ?? 0), 0),
    [detections],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header onBack={handleBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.conditionLabel} numberOfLines={2}>
            {condition}
          </Text>
          <Text style={styles.cropLabel}>{prettifyLabel(crop)}</Text>
        </View>

        {/* Gallery */}
        <View style={styles.galleryWrapper}>
          <Gallery urls={imageUrls} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>
              {detections.length} detection
              {detections.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>
              {Math.round(topConfidence * 100)}% top
            </Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>
              {totalObservations} obs
            </Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillText}>
              {totalDuration.toFixed(1)}s
            </Text>
          </View>
        </View>

        {/* Disease info */}
        {isLoading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this condition</Text>
            <View style={styles.skeleton}>
              <View style={[styles.skeletonLine, { width: "92%" }]} />
              <View style={[styles.skeletonLine, { width: "78%" }]} />
              <View style={[styles.skeletonLine, { width: "64%" }]} />
            </View>
          </View>
        ) : diseaseInfo ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this condition</Text>

            {diseaseInfo.description ? (
              <Text style={styles.description}>
                {diseaseInfo.description}
              </Text>
            ) : null}

            <ListBlock title="Symptoms" items={diseaseInfo.symptoms} />
            <ListBlock title="Prevention" items={diseaseInfo.prevention} />
            <ListBlock title="Treatment" items={diseaseInfo.treatment} />
          </View>
        ) : null}

        {/* Detections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Detections</Text>
            <View style={styles.sectionCountContainer}>
              <Text style={styles.sectionCount}>
                {detections.length}
              </Text>
            </View>
          </View>

          {detections.map((d, idx) => (
            <View key={d._id} style={styles.detectionRow}>
              <View style={styles.detectionIndex}>
                <Text style={styles.detectionIndexText}>{idx + 1}</Text>
              </View>

              <View style={styles.detectionContent}>
                <Text style={styles.detectionTitle}>
                  Track #{d.trackId}
                </Text>
                <Text style={styles.detectionMeta}>
                  {d.observations} obs · {d.duration.toFixed(1)}s
                </Text>
              </View>

              <Text style={styles.detectionConfidence}>
                {Math.round(d.confidence * 100)}%
              </Text>
            </View>
          ))}
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

  // Title
  titleSection: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
  },
  conditionLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.4,
  },
  cropLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  // Gallery
  galleryWrapper: {
    paddingHorizontal: 18,
  },
  galleryImage: {
    width: GALLERY_WIDTH,
    height: GALLERY_HEIGHT,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  galleryEmpty: {
    width: GALLERY_WIDTH,
    height: GALLERY_HEIGHT,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  galleryEmptyText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  galleryDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  galleryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
  },
  galleryDotActive: {
    backgroundColor: "#111827",
  },
  galleryCounter: {
    position: "absolute",
    top: 10,
    right: 28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(17, 24, 39, 0.7)",
  },
  galleryCounterText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  statPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  statPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },

  // Section
  section: {
    paddingHorizontal: 18,
    paddingTop: 22,
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
    marginBottom: 10,
  },
  sectionCountContainer: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
  },

  // Skeletons
  skeleton: {
    gap: 6,
    paddingTop: 2,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e5e7eb",
  },

  // Disease info
  description: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
    marginBottom: 14,
  },
  block: {
    marginBottom: 14,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 5,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9ca3af",
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
  },

  // Detections
  detectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  detectionIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  detectionIndexText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },
  detectionContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  detectionMeta: {
    fontSize: 11,
    color: "#9ca3af",
  },
  detectionConfidence: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
    flexShrink: 0,
  },
});