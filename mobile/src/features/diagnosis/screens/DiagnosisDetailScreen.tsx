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
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useDiagnosisDetail } from "../hooks/useDiagnosisDetail";
import { useGlossary } from "../hooks/useGlossary";
import { TermGlossaryModal } from "../components/TermGlossaryModal";
import { TermHighlightText } from "../components/TermHighlightText";
import type { TrackResult } from "../diagnosisTypes";

// ============================================================
// THEME
// ============================================================

const COLORS = {
  background: "#FFFFFF",
  text: "#171717",
  textSecondary: "#737373",
  divider: "#E5E7EB",
  mutedGreen: "#E7EFE8",
  statusText: "#365B40",
  surfaceMuted: "#F3F4F6",
  skeleton: "#E8EAED",
  black: "#171717",
  white: "#FFFFFF",
  danger: "#B4433A",
  backdrop: "rgba(23, 23, 23, 0.35)",
};

/** Horizontal page margin, per spec (20–24 px). */
const MARGIN = 22;

const ENTER = FadeInDown.duration(360).easing(Easing.out(Easing.quad));

// ============================================================
// ICONS
// ============================================================

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

const MoreIcon: React.FC<IconProps> = ({ size = 20, color = COLORS.text }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="5" cy="12" r="1.6" fill={color} />
    <Circle cx="12" cy="12" r="1.6" fill={color} />
    <Circle cx="19" cy="12" r="1.6" fill={color} />
  </Svg>
);

const ChevronRightIcon: React.FC<IconProps> = ({
  size = 18,
  color = COLORS.textSecondary,
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

const ArrowUpRightIcon: React.FC<IconProps> = ({
  size = 16,
  color = COLORS.statusText,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 17L17 7"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 7H17V15"
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

const RefreshIcon: React.FC<IconProps> = ({
  size = 18,
  color = COLORS.text,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2L19.5 8.5"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20 4.5v4h-4"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2L4.5 15.5"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4 19.5v-4h4"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ============================================================
// HELPERS
// ============================================================

/** Turn a raw YOLO label (`Tomato___Late_blight`) into readable text. */
const prettifyLabel = (raw?: string): string => {
  const value = (raw ?? "").split("___").pop() ?? "";
  const cleaned = value.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  if (!cleaned) return "";

  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Diagnostic certainty — deliberately worded differently from the raw model
 * confidence, which is surfaced separately as secondary metadata.
 */
const buildStatusLabel = (
  condition: string | undefined,
  confidence: number,
): string => {
  if (condition && /health/i.test(condition)) return "Healthy";

  if (confidence >= 0.85) return "Probable disease";
  if (confidence >= 0.7) return "Likely disease";
  if (confidence >= 0.55) return "Possible disease";

  return "Uncertain finding";
};

/** Stable, human-readable reference such as `001` for the report eyebrow. */
const buildReference = (id: string): string => {
  let sum = 0;

  for (let i = 0; i < id.length; i += 1) {
    sum = (sum * 31 + id.charCodeAt(i)) % 1000;
  }

  return String(sum).padStart(3, "0");
};

/** Title line for the report: user name first, otherwise `<Crop> leaf condition`. */
const buildHeading = (
  diagnosisName: string | undefined,
  crop: string | undefined,
  condition: string | undefined,
): string => {
  const custom = diagnosisName?.trim();
  if (custom) return custom;

  const cropLabel = prettifyLabel(crop);
  if (cropLabel) return `${cropLabel} leaf condition`;

  return prettifyLabel(condition) || "Diagnosis";
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildObservedSummary = (
  primary: EvidenceGroup | null,
  summary: string | null,
): string => {
  const clean = summary?.trim();
  if (clean) return clean;

  if (!primary) {
    return "No visible symptoms were detected in this clip. If the plant still looks affected, try recording a closer, steadier video.";
  }

  const regions = primary.detections.length;
  const seconds = Math.max(Math.round(primary.totalDuration), 1);
  const crop = prettifyLabel(primary.crop).toLowerCase() || "plant";

  return `${regions} region${regions === 1 ? "" : "s"} of interest ${
    regions === 1 ? "was" : "were"
  } tracked across roughly ${seconds} second${
    seconds === 1 ? "" : "s"
  } of footage on the ${crop}. Review the evidence image to judge how far it has spread.`;
};

interface ParsedAction {
  title: string;
  explanation: string;
}

/**
 * Recommendations arrive as free-form sentences. Split them into a scannable
 * action title and the supporting detail without losing any content.
 */
const parseAction = (raw: string): ParsedAction => {
  const text = (raw ?? "").trim();
  if (!text) return { title: "", explanation: "" };

  const colon = text.indexOf(":");
  if (colon > 0 && colon <= 60) {
    return {
      title: text.slice(0, colon).trim(),
      explanation: text.slice(colon + 1).trim(),
    };
  }

  const sentenceEnd = text.search(/[.!?]/);
  if (sentenceEnd > 0 && sentenceEnd <= 46 && sentenceEnd < text.length - 1) {
    return {
      title: text.slice(0, sentenceEnd).trim(),
      explanation: text.slice(sentenceEnd + 1).trim(),
    };
  }

  return { title: text, explanation: "" };
};

// ============================================================
// GROUPING
// ============================================================

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

/** Consolidate repeated video-frame detections into one finding per crop+condition. */
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

// ============================================================
// SKELETON
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

const SkeletonScreen: React.FC = () => {
  const pulse = useSharedValue(0.5);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  return (
    <View>
      {/* Heading */}
      <View style={styles.headingBlock}>
        <SkeletonBlock width={128} height={10} pulse={pulse} />
        <SkeletonBlock
          width="76%"
          height={26}
          radius={7}
          pulse={pulse}
          style={{ marginTop: 14 }}
        />
        <SkeletonBlock
          width={156}
          height={11}
          pulse={pulse}
          style={{ marginTop: 12 }}
        />
      </View>

      {/* Evidence image */}
      <View style={styles.imageWrapper}>
        <SkeletonBlock height={236} radius={10} pulse={pulse} />
      </View>

      {/* Summary */}
      <View style={styles.summaryBlock}>
        <SkeletonBlock width={132} height={22} radius={11} pulse={pulse} />
        <SkeletonBlock
          width="62%"
          height={24}
          radius={7}
          pulse={pulse}
          style={{ marginTop: 16 }}
        />
        <SkeletonBlock
          width="40%"
          height={12}
          pulse={pulse}
          style={{ marginTop: 12 }}
        />
      </View>

      {/* Observed symptoms */}
      <View style={styles.section}>
        <SkeletonBlock width={150} height={15} radius={7} pulse={pulse} />
        <SkeletonBlock
          width="94%"
          height={11}
          pulse={pulse}
          style={{ marginTop: 14 }}
        />
        <SkeletonBlock
          width="86%"
          height={11}
          pulse={pulse}
          style={{ marginTop: 8 }}
        />
        <SkeletonBlock
          width="70%"
          height={11}
          pulse={pulse}
          style={{ marginTop: 8 }}
        />
      </View>

      {/* Recommended actions */}
      <View style={styles.section}>
        <SkeletonBlock width={160} height={15} radius={7} pulse={pulse} />
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonActionRow}>
            <SkeletonBlock width={22} height={12} pulse={pulse} />
            <SkeletonBlock width="80%" height={11} pulse={pulse} />
          </View>
        ))}
      </View>

      {/* Other findings */}
      <View style={styles.section}>
        <SkeletonBlock width={110} height={15} radius={7} pulse={pulse} />
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonFindingRow}>
            <SkeletonBlock width={56} height={56} radius={8} pulse={pulse} />
            <View style={styles.skeletonFindingContent}>
              <SkeletonBlock width="68%" height={12} pulse={pulse} />
              <SkeletonBlock width="44%" height={10} pulse={pulse} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================================
// NAV BAR
// ============================================================

interface NavBarProps {
  onBack: () => void;
  onMenu?: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onBack, onMenu }) => (
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

    <Text style={styles.navTitle}>Diagnosis details</Text>

    {onMenu ? (
      <TouchableOpacity
        onPress={onMenu}
        style={styles.navButton}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="More options"
      >
        <MoreIcon size={20} color={COLORS.text} />
      </TouchableOpacity>
    ) : (
      <View style={styles.navButton} />
    )}
  </View>
);

// ============================================================
// OVERFLOW MENU
// ============================================================

interface OverflowMenuProps {
  visible: boolean;
  canOpenEvidence: boolean;
  onClose: () => void;
  onOpenEvidence: () => void;
  onRefresh: () => void;
}

const OverflowMenu: React.FC<OverflowMenuProps> = ({
  visible,
  canOpenEvidence,
  onClose,
  onOpenEvidence,
  onRefresh,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.sheetHandle} />

        <TouchableOpacity
          style={[
            styles.sheetAction,
            !canOpenEvidence && styles.sheetActionDisabled,
          ]}
          disabled={!canOpenEvidence}
          onPress={onOpenEvidence}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View original evidence"
        >
          <ImageIcon size={18} color={COLORS.text} />
          <Text style={styles.sheetActionText}>View original evidence</Text>
        </TouchableOpacity>

        <View style={styles.sheetDivider} />

        <TouchableOpacity
          style={styles.sheetAction}
          onPress={onRefresh}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Refresh analysis"
        >
          <RefreshIcon size={18} color={COLORS.text} />
          <Text style={styles.sheetActionText}>Refresh analysis</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

// ============================================================
// EVIDENCE IMAGE
// ============================================================

interface EvidenceImageProps {
  uri: string | null;
}

const EvidenceImage: React.FC<EvidenceImageProps> = ({ uri }) => {
  if (!uri) {
    return (
      <View style={[styles.evidenceImage, styles.evidencePlaceholder]}>
        <ImageIcon size={26} color={COLORS.textSecondary} />
        <Text style={styles.evidencePlaceholderText}>No evidence image</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.evidenceImage}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );
};

// ============================================================
// FINDING ROW
// ============================================================

interface FindingRowProps {
  group: EvidenceGroup;
  isLast: boolean;
  onPress: (group: EvidenceGroup) => void;
}

const FindingRow: React.FC<FindingRowProps> = ({
  group,
  isLast,
  onPress,
}) => {
  const thumbnail = group.imageUrls[0] ?? null;
  const disease = prettifyLabel(group.condition) || "Unknown condition";
  const crop = prettifyLabel(group.crop) || "Crop not identified";

  return (
    <TouchableOpacity
      style={[styles.findingRow, !isLast && styles.findingRowDivider]}
      onPress={() => onPress(group)}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${disease}, found on ${crop}`}
    >
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          style={styles.findingThumb}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.findingThumb, styles.findingThumbEmpty]}>
          <ImageIcon size={20} color={COLORS.textSecondary} />
        </View>
      )}

      <View style={styles.findingContent}>
        <Text style={styles.findingTitle} numberOfLines={1}>
          {disease}
        </Text>
        <Text style={styles.findingCrop} numberOfLines={1}>
          {crop}
        </Text>
      </View>

      <ChevronRightIcon size={18} color={COLORS.textSecondary} />
    </TouchableOpacity>
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
// SCREEN
// ============================================================

export const DiagnosisDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<DiagnosisDetailRoute>();
  const { videoId } = route.params;
  const insets = useSafeAreaInsets();

  const { analysis, terms, isLoading, isRefreshing, error, refresh } =
    useDiagnosisDetail(videoId);

  const { activeTerm, segmentsFor, openTerm, closeTerm } = useGlossary(terms);

  const [menuOpen, setMenuOpen] = useState(false);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const evidenceGroups = useMemo(() => {
    if (!analysis?.results?.length) return [];
    return groupIntoEvidence(analysis.results);
  }, [analysis?.results]);

  const primary = evidenceGroups[0] ?? null;
  const otherFindings = evidenceGroups.slice(1);

  const heroImageUrl =
    primary?.imageUrls[0] ?? analysis?.video?.thumbnailUrl ?? null;

  const heading = buildHeading(
    analysis?.diagnosisName,
    primary?.crop,
    primary?.condition,
  );

  const reference = buildReference(analysis?._id ?? videoId);

  const statusLabel = primary
    ? buildStatusLabel(primary.condition, primary.topConfidence)
    : "No findings";

  const diseaseName = primary
    ? prettifyLabel(primary.condition) || "Unidentified condition"
    : "No conditions detected";

  const cropName = primary
    ? prettifyLabel(primary.crop) || "Crop not identified"
    : "Crop not identified";

  const observedText = useMemo(
    () => buildObservedSummary(primary, analysis?.analysis?.summary ?? null),
    [primary, analysis?.analysis?.summary],
  );

  const observedSegments = useMemo(
    () => segmentsFor(observedText),
    [observedText, segmentsFor],
  );

  const actions = useMemo(
    () =>
      (analysis?.analysis?.recommendations ?? []).map((recommendation) => {
        const action = parseAction(recommendation);

        return {
          ...action,
          titleSegments: segmentsFor(action.title),
          explanationSegments: segmentsFor(action.explanation),
        };
      }),
    [analysis?.analysis?.recommendations, segmentsFor],
  );

  const openEvidence = useCallback(
    (group: EvidenceGroup | null) => {
      if (!group) return;

      navigation.navigate("EvidencePreview", {
        crop: group.crop,
        condition: group.condition,
        detections: group.detections,
      });
    },
    [navigation],
  );

  const handleOpenEvidence = useCallback(() => {
    setMenuOpen(false);
    openEvidence(primary);
  }, [openEvidence, primary]);

  const handleRefreshFromMenu = useCallback(() => {
    setMenuOpen(false);
    refresh();
  }, [refresh]);

  const handleBackToHistory = useCallback(() => {
    try {
      navigation.navigate("HomeTabs", { screen: "Diagnoses" });
    } catch {
      navigation.goBack();
    }
  }, [navigation]);

  if (isLoading && !analysis) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <NavBar onBack={handleBack} />

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
        <NavBar onBack={handleBack} />

        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            style={styles.errorRetry}
            onPress={() => refresh()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.errorRetryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <NavBar onBack={handleBack} onMenu={() => setMenuOpen(true)} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={COLORS.textSecondary}
            colors={[COLORS.textSecondary]}
          />
        }
      >
        {/* ==================================================
            HEADING
        ================================================== */}

        <Animated.View entering={ENTER} style={styles.headingBlock}>
          <Text style={styles.eyebrow}>Video diagnosis / {reference}</Text>

          <Text style={styles.heading}>{heading}</Text>

          {analysis?.createdAt ? (
            <Text style={styles.headingDate}>
              {formatDate(analysis.createdAt)}
            </Text>
          ) : null}
        </Animated.View>

        {/* ==================================================
            EVIDENCE IMAGE
        ================================================== */}

        <Animated.View
          entering={ENTER.delay(60)}
          style={styles.imageWrapper}
        >
          <EvidenceImage uri={heroImageUrl} />
        </Animated.View>

        {/* ==================================================
            DIAGNOSIS SUMMARY
        ================================================== */}

        <Animated.View
          entering={ENTER.delay(100)}
          style={styles.summaryBlock}
        >
          <View style={styles.summaryMetaRow}>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{statusLabel}</Text>
            </View>

            {primary ? (
              <Text style={styles.confidenceText}>
                {`Model confidence ${Math.round(
                  primary.topConfidence * 100,
                )}%`}
              </Text>
            ) : null}
          </View>

          <Text style={styles.diseaseName}>{diseaseName}</Text>

          <Text style={styles.cropName}>{cropName}</Text>
        </Animated.View>

        {/* ==================================================
            OBSERVED SYMPTOMS
        ================================================== */}

        <Animated.View
          entering={ENTER.delay(140)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Observed symptoms</Text>

          <TermHighlightText
            text={observedText}
            segments={observedSegments}
            onPressTerm={openTerm}
            style={styles.bodyText}
          />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openEvidence(primary)}
            disabled={!primary}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="View original evidence"
          >
            <ArrowUpRightIcon size={16} color={COLORS.statusText} />

            <Text
              style={[
                styles.linkText,
                !primary && styles.linkTextDisabled,
              ]}
            >
              View original evidence
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ==================================================
            RECOMMENDED ACTIONS
        ================================================== */}

        <Animated.View
          entering={ENTER.delay(180)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Recommended actions</Text>

          {actions.length === 0 ? (
            <Text style={styles.bodyText}>
              No specific actions were suggested for this clip.
            </Text>
          ) : (
            actions.map((action, index) => (
              <View
                key={`${action.title}-${index}`}
                style={styles.actionRow}
              >
                <Text style={styles.actionNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>

                <View style={styles.actionContent}>
                  <TermHighlightText
                    text={action.title}
                    segments={action.titleSegments}
                    onPressTerm={openTerm}
                    style={styles.actionTitle}
                  />

                  {action.explanation ? (
                    <TermHighlightText
                      text={action.explanation}
                      segments={action.explanationSegments}
                      onPressTerm={openTerm}
                      style={styles.actionExplanation}
                    />
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Animated.View>

        {/* ==================================================
            OTHER FINDINGS
        ================================================== */}

        {otherFindings.length > 0 && (
          <Animated.View
            entering={ENTER.delay(220)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Other findings</Text>

            <View style={styles.findingsList}>
              {otherFindings.map((group, index) => (
                <FindingRow
                  key={group.key}
                  group={group}
                  isLast={index === otherFindings.length - 1}
                  onPress={openEvidence}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ==================================================
            BOTTOM ACTION
        ================================================== */}

        <Animated.View
          entering={ENTER.delay(260)}
          style={styles.bottomActionWrapper}
        >
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleBackToHistory}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Back to diagnosis history"
          >
            <Text style={styles.bottomButtonText}>
              Back to diagnosis history
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <OverflowMenu
        visible={menuOpen}
        canOpenEvidence={!!primary}
        onClose={() => setMenuOpen(false)}
        onOpenEvidence={handleOpenEvidence}
        onRefresh={handleRefreshFromMenu}
      />

      <TermGlossaryModal term={activeTerm} onClose={closeTerm} />
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
    paddingHorizontal: MARGIN,
    gap: 18,
  },

  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: "center",
  },

  errorRetry: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.mutedGreen,
  },

  errorRetryText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.statusText,
  },

  // ==========================================================
  // NAV BAR
  // ==========================================================

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

  // ==========================================================
  // SCROLL
  // ==========================================================

  scrollContent: {
    paddingTop: 4,
  },

  // ==========================================================
  // HEADING
  // ==========================================================

  headingBlock: {
    paddingHorizontal: MARGIN,
    paddingTop: 12,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },

  heading: {
    fontSize: 28,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.5,
    lineHeight: 34,
    marginTop: 10,
  },

  headingDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  // ==========================================================
  // EVIDENCE IMAGE
  // ==========================================================

  imageWrapper: {
    paddingHorizontal: MARGIN,
    paddingTop: 20,
  },

  evidenceImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
  },

  evidencePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  evidencePlaceholderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // ==========================================================
  // SUMMARY
  // ==========================================================

  summaryBlock: {
    paddingHorizontal: MARGIN,
    paddingTop: 24,
  },

  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.mutedGreen,
  },

  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.statusText,
    letterSpacing: 0.2,
  },

  confidenceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontVariant: ["tabular-nums"],
  },

  diseaseName: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.4,
    lineHeight: 30,
    marginTop: 16,
  },

  cropName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // ==========================================================
  // SECTIONS
  // ==========================================================

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

  bodyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 23,
  },

  // ==========================================================
  // LINK ROW
  // ==========================================================

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },

  linkText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.statusText,
  },

  linkTextDisabled: {
    color: COLORS.textSecondary,
    opacity: 0.6,
  },

  // ==========================================================
  // RECOMMENDED ACTIONS
  // ==========================================================

  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 18,
  },

  actionNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.statusText,
    fontVariant: ["tabular-nums"],
    minWidth: 24,
    marginTop: 1,
  },

  actionContent: {
    flex: 1,
    minWidth: 0,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 21,
  },

  actionExplanation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginTop: 4,
  },

  // ==========================================================
  // OTHER FINDINGS
  // ==========================================================

  findingsList: {
    marginTop: 2,
  },

  findingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },

  findingRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  findingThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceMuted,
  },

  findingThumbEmpty: {
    justifyContent: "center",
    alignItems: "center",
  },

  findingContent: {
    flex: 1,
    minWidth: 0,
  },

  findingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },

  findingCrop: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  // ==========================================================
  // BOTTOM ACTION
  // ==========================================================

  bottomActionWrapper: {
    paddingHorizontal: MARGIN,
    paddingTop: 36,
  },

  bottomButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: COLORS.black,
    justifyContent: "center",
    alignItems: "center",
  },

  bottomButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
    letterSpacing: 0.1,
  },

  // ==========================================================
  // OVERFLOW SHEET
  // ==========================================================

  sheetBackdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.divider,
    alignSelf: "center",
    marginBottom: 10,
  },

  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  sheetActionDisabled: {
    opacity: 0.4,
  },

  sheetActionText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },

  sheetDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 16,
  },

  // ==========================================================
  // SKELETON DETAILS
  // ==========================================================

  skeletonActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 14,
  },

  skeletonFindingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },

  skeletonFindingContent: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
});
