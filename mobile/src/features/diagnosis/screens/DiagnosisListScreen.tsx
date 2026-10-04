import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { useDiagnosisList } from "../hooks/useDiagnosisList";
import type { VideoAnalysis, TrackResult } from "../diagnosisTypes";

// ==========================================
// ICONS
// ==========================================

interface IconProps {
  size?: number;
  color?: string;
}

const SearchIcon: React.FC<IconProps> = ({ size = 22, color = "#9ca3af" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="11"
      cy="11"
      r="7"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20 20L16.5 16.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LeafIcon: React.FC<IconProps> = ({ size = 22, color = "#9ca3af" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 4C20 4 14 3 9.5 7.5C5 12 5 20 5 20C5 20 13 20 17.5 15.5C22 11 20 4 20 4Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 20C5 20 8 15 12 12"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const VideoIcon: React.FC<IconProps> = ({ size = 20, color = "#6b7280" }) => (
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

const PencilIcon: React.FC<IconProps> = ({ size = 22, color = "#374151" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 20L8.5 19L19 8.5C19.5 8 19.5 7 19 6.5L17.5 5C17 4.5 16 4.5 15.5 5L5 15.5L4 20Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <Path d="M14.5 6L18 9.5" stroke={color} strokeWidth="1.5" />
  </Svg>
);

const TrashIcon: React.FC<IconProps> = ({ size = 22, color = "#dc2626" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 7H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <Path
      d="M9 7V5C9 4.5 9.5 4 10 4H14C14.5 4 15 4.5 15 5V7"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 7L8 19C8 19.5 8.5 20 9 20H15C15.5 20 16 19.5 16 19L17 7"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M10 11V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M14 11V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

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
  { value: "older", label: "Older" },
];

interface FilterChipsProps {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ active, onChange }) => (
  <View style={styles.filterContainer}>
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
  </View>
);

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
        if (finished) runOnJS(onDone)();
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
      backgroundColor: "#111827",
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
      runOnJS(showActions)(true);
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
        runOnJS(showActions)(true);
      } else {
        translateX.value = withSpring(0, springConfig);
        runOnJS(showActions)(false);
      }
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e, success) => {
      if (!success) return;
      runOnJS(triggerRipple)(e.x, e.y);
      runOnJS(onPress)();
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      runOnJS(onLongPress)();
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
            <PencilIcon size={22} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, styles.actionDelete]}
            onPress={() => {
              close();
              onDelete();
            }}
            activeOpacity={0.8}
          >
            <TrashIcon size={22} color="#dc2626" />
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
    if (isProcessing) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1200,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    }
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
        return "#16a34a";
      case "failed":
        return "#dc2626";
      default:
        return "#6b7280";
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
          <VideoIcon size={19} color="#6b7280" />
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
            placeholderTextColor="#9ca3af"
            style={styles.modalInput}
            selectionColor="#16a34a"
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
            <PencilIcon size={18} color="#111827" />
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
            <TrashIcon size={18} color="#dc2626" />
            <Text style={[styles.sheetActionText, styles.sheetActionTextDanger]}>
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
      {hasFilter ? <SearchIcon size={22} /> : <LeafIcon size={22} />}
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
            deleteAnalysis(analysis._id);
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

  if (isLoading && analyses.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
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
            ? renameTarget.diagnosisName ?? getDisplayName(renameTarget)
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
    backgroundColor: "#ffffff",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 3,
  },

  // Filters
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  chipsContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
    backgroundColor: "#ffffff",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  // List
  list: {
    paddingBottom: 20,
  },
  listEmpty: {
    flexGrow: 1,
  },
  sectionSeparator: {
    height: 6,
  },

  // Swipeable wrapper
  swipeWrapper: {
    marginHorizontal: 14,
    marginVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  swipeContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
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
    backgroundColor: "#f3f4f6",
  },
  actionDelete: {
    backgroundColor: "#e5e7eb",
  },

  // Item
  item: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    gap: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
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
    flexShrink: 0,
  },
  subtitle: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
  },
  meta: {
    fontSize: 11,
    color: "#9ca3af",
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
    color: "#6b7280",
  },
  confidenceContainer: {
    alignItems: "flex-end",
  },
  percent: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
  },
  confidenceLabel: {
    fontSize: 8,
    color: "#9ca3af",
    marginTop: 1,
  },
  failedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  failed: {
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626",
  },

  // Empty
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 5,
  },
  emptyText: {
    maxWidth: 280,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 19,
  },
  emptyButton: {
    borderWidth: 1.5,
    borderColor: "#16a34a",
    backgroundColor: "#ffffff",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyButtonText: {
    color: "#16a34a",
    fontSize: 13,
    fontWeight: "600",
  },

  // Footer
  footer: {
    paddingVertical: 14,
  },

  // Modal backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  // Rename modal
  modalCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  modalButtonGhost: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalButtonGhostText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  modalButtonPrimary: {
    backgroundColor: "#16a34a",
  },
  modalButtonPrimaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },

  // Action sheet
  sheetCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  sheetActionTextDanger: {
    color: "#dc2626",
  },
  sheetDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
  },
});