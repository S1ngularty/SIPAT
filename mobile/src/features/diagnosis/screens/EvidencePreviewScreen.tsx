import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
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
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { useEvidencePreview } from "../hooks/useEvidencePreview";
import type { TrackResult } from "../diagnosisTypes";

// ==========================================
// THEME
// ==========================================

const COLORS = {
  background: "#FFFFFF",
  text: "#171717",
  textSecondary: "#737373",
  divider: "#E5E7EB",
  mutedGreen: "#E7EFE8",
  statusText: "#365B40",
  surfaceMuted: "#F3F4F6",
  skeleton: "#E8EAED",
  white: "#FFFFFF",
  backdrop: "rgba(23, 23, 23, 0.72)",
};

/** Horizontal page margin, per spec (20–24 px). */
const MARGIN = 22;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GALLERY_WIDTH = SCREEN_WIDTH - MARGIN * 2;

// ==========================================
// ICONS
// ==========================================

interface IconProps {
  size?: number;
  color?: string;
}

const BackIcon: React.FC<IconProps> = ({ size = 22, color = COLORS.text }) => (
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

const ImageIcon: React.FC<IconProps> = ({
  size = 22,
  color = COLORS.textSecondary,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2.5"
      stroke={color}
      strokeWidth="1.5"
    />
    <Circle cx="8.5" cy="9.5" r="1.6" stroke={color} strokeWidth="1.5" />
    <Path
      d="M4.5 17L9 12.5L12.5 16L15.5 13L19.5 17"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

const prettifyLabel = (raw?: string): string => {
  const value = (raw ?? "").split("___").pop() ?? "";
  const cleaned = value.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  if (!cleaned) return "";

  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
};

interface EvidenceFrame {
  url: string;
  confidence: number;
}

/** One frame per captured detection, carrying its own confidence. */
const buildFrames = (detections: TrackResult[]): EvidenceFrame[] =>
  detections
    .filter((d) => !!d.evidenceUrl)
    .map((d) => ({ url: d.evidenceUrl, confidence: d.confidence }));

const meanConfidence = (values: number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

// ==========================================
// HEADER
// ==========================================

interface HeaderProps {
  onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBack }) => (
  <View style={styles.navBar}>
    <TouchableOpacity
      onPress={onBack}
      style={styles.navButton}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <BackIcon size={22} color={COLORS.text} />
    </TouchableOpacity>

    <Text style={styles.navTitle}>Evidence</Text>

    <View style={styles.navButton} />
  </View>
);

// ==========================================
// CAROUSEL
// ==========================================

interface CarouselProps {
  frames: EvidenceFrame[];
}

const Carousel: React.FC<CarouselProps> = ({ frames }) => {
  const [index, setIndex] = useState(0);

  if (frames.length === 0) {
    return (
      <View style={[styles.slide, styles.slidePlaceholder]}>
        <ImageIcon size={26} color={COLORS.textSecondary} />
        <Text style={styles.placeholderText}>No evidence images</Text>
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
        data={frames}
        keyExtractor={(frame, idx) => `${frame.url}-${idx}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={{ width: GALLERY_WIDTH }}>
            <View style={styles.slide}>
              <Image
                source={{ uri: item.url }}
                style={styles.slideImage}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />

              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceBadgeText}>
                  {formatPercent(item.confidence)}
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      {frames.length > 1 && (
        <View style={styles.dots}>
          {frames.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
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

  const frames = useMemo(() => buildFrames(detections), [detections]);

  const averageConfidence = useMemo(() => {
    const values = frames.length
      ? frames.map((frame) => frame.confidence)
      : detections.map((d) => d.confidence);

    return meanConfidence(values);
  }, [frames, detections]);

  const diseaseName = prettifyLabel(condition) || "Unidentified condition";
  const cropName = prettifyLabel(crop) || "Crop not identified";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header onBack={handleBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Disease name + average confidence */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.diseaseName} numberOfLines={2}>
              {diseaseName}
            </Text>

            <View style={styles.averageBlock}>
              <Text style={styles.averageValue}>
                {formatPercent(averageConfidence)}
              </Text>
              <Text style={styles.averageLabel}>average</Text>
            </View>
          </View>

          <Text style={styles.cropName}>{cropName}</Text>
        </View>

        {/* Carousel */}
        <View style={styles.galleryWrapper}>
          <Carousel frames={frames} />
        </View>

        {/* Disease explanation + prevention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this condition</Text>

          {isLoading ? (
            <View style={styles.skeleton}>
              <View style={[styles.skeletonLine, { width: "94%" }]} />
              <View style={[styles.skeletonLine, { width: "86%" }]} />
              <View style={[styles.skeletonLine, { width: "68%" }]} />
              <View style={[styles.skeletonLine, { width: "78%" }]} />
            </View>
          ) : diseaseInfo ? (
            <>
              {diseaseInfo.description ? (
                <Text style={styles.description}>
                  {diseaseInfo.description}
                </Text>
              ) : null}

              <ListBlock title="Symptoms" items={diseaseInfo.symptoms} />
              <ListBlock title="Prevention" items={diseaseInfo.prevention} />
              <ListBlock title="Treatment" items={diseaseInfo.treatment} />
            </>
          ) : (
            <View style={styles.placeholderBlock}>
              <ImageIcon size={22} color={COLORS.textSecondary} />
              <Text style={styles.placeholderText}>
                Detailed guidance for this condition is not available yet.
              </Text>
            </View>
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
    backgroundColor: COLORS.background,
  },

  // ==========================================
  // NAV BAR
  // ==========================================

  navBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: MARGIN - 8,
    backgroundColor: COLORS.background,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: 0.1,
  },

  scrollContent: {
    paddingTop: 4,
    paddingBottom: 36,
  },

  // ==========================================
  // TITLE
  // ==========================================

  titleSection: {
    paddingHorizontal: MARGIN,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  diseaseName: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  averageBlock: {
    alignItems: "flex-end",
    paddingTop: 2,
  },
  averageValue: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.statusText,
    fontVariant: ["tabular-nums"],
  },
  averageLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cropName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  // ==========================================
  // CAROUSEL
  // ==========================================

  galleryWrapper: {
    paddingHorizontal: MARGIN,
    paddingTop: 20,
  },
  slide: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceMuted,
  },
  slidePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },
  confidenceBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.backdrop,
  },
  confidenceBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.divider,
  },
  dotActive: {
    backgroundColor: COLORS.text,
  },

  // ==========================================
  // SECTIONS
  // ==========================================

  section: {
    paddingHorizontal: MARGIN,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 23,
  },

  // ==========================================
  // LIST BLOCKS
  // ==========================================

  block: {
    marginTop: 20,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary,
    marginTop: 9,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },

  // ==========================================
  // SKELETON / PLACEHOLDER
  // ==========================================

  skeleton: {
    gap: 10,
    paddingTop: 2,
  },
  skeletonLine: {
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.skeleton,
  },
  placeholderBlock: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.mutedGreen,
  },
  placeholderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
});
