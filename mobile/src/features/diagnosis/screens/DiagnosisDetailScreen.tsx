import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { VideoView, useVideoPlayer, VideoSource } from "expo-video";
import { useEvent } from "expo";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import Animated, {
  FadeInDown,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";

import { useDiagnosisDetail } from "../hooks/useDiagnosisDetail";
import type { TrackResult } from "../diagnosisTypes";

// ============================================================
// THEME
// ============================================================

const COLORS = {
  background: "#ffffff",
  surface: "#ffffff",
  softSurface: "#f9fafb",

  text: "#111827",
  textSecondary: "#374151",
  textMuted: "#6b7280",
  textLight: "#9ca3af",

  border: "#f3f4f6",
  borderStrong: "#e5e7eb",

  green: "#16a34a",
  greenDark: "#166534",
  greenSoft: "#f0fdf4",
  greenBorder: "#dcfce7",

  black: "#111827",
  white: "#ffffff",

  danger: "#dc2626",

  skeleton: "#e8eaed",
  skeletonSoft: "#f1f3f5",
};

// ============================================================
// ICONS
// ============================================================

interface IconProps {
  size?: number;
  color?: string;
}

const BackIcon: React.FC<IconProps> = ({ size = 20, color = COLORS.text }) => (
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
  color = COLORS.textMuted,
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

const PlayIcon: React.FC<IconProps> = ({ size = 22, color = COLORS.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 5.5V18.5L19 12L8 5.5Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const ChevronRightIcon: React.FC<IconProps> = ({
  size = 16,
  color = COLORS.textLight,
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

const ChevronDownIcon: React.FC<IconProps> = ({
  size = 15,
  color = COLORS.green,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SparkleIcon: React.FC<IconProps> = ({
  size = 15,
  color = COLORS.green,
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

const BulbIcon: React.FC<IconProps> = ({ size = 15, color = COLORS.green }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 20H15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path
      d="M10 22H14"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <Path
      d="M12 3C8.5 3 6 5.6 6 8.8C6 11.2 7.4 12.9 8.7 14C9.4 14.6 9.8 15.2 9.9 16H14.1C14.2 15.2 14.6 14.6 15.3 14C16.6 12.9 18 11.2 18 8.8C18 5.6 15.5 3 12 3Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertIcon: React.FC<IconProps> = ({
  size = 20,
  color = COLORS.danger,
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

// ============================================================
// SKELETON PRIMITIVES
// ============================================================

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: any;
  pulse: any;
}

const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = "100%",
  height = 12,
  radius = 6,
  style,
  pulse,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: COLORS.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

// ============================================================
// SKELETON SCREEN
// ============================================================

const SkeletonScreen: React.FC = () => {
  const pulse = useSharedValue(0.5);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 800,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0.5, {
          duration: 800,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  return (
    <View style={styles.skeletonRoot}>
      {/* Video skeleton */}
      <View style={styles.videoWrapper}>
        <SkeletonBlock height={200} radius={12} pulse={pulse} />
      </View>

      {/* AI section skeleton */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SkeletonBlock width={90} height={10} pulse={pulse} />
          <SkeletonBlock width={28} height={18} radius={9} pulse={pulse} />
        </View>

        {/* Analysis card skeleton */}
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonCardHeader}>
            <SkeletonBlock width={22} height={22} radius={11} pulse={pulse} />
            <SkeletonBlock width={70} height={10} pulse={pulse} />
          </View>
          <View style={styles.skeletonLines}>
            <SkeletonBlock width="94%" height={10} pulse={pulse} />
            <SkeletonBlock width="86%" height={10} pulse={pulse} />
            <SkeletonBlock width="72%" height={10} pulse={pulse} />
          </View>
        </View>

        {/* Recommendations card skeleton */}
        <View style={[styles.skeletonCard, { marginTop: 8 }]}>
          <View style={styles.skeletonCardHeader}>
            <SkeletonBlock width={22} height={22} radius={11} pulse={pulse} />
            <SkeletonBlock width={110} height={10} pulse={pulse} />
          </View>
          <View style={styles.skeletonLines}>
            <View style={styles.skeletonBulletRow}>
              <SkeletonBlock width={5} height={5} radius={3} pulse={pulse} />
              <SkeletonBlock
                width="88%"
                height={10}
                pulse={pulse}
                style={{ marginLeft: 9 }}
              />
            </View>
            <View style={styles.skeletonBulletRow}>
              <SkeletonBlock width={5} height={5} radius={3} pulse={pulse} />
              <SkeletonBlock
                width="76%"
                height={10}
                pulse={pulse}
                style={{ marginLeft: 9 }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Problems found skeleton */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SkeletonBlock width={110} height={10} pulse={pulse} />
          <SkeletonBlock width={20} height={18} radius={9} pulse={pulse} />
        </View>

        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonEvidenceCard}>
            <SkeletonBlock width={60} height={60} radius={10} pulse={pulse} />
            <View style={styles.skeletonEvidenceContent}>
              <SkeletonBlock width="70%" height={12} pulse={pulse} />
              <SkeletonBlock width="50%" height={10} pulse={pulse} />
              <SkeletonBlock width="40%" height={9} pulse={pulse} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================================
// ANIMATED CHEVRON
// ============================================================

const AnimatedChevron: React.FC<{ expanded: boolean }> = ({ expanded }) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.quad),
    });
  }, [expanded, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ChevronDownIcon size={14} />
    </Animated.View>
  );
};

// ============================================================
// ROUTE TYPE
// ============================================================

type DiagnosisDetailRoute = RouteProp<
  { DiagnosisDetail: { videoId: string } },
  "DiagnosisDetail"
>;

// ============================================================
// HELPERS
// ============================================================

const prettifyLabel = (raw: string): string =>
  raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const describeConfidence = (value: number): string => {
  const pct = Math.round(value * 100);

  if (pct >= 85) return "Very sure";
  if (pct >= 70) return "Fairly sure";
  if (pct >= 55) return "Likely";

  return "Possible";
};

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
    const url = r.evidenceUrl;

    if (existing) {
      existing.detections.push(r);

      existing.topConfidence = Math.max(existing.topConfidence, r.confidence);

      existing.totalObservations += r.observations ?? 0;
      existing.totalDuration += r.duration ?? 0;

      if (url) {
        existing.imageUrls.push(url);
      }
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

// ============================================================
// VIDEO PLAYER
// ============================================================
interface VideoPlayerProps {
  uri: string | null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri }) => {
  const player = useVideoPlayer(uri as VideoSource, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0;
  });

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });

  // ✅ Always called unconditionally, in the same order every render
  const loadingPulse = useSharedValue(1);

  const isLoading = status === "loading";
  const hasError = status === "error";

  const togglePlay = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  if (!uri || hasError) {
    return (
      <View style={styles.videoPlaceholder}>
        <VideoIcon size={26} color={COLORS.textMuted} />
        <Text style={styles.videoPlaceholderText}>
          {hasError ? "Couldn't load video" : "Video unavailable"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.videoBox}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="contain"
      />

      {isLoading && (
        <View style={styles.videoOverlay}>
          {/* ✅ Use the hoisted shared value */}
          <SkeletonBlock height={200} radius={12} pulse={loadingPulse} />
        </View>
      )}

      {!isLoading && !isPlaying && (
        <TouchableOpacity
          style={styles.videoPlayOverlay}
          onPress={togglePlay}
          activeOpacity={0.7}
        >
          <View style={styles.videoPlayButton}>
            <PlayIcon size={22} color={COLORS.white} />
          </View>
        </TouchableOpacity>
      )}

      {!isLoading && isPlaying && (
        <TouchableOpacity
          style={styles.videoTouchOverlay}
          onPress={togglePlay}
          activeOpacity={1}
        />
      )}
    </View>
  );
};
// ============================================================
// STACKED THUMBNAILS
// ============================================================

interface StackedThumbnailsProps {
  urls: string[];
  size?: number;
}

const MAX_VISIBLE = 3;

const StackedThumbnails: React.FC<StackedThumbnailsProps> = ({
  urls,
  size = 60,
}) => {
  const STACK_OFFSET = Math.round(size * 0.28);

  const visible = urls.slice(0, MAX_VISIBLE);
  const hasMore = urls.length > MAX_VISIBLE;

  const containerWidth =
    visible.length > 0 ? size + (visible.length - 1) * STACK_OFFSET : size;

  if (visible.length === 0) {
    return (
      <View
        style={[
          styles.stackContainer,
          {
            width: size,
            height: size,
          },
        ]}
      >
        <View
          style={[
            styles.stackItem,
            {
              width: size,
              height: size,
              left: 0,
            },
          ]}
        >
          <AlertIcon size={22} color={COLORS.danger} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.stackContainer,
        {
          width: containerWidth,
          height: size,
        },
      ]}
    >
      {visible.map((url, idx) => {
        const zIndex = visible.length - idx;
        const left = idx * STACK_OFFSET;
        const isLastVisible = idx === visible.length - 1;

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

            {hasMore && isLastVisible && (
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

// ============================================================
// COLLAPSIBLE AI CARD
// ============================================================

interface AICardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

const AICard: React.FC<AICardProps> = ({
  icon,
  title,
  children,
  expandable = false,
  expanded = false,
  onToggle,
}) => {
  return (
    <Animated.View
      layout={Layout.duration(240).easing(Easing.out(Easing.quad))}
      style={styles.aiCard}
    >
      <View style={styles.aiHeader}>
        <View style={styles.aiIconWrap}>{icon}</View>

        <Text style={styles.aiTitle}>{title}</Text>
      </View>

      <Animated.View
        layout={Layout.duration(240).easing(Easing.out(Easing.quad))}
      >
        {children}
      </Animated.View>

      {expandable && (
        <TouchableOpacity
          onPress={onToggle}
          style={styles.aiToggle}
          activeOpacity={0.6}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.aiToggleText}>
            {expanded ? "Show less" : "Read more"}
          </Text>

          <AnimatedChevron expanded={expanded} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ============================================================
// AI ANALYSIS SECTION
// ============================================================

interface AIAnalysisSectionProps {
  summary: string | null;
  recommendations: string[];
  isLoading: boolean;
}

const COLLAPSED_RECOMMENDATION_COUNT = 2;

const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({
  summary,
  recommendations,
  isLoading,
}) => {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [recommendationsExpanded, setRecommendationsExpanded] = useState(false);

  const hasSummary = !!summary && summary.trim().length > 0;
  const hasRecommendations = recommendations.length > 0;

  const summaryIsLong =
    hasSummary && (summary!.length > 180 || summary!.split("\n").length > 4);

  const recommendationsAreLong =
    recommendations.length > COLLAPSED_RECOMMENDATION_COUNT;

  const visibleRecommendations = recommendationsExpanded
    ? recommendations
    : recommendations.slice(0, COLLAPSED_RECOMMENDATION_COUNT);

  const hiddenCount = Math.max(
    recommendations.length - COLLAPSED_RECOMMENDATION_COUNT,
    0,
  );

  return (
    <View style={styles.aiSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>AI assessment</Text>

        <View style={styles.aiBadge}>
          <SparkleIcon size={11} color={COLORS.green} />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>

      {/* SUMMARY */}

      <AICard
        icon={<SparkleIcon size={14} color={COLORS.green} />}
        title="Analysis"
        expandable={summaryIsLong}
        expanded={summaryExpanded}
        onToggle={() => setSummaryExpanded((value) => !value)}
      >
        {isLoading && !hasSummary ? (
          <View style={styles.skeleton}>
            <View style={[styles.skeletonLine, { width: "94%" }]} />
            <View style={[styles.skeletonLine, { width: "82%" }]} />
            <View style={[styles.skeletonLine, { width: "61%" }]} />
          </View>
        ) : !hasSummary ? (
          <Text style={styles.emptyText}>
            AI analysis is not available yet.
          </Text>
        ) : (
          <Animated.Text
            layout={Layout.duration(240).easing(Easing.out(Easing.quad))}
            style={styles.aiText}
            numberOfLines={summaryExpanded ? undefined : 4}
          >
            {summary}
          </Animated.Text>
        )}
      </AICard>

      {/* RECOMMENDATIONS */}

      <View style={styles.aiCardSpacing}>
        <AICard
          icon={<BulbIcon size={14} color={COLORS.green} />}
          title="Recommendations"
          expandable={recommendationsAreLong}
          expanded={recommendationsExpanded}
          onToggle={() => setRecommendationsExpanded((value) => !value)}
        >
          {isLoading && !hasRecommendations ? (
            <View style={styles.skeleton}>
              <View style={[styles.skeletonLine, { width: "90%" }]} />
              <View style={[styles.skeletonLine, { width: "78%" }]} />
              <View style={[styles.skeletonLine, { width: "65%" }]} />
            </View>
          ) : !hasRecommendations ? (
            <Text style={styles.emptyText}>
              No recommendations are available yet.
            </Text>
          ) : (
            <Animated.View
              layout={Layout.duration(240).easing(Easing.out(Easing.quad))}
              style={styles.recommendationList}
            >
              {visibleRecommendations.map((recommendation, index) => (
                <Animated.View
                  key={`${recommendation}-${index}`}
                  entering={FadeInDown.duration(240)
                    .delay(index * 40)
                    .easing(Easing.out(Easing.quad))}
                  layout={Layout.duration(240).easing(Easing.out(Easing.quad))}
                  style={styles.recommendationRow}
                >
                  <View style={styles.recommendationBullet} />

                  <Text style={styles.recommendationText}>
                    {recommendation}
                  </Text>
                </Animated.View>
              ))}

              {!recommendationsExpanded && hiddenCount > 0 && (
                <Animated.View
                  entering={FadeInDown.duration(240).easing(
                    Easing.out(Easing.quad),
                  )}
                  layout={Layout.duration(240).easing(Easing.out(Easing.quad))}
                >
                  <Text style={styles.recommendationMore}>
                    +{hiddenCount} more
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </AICard>
      </View>
    </View>
  );
};

// ============================================================
// EVIDENCE CARD
// ============================================================

interface EvidenceCardProps {
  group: EvidenceGroup;
  onPress: (group: EvidenceGroup) => void;
}

const EvidenceCard: React.FC<EvidenceCardProps> = ({ group, onPress }) => {
  const count = group.detections.length;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, {
      damping: 20,
      stiffness: 350,
    });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 20,
      stiffness: 350,
    });
  }, [scale]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => onPress(group)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.evidenceCard}
      >
        <StackedThumbnails urls={group.imageUrls} size={60} />

        <View style={styles.evidenceContent}>
          <Text style={styles.evidenceTitle} numberOfLines={1}>
            {group.condition}
          </Text>

          <Text style={styles.evidenceCrop} numberOfLines={1}>
            Found on {prettifyLabel(group.crop).toLowerCase()}
          </Text>

          <View style={styles.evidenceMetaRow}>
            <Text style={styles.evidenceMeta}>
              {count} spot{count !== 1 ? "s" : ""}
            </Text>

            <View style={styles.evidenceDot} />

            <Text style={styles.evidenceConfidence}>
              {describeConfidence(group.topConfidence)}
            </Text>
          </View>
        </View>

        <ChevronRightIcon size={16} color={COLORS.textMuted} />
      </Pressable>
    </Animated.View>
  );
};

// ============================================================
// HEADER
// ============================================================

interface HeaderProps {
  onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
      style={styles.headerBackButton}
      activeOpacity={0.6}
      hitSlop={{
        top: 8,
        bottom: 8,
        left: 8,
        right: 8,
      }}
    >
      <BackIcon size={20} color={COLORS.text} />
    </TouchableOpacity>

    <Text style={styles.headerTitle}>Result</Text>

    <View style={styles.headerSpacer} />
  </View>
);

// ============================================================
// SCREEN
// ============================================================

export const DiagnosisDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const route = useRoute<DiagnosisDetailRoute>();

  const { videoId } = route.params;

  const { analysis, isLoading, isRefreshing, error, refresh } =
    useDiagnosisDetail(videoId);

  const evidenceGroups = useMemo(() => {
    if (!analysis?.results?.length) {
      return [];
    }

    return groupIntoEvidence(analysis.results);
  }, [analysis?.results]);

  const videoUrl = analysis?.video?.evidenceVideoUrl ?? null;

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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <SkeletonScreen />
        </ScrollView>
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
    <SafeAreaView style={styles.safe}>
      <Header onBack={handleBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={COLORS.textMuted}
          />
        }
      >
        {/* ==================================================
            VIDEO
        ================================================== */}

        <Animated.View
          entering={FadeInDown.duration(380).easing(Easing.out(Easing.quad))}
          style={styles.videoWrapper}
        >
          <VideoPlayer uri={videoUrl} />
        </Animated.View>

        {/* ==================================================
            AI ANALYSIS + RECOMMENDATIONS
        ================================================== */}

        <Animated.View
          entering={FadeInDown.duration(380)
            .delay(80)
            .easing(Easing.out(Easing.quad))}
          style={styles.section}
        >
          <AIAnalysisSection
            summary={analysis?.analysis?.summary ?? null}
            recommendations={analysis?.analysis?.recommendations ?? []}
            isLoading={isLoading}
          />
        </Animated.View>

        {/* ==================================================
            PROBLEMS FOUND
        ================================================== */}

        <Animated.View
          entering={FadeInDown.duration(380)
            .delay(160)
            .easing(Easing.out(Easing.quad))}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Problems found</Text>

            <View style={styles.sectionCountContainer}>
              <Text style={styles.sectionCount}>{evidenceGroups.length}</Text>
            </View>
          </View>

          {evidenceGroups.length === 0 ? (
            <View style={styles.evidenceEmpty}>
              <Text style={styles.evidenceEmptyText}>
                No problems found in this video.
              </Text>
            </View>
          ) : (
            evidenceGroups.map((group, index) => (
              <Animated.View
                key={group.key}
                entering={FadeInDown.duration(320)
                  .delay(200 + index * 60)
                  .easing(Easing.out(Easing.quad))}
                layout={Layout.duration(240).easing(Easing.out(Easing.quad))}
              >
                <EvidenceCard group={group} onPress={handleEvidencePress} />
              </Animated.View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    fontSize: 14,
    color: COLORS.danger,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,

    backgroundColor: COLORS.background,
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
    color: COLORS.text,
  },

  headerSpacer: {
    width: 36,
    height: 36,
  },

  // ==========================================================
  // SCROLL
  // ==========================================================

  scrollContent: {
    paddingBottom: 36,
  },

  // ==========================================================
  // SKELETON
  // ==========================================================

  skeletonRoot: {
    width: "100%",
  },

  skeletonCard: {
    padding: 12,

    borderRadius: 12,

    backgroundColor: COLORS.softSurface,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  skeletonCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },

  skeletonLines: {
    gap: 8,
  },

  skeletonBulletRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  skeletonEvidenceCard: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 12,
    paddingVertical: 12,

    marginBottom: 8,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.surface,

    gap: 14,
  },

  skeletonEvidenceContent: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },

  // ==========================================================
  // VIDEO
  // ==========================================================

  videoWrapper: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },

  videoBox: {
    width: "100%",
    aspectRatio: 16 / 9,

    borderRadius: 12,
    overflow: "hidden",

    backgroundColor: "#000000",

    position: "relative",
  },

  video: {
    width: "100%",
    height: "100%",
  },

  videoOverlay: {
    ...StyleSheet.absoluteFill,

    justifyContent: "center",
    alignItems: "center",

    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },

  videoPlayOverlay: {
    ...StyleSheet.absoluteFill,

    justifyContent: "center",
    alignItems: "center",
  },

  videoTouchOverlay: {
    ...StyleSheet.absoluteFill,
  },

  videoPlayButton: {
    width: 52,
    height: 52,

    borderRadius: 26,

    backgroundColor: "rgba(17, 24, 39, 0.78)",

    justifyContent: "center",
    alignItems: "center",

    paddingLeft: 3,
  },

  videoPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,

    borderRadius: 12,

    backgroundColor: COLORS.softSurface,

    justifyContent: "center",
    alignItems: "center",

    gap: 6,
  },

  videoPlaceholderText: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  // ==========================================================
  // SECTION
  // ==========================================================

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

    color: COLORS.textMuted,

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

    color: COLORS.textMuted,
  },

  // ==========================================================
  // AI SECTION
  // ==========================================================

  aiSection: {
    width: "100%",
  },

  aiBadge: {
    flexDirection: "row",
    alignItems: "center",

    gap: 4,

    paddingHorizontal: 7,
    height: 20,

    borderRadius: 10,

    backgroundColor: COLORS.greenSoft,
  },

  aiBadgeText: {
    fontSize: 9,
    fontWeight: "700",

    color: COLORS.green,

    letterSpacing: 0.5,
  },

  aiCard: {
    padding: 12,

    borderRadius: 12,

    backgroundColor: COLORS.softSurface,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  aiCardSpacing: {
    marginTop: 8,
  },

  aiHeader: {
    flexDirection: "row",
    alignItems: "center",

    gap: 7,

    marginBottom: 7,
  },

  aiIconWrap: {
    width: 22,
    height: 22,

    borderRadius: 11,

    backgroundColor: COLORS.greenSoft,

    justifyContent: "center",
    alignItems: "center",
  },

  aiTitle: {
    fontSize: 12,
    fontWeight: "600",

    color: COLORS.text,

    letterSpacing: 0.1,
  },

  aiText: {
    fontSize: 13,

    color: COLORS.textSecondary,

    lineHeight: 19,
  },

  aiToggle: {
    flexDirection: "row",
    alignItems: "center",

    alignSelf: "flex-start",

    gap: 4,

    marginTop: 8,
  },

  aiToggleText: {
    fontSize: 12,
    fontWeight: "600",

    color: COLORS.green,
  },

  // ==========================================================
  // SKELETON LINES (inline card skeletons)
  // ==========================================================

  skeleton: {
    gap: 6,
    paddingTop: 2,
  },

  skeletonLine: {
    height: 10,

    borderRadius: 5,

    backgroundColor: COLORS.skeletonSoft,
  },

  emptyText: {
    fontSize: 13,

    color: COLORS.textLight,

    fontStyle: "italic",
  },

  // ==========================================================
  // RECOMMENDATIONS
  // ==========================================================

  recommendationList: {
    gap: 7,
  },

  recommendationRow: {
    flexDirection: "row",
    alignItems: "flex-start",

    gap: 9,
  },

  recommendationBullet: {
    width: 5,
    height: 5,

    borderRadius: 2.5,

    backgroundColor: COLORS.green,

    marginTop: 8,
  },

  recommendationText: {
    flex: 1,

    fontSize: 13,

    color: COLORS.textSecondary,

    lineHeight: 19,
  },

  recommendationMore: {
    fontSize: 12,
    fontWeight: "600",

    color: COLORS.green,

    marginLeft: 14,
    marginTop: 2,

    opacity: 0.9,
  },

  // ==========================================================
  // EVIDENCE
  // ==========================================================

  evidenceCard: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 12,
    paddingVertical: 12,

    marginBottom: 8,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.surface,

    gap: 14,
  },

  evidenceContent: {
    flex: 1,

    minWidth: 0,

    gap: 3,
  },

  evidenceTitle: {
    fontSize: 14,
    fontWeight: "600",

    color: COLORS.text,
  },

  evidenceCrop: {
    fontSize: 12,

    color: COLORS.textMuted,
  },

  evidenceMetaRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: 6,

    marginTop: 2,
  },

  evidenceMeta: {
    fontSize: 11,

    color: COLORS.textMuted,
  },

  evidenceDot: {
    width: 3,
    height: 3,

    borderRadius: 1.5,

    backgroundColor: "#d1d5db",
  },

  evidenceConfidence: {
    fontSize: 11,

    color: COLORS.green,

    fontWeight: "600",
  },

  // ==========================================================
  // THUMBNAILS
  // ==========================================================

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
    borderColor: COLORS.white,

    justifyContent: "center",
    alignItems: "center",
  },

  stackImage: {
    width: "100%",
    height: "100%",
  },

  stackMoreOverlay: {
    ...StyleSheet.absoluteFill,

    backgroundColor: "rgba(17, 24, 39, 0.55)",

    justifyContent: "center",
    alignItems: "center",
  },

  stackMoreText: {
    color: COLORS.white,

    fontSize: 12,
    fontWeight: "700",
  },

  // ==========================================================
  // EMPTY
  // ==========================================================

  evidenceEmpty: {
    paddingVertical: 24,

    alignItems: "center",
  },

  evidenceEmptyText: {
    fontSize: 13,

    color: COLORS.textLight,
  },
});
