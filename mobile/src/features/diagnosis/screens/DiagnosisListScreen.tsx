import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Leaf,
  Pencil,
  ScanLine,
  Search,
  Trash2,
  Video,
} from "lucide-react-native";

import { useDiagnosisList } from "../hooks/useDiagnosisList";
import type { VideoAnalysis, TrackResult } from "../diagnosisTypes";
import { Skeleton } from "../../../components/ui/SkeletonComponent";
import { CategoryFilterList } from "../../../components/ui/CategoryFilterList";
import { colors, radii, spacing } from "../../../theme";
import { scheduleOnRN } from "react-native-worklets";

// ==========================================
// ICONS
// ==========================================

/** Slim outline weight shared by every icon on this screen (§11). */
const ICON_STROKE = 1.5;

// ==========================================
// HELPERS
// ==========================================

const getDisplayName = (analysis: VideoAnalysis): string => {
  const named = analysis.diagnosisName?.trim();
  if (named) return named;
  return analysis.video?.originalFileName || "Untitled video";
};

const getTopFinding = (analysis: VideoAnalysis): TrackResult | null => {
  if (!analysis.results || analysis.results.length === 0) {
    return null;
  }

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

const DiagnosisItemSkeleton: React.FC = () => (
  <View style={styles.skeletonItem}>
    {/* Video thumbnail placeholder */}
    <Skeleton width={42} height={42} borderRadius={10} />

    {/* Diagnosis title and metadata placeholders */}
    <View style={styles.skeletonContent}>
      <Skeleton width="75%" height={14} borderRadius={4} />

      <Skeleton width="90%" height={12} borderRadius={4} />

      <Skeleton width="45%" height={10} borderRadius={4} />
    </View>

    {/* Confidence placeholder */}
    <View style={styles.skeletonTrailing}>
      <Skeleton width={34} height={14} borderRadius={4} />
      <Skeleton width={48} height={8} borderRadius={4} />
    </View>
  </View>
);

const DiagnosisListSkeleton: React.FC = () => (
  <View style={styles.skeletonList}>
    <View style={styles.sectionHeader}>
      <Skeleton width={65} height={12} borderRadius={4} />
    </View>

    {Array.from({ length: 5 }, (_, index) => (
      <DiagnosisItemSkeleton key={index} />
    ))}
  </View>
);

// ==========================================
// FILTER CHIPS
// ==========================================

type FilterValue = "all" | DateBucket;

/**
 * Date buckets offered as filters. They are rendered by the shared
 * `CategoryFilterList`, so the Diagnoses chips match Home exactly
 * (lime fill + check glyph for the active chip).
 */
const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last3Days", label: "Last 3 days" },
  { value: "last7Days", label: "Last 7 days" },
  { value: "older", label: "Older" },
];

// ==========================================
// RIPPLE
// ==========================================

const RIPPLE_SIZE = 300;
const RIPPLE_DURATION = 450;

interface RippleProps {
  x: number;
  y: number;
  onDone: () => void;
}

const Ripple: React.FC<RippleProps> = ({ x, y, onDone }) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0.15);

  React.useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: RIPPLE_DURATION, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) scheduleOnRN(onDone);
      },
    );
    opacity.value = withTiming(0, {
      duration: RIPPLE_DURATION,
      easing: Easing.out(Easing.quad),
    });
  }, [progress, opacity, onDone]);

  const style = useAnimatedStyle(() => {
    const size = RIPPLE_SIZE * progress.value;
    return {
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.charcoal,
      opacity: opacity.value,
    };
  });

  return <Animated.View pointerEvents="none" style={style} />;
};

// ==========================================
// SWIPEABLE WRAPPER
// ==========================================

const ACTION_WIDTH = 76;
const TOTAL_ACTIONS_WIDTH = ACTION_WIDTH * 2;

interface SwipeableProps {
  children: React.ReactNode;
  onRename: () => void;
  onDelete: () => void;
  onLongPress: () => void;
  onPress: () => void;
}

const SwipeableRow: React.FC<SwipeableProps> = ({
  children,
  onRename,
  onDelete,
  onLongPress,
  onPress,
}) => {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [ripple, setRipple] = useState<{
    x: number;
    y: number;
    key: number;
  } | null>(null);

  const springConfig = {
    damping: 30,
    stiffness: 400,
    mass: 0.6,
    overshootClamping: true,
  };

  const showActions = (show: boolean) => {
    setIsRevealed(show);
  };

  const close = () => {
    translateX.value = withSpring(0, springConfig);
    showActions(false);
  };

  const triggerRipple = (x: number, y: number) => {
    setRipple({ x, y, key: Date.now() });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onStart(() => {
      startX.value = translateX.value;
      scheduleOnRN(showActions, true);
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;

      if (next > 0) {
        translateX.value = 0;
      } else if (next < -TOTAL_ACTIONS_WIDTH - 30) {
        translateX.value = -TOTAL_ACTIONS_WIDTH - 30;
      } else {
        translateX.value = next;
      }
    })
    .onEnd((e) => {
      const shouldOpen =
        translateX.value < -TOTAL_ACTIONS_WIDTH / 2 || e.velocityX < -500;

      if (shouldOpen) {
        translateX.value = withSpring(-TOTAL_ACTIONS_WIDTH, springConfig);
        scheduleOnRN(showActions, true);
      } else {
        translateX.value = withSpring(0, springConfig);
        scheduleOnRN(showActions, false);
      }
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e, success) => {
      if (!success) return;
      scheduleOnRN(triggerRipple, e.x, e.y);
      scheduleOnRN(onPress);
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      scheduleOnRN(onLongPress);
    });

  const composed = Gesture.Race(
    panGesture,
    Gesture.Exclusive(longPressGesture, tapGesture),
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.swipeWrapper}>
      {isRevealed && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.action, styles.actionRename]}
            onPress={() => {
              close();
              onRename();
            }}
            activeOpacity={0.8}
          >
            <Pencil size={22} color={colors.text} strokeWidth={ICON_STROKE} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, styles.actionDelete]}
            onPress={() => {
              close();
              onDelete();
            }}
            activeOpacity={0.8}
          >
            <Trash2
              size={22}
              color={colors.danger}
              strokeWidth={ICON_STROKE}
            />
          </TouchableOpacity>
        </View>
      )}

      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.swipeContent, contentStyle]}>
          {children}

          {ripple && (
            <Ripple
              key={ripple.key}
              x={ripple.x}
              y={ripple.y}
              onDone={() => setRipple(null)}
            />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

// ==========================================
// LIST ITEM
// ==========================================

interface DiagnosisItemProps {
  analysis: VideoAnalysis;
  onPress: (analysis: VideoAnalysis) => void;
  onRename: (analysis: VideoAnalysis) => void;
  onDelete: (analysis: VideoAnalysis) => void;
  onOpenMenu: (analysis: VideoAnalysis) => void;
}

const DiagnosisItem: React.FC<DiagnosisItemProps> = ({
  analysis,
  onPress,
  onRename,
  onDelete,
  onOpenMenu,
}) => {
  const rotation = useSharedValue(0);

  const status = analysis.video?.status ?? "processing";
  const topFinding = getTopFinding(analysis);

  const isProcessing = status === "processing" || status === "uploaded";

  React.useEffect(() => {
    if (!isProcessing) {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }

    rotation.value = 0;
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [isProcessing, rotation]);

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
        return "Analyzing video";
      case "completed":
        return topFinding
          ? `${topFinding.crop} · ${topFinding.condition}`
          : "Analysis complete";
      case "failed":
        return "Analysis failed";
      default:
        return "Unknown status";
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case "completed":
        return colors.success;
      case "failed":
        return colors.danger;
      default:
        return colors.textMuted;
    }
  };

  return (
    <SwipeableRow
      onPress={() => onPress(analysis)}
      onRename={() => onRename(analysis)}
      onDelete={() => onDelete(analysis)}
      onLongPress={() => onOpenMenu(analysis)}
    >
      <View style={styles.item}>
        <View style={styles.thumbnail}>
          <Video size={19} color={colors.textMuted} strokeWidth={ICON_STROKE} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="middle">
            {getDisplayName(analysis)}
          </Text>

          <View style={styles.subtitleRow}>
            <View
              style={[styles.statusDot, { backgroundColor: getStatusColor() }]}
            />
            <Text style={styles.subtitle} numberOfLines={1}>
              {getStatusLabel()}
            </Text>
          </View>

          <Text style={styles.meta}>
            {formatRelativeTime(analysis.createdAt)}
            {analysis.results?.length
              ? ` · ${analysis.results.length} finding${
                  analysis.results.length !== 1 ? "s" : ""
                }`
              : ""}
          </Text>
        </View>

        <View style={styles.trailing}>
          {isProcessing && (
            <Animated.Text style={[styles.spinner, spinnerStyle]}>
              ⟳
            </Animated.Text>
          )}

          {status === "completed" && topFinding && (
            <View style={styles.confidenceContainer}>
              <Text style={styles.percent}>
                {Math.round(topFinding.confidence * 100)}%
              </Text>
              <Text style={styles.confidenceLabel}>confidence</Text>
            </View>
          )}

          {status === "failed" && (
            <View style={styles.failedCircle}>
              <Text style={styles.failed}>!</Text>
            </View>
          )}
        </View>
      </View>
    </SwipeableRow>
  );
};

// ==========================================
// SECTION HEADER
// ==========================================

const SectionHeader: React.FC<{
  title: string;
  count: number;
}> = ({ title, count }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCountContainer}>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
    </View>
  </View>
);

// ==========================================
// RENAME MODAL
// ==========================================

interface RenameModalProps {
  visible: boolean;
  initialValue: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}

const RenameModal: React.FC<RenameModalProps> = ({
  visible,
  initialValue,
  onCancel,
  onSubmit,
}) => {
  const [value, setValue] = useState(initialValue);

  React.useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>Rename diagnosis</Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            placeholder="Diagnosis name"
            placeholderTextColor={colors.textMuted}
            style={styles.modalInput}
            selectionColor={colors.green}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonGhost]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonGhostText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => onSubmit(value)}
              activeOpacity={0.8}
              disabled={!value.trim()}
            >
              <Text style={styles.modalButtonPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ==========================================
// ACTION SHEET (long-press menu)
// ==========================================

interface ActionSheetProps {
  analysis: VideoAnalysis | null;
  onClose: () => void;
  onRename: (analysis: VideoAnalysis) => void;
  onDelete: (analysis: VideoAnalysis) => void;
}

const ActionSheet: React.FC<ActionSheetProps> = ({
  analysis,
  onClose,
  onRename,
  onDelete,
}) => {
  if (!analysis) return null;

  return (
    <Modal
      visible={!!analysis}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetCard} onPress={() => {}}>
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {getDisplayName(analysis)}
          </Text>

          <TouchableOpacity
            style={styles.sheetAction}
            onPress={() => {
              onClose();
              onRename(analysis);
            }}
            activeOpacity={0.7}
          >
            <Pencil size={18} color={colors.text} strokeWidth={ICON_STROKE} />
            <Text style={styles.sheetActionText}>Rename</Text>
          </TouchableOpacity>

          <View style={styles.sheetDivider} />

          <TouchableOpacity
            style={styles.sheetAction}
            onPress={() => {
              onClose();
              onDelete(analysis);
            }}
            activeOpacity={0.7}
          >
            <Trash2
              size={18}
              color={colors.danger}
              strokeWidth={ICON_STROKE}
            />
            <Text
              style={[styles.sheetActionText, styles.sheetActionTextDanger]}
            >
              Delete
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

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
      {hasFilter ? (
        <Search size={26} color={colors.green} strokeWidth={1.8} />
      ) : (
        <Leaf size={26} color={colors.green} strokeWidth={1.8} />
      )}
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
      accessibilityRole="button"
      accessibilityLabel="Record a video"
    >
      <ScanLine size={18} color={colors.forest} strokeWidth={2.2} />
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
  const tabBarHeight = useBottomTabBarHeight();

  const {
    analyses,
    isLoading,
    isRefreshing,
    refresh,
    loadMore,
    hasMore,
    renameAnalysis,
    deleteAnalysis,
  } = useDiagnosisList();

  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [menuTarget, setMenuTarget] = useState<VideoAnalysis | null>(null);
  const [renameTarget, setRenameTarget] = useState<VideoAnalysis | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleItemPress = (analysis: VideoAnalysis) => {
    navigation.getParent().navigate("DiagnosisDetail", {
      videoId: analysis._id,
    });
  };

  const handleRecord = () => {
    navigation.getParent()?.navigate("VideoScanning");
  };

  const handleOpenMenu = (analysis: VideoAnalysis) => {
    setMenuTarget(analysis);
  };

  const handleOpenRename = (analysis: VideoAnalysis) => {
    setRenameTarget(analysis);
  };

  const handleSubmitRename = async (value: string) => {
    if (!renameTarget) return;
    const target = renameTarget;
    setRenameTarget(null);
    await renameAnalysis(target._id, value);
  };

  const handleDelete = (analysis: VideoAnalysis) => {
    Alert.alert(
      "Delete diagnosis?",
      `"${getDisplayName(analysis)}" will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteAnalysis(analysis.video._id);
          },
        },
      ],
    );
  };

  const sections = useMemo(() => {
    const filtered =
      activeFilter === "all"
        ? analyses
        : analyses.filter(
            (analysis) => getDateBucket(analysis.createdAt) === activeFilter,
          );

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header />
        <View style={styles.filters}>
          <CategoryFilterList
            categories={FILTERS}
            active={activeFilter}
            onChange={setActiveFilter}
            accessibilityLabel="Filter diagnoses by date"
          />
        </View>
        <View style={{ paddingBottom: tabBarHeight }}>
          <DiagnosisListSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header />
      <View style={styles.filters}>
        <CategoryFilterList
          categories={FILTERS}
          active={activeFilter}
          onChange={setActiveFilter}
          accessibilityLabel="Filter diagnoses by date"
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <DiagnosisItem
            analysis={item}
            onPress={handleItemPress}
            onRename={handleOpenRename}
            onDelete={handleDelete}
            onOpenMenu={handleOpenMenu}
          />
        )}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} count={section.data.length} />
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          sections.length === 0 ? styles.listEmpty : styles.list,
          { paddingBottom: tabBarHeight + spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.green}
            colors={[colors.green]}
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
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        SectionSeparatorComponent={() => (
          <View style={styles.sectionSeparator} />
        )}
      />

      <ActionSheet
        analysis={menuTarget}
        onClose={() => setMenuTarget(null)}
        onRename={handleOpenRename}
        onDelete={handleDelete}
      />

      <RenameModal
        visible={!!renameTarget}
        initialValue={
          renameTarget
            ? (renameTarget.diagnosisName ?? getDisplayName(renameTarget))
            : ""
        }
        onCancel={() => setRenameTarget(null)}
        onSubmit={handleSubmitRename}
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
    backgroundColor: colors.white,
  },

  // Header
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Filters (chips themselves come from the shared CategoryFilterList)
  filters: {
    paddingBottom: spacing.md,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.white,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  sectionCountContainer: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },

  // List
  list: {
    paddingBottom: spacing.xl,
  },
  listEmpty: {
    flexGrow: 1,
  },
  sectionSeparator: {
    height: spacing.sm,
  },

  // Swipeable wrapper
  swipeWrapper: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.xs,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.white,
  },
  swipeContent: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  actionsContainer: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  action: {
    width: ACTION_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  actionRename: {
    backgroundColor: colors.surfaceMuted,
  },
  actionDelete: {
    backgroundColor: colors.borderStrong,
  },

  // Item
  item: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
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
    flexShrink: 0,
  },
  subtitle: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Trailing
  trailing: {
    width: 58,
    alignItems: "flex-end",
    justifyContent: "center",
    flexShrink: 0,
  },
  spinner: {
    fontSize: 18,
    color: colors.textMuted,
  },
  confidenceContainer: {
    alignItems: "flex-end",
  },
  percent: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.green,
  },
  confidenceLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 1,
  },
  failedCircle: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  failed: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },

  // Empty
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    maxWidth: 280,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.lime,
    paddingHorizontal: spacing.xxl,
    height: 46,
    borderRadius: radii.pill,
  },
  emptyButtonText: {
    color: colors.forest,
    fontSize: 15,
    fontWeight: "700",
  },

  // Footer
  footer: {
    paddingVertical: spacing.md,
  },

  // Modal backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
  },

  // Rename modal
  modalCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  modalButtonGhost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  modalButtonGhostText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  modalButtonPrimary: {
    backgroundColor: colors.lime,
  },
  modalButtonPrimaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.forest,
  },

  // Action sheet
  sheetCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  sheetActionTextDanger: {
    color: colors.danger,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.borderStrong,
    marginHorizontal: spacing.lg,
  },

  skeletonList: {
    paddingBottom: spacing.xl,
  },

  skeletonItem: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.xs,
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },

  skeletonContent: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },

  skeletonTrailing: {
    width: 58,
    alignItems: "flex-end",
    gap: 5,
  },
});
