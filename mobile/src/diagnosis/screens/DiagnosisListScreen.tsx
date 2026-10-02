import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useDiagnosisList } from "../hooks/useDiagnosisList";
import type { IVideo } from "../../types/video";

// ==========================================
// LIST ITEM
// ==========================================

interface DiagnosisItemProps {
  video: IVideo;
  onPress: (video: IVideo) => void;
}

const DiagnosisItem: React.FC<DiagnosisItemProps> = ({ video, onPress }) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    if (video.status === "processing") {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }),
        -1,
        false,
      );
    }
  }, [video.status]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getStatusLabel = (): string => {
    switch (video.status) {
      case "pending_upload":
        return "Waiting to upload";
      case "uploaded":
        return "Queued for analysis";
      case "processing":
        return "Analyzing";
      case "completed":
        return video.topFinding
          ? `${video.topFinding.crop} · ${video.topFinding.condition}`
          : "Analysis complete";
      case "failed":
        return "Analysis failed";
    }
  };

  const getStatusColor = (): string => {
    switch (video.status) {
      case "completed":
        return "#16a34a";
      case "failed":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  const isProcessing =
    video.status === "processing" || video.status === "uploaded";

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => onPress(video)}
      activeOpacity={0.6}
    >
      {/* Placeholder icon */}
      <View style={[styles.thumbnail, isProcessing && styles.thumbnailDimmed]}>
        <Text style={styles.placeholderIcon}>🎬</Text>
      </View>

      {/* Info */}
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {video.originalFileName || "Untitled video"}
        </Text>
        <Text
          style={[styles.itemStatus, { color: getStatusColor() }]}
          numberOfLines={1}
        >
          {getStatusLabel()}
        </Text>
        <Text style={styles.itemDate}>
          {formatRelativeTime(video.createdAt.toString())}
        </Text>
      </View>

      {/* Right side */}
      <View style={styles.itemRight}>
        {isProcessing && (
          <Animated.View style={spinnerStyle}>
            <Text style={styles.spinnerIcon}>⟳</Text>
          </Animated.View>
        )}

        {video.status === "completed" && video.topFinding && (
          <View style={styles.resultBadge}>
            <Text style={styles.resultBadgeText}>
              {Math.round(video.topFinding.confidence * 100)}%
            </Text>
          </View>
        )}

        {video.status === "failed" && (
          <View style={[styles.resultBadge, styles.failedBadge]}>
            <Text style={styles.failedBadgeText}>!</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ==========================================
// EMPTY STATE
// ==========================================

const EmptyState: React.FC<{ onRecord: () => void }> = ({ onRecord }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>🌱</Text>
    <Text style={styles.emptyTitle}>No diagnoses yet</Text>
    <Text style={styles.emptySubtitle}>
      Record a short video of your crops to get started.
    </Text>
    <TouchableOpacity
      style={styles.emptyButton}
      onPress={onRecord}
      activeOpacity={0.6}
    >
      <Text style={styles.emptyButtonText}>Record Video</Text>
    </TouchableOpacity>
  </View>
);

// ==========================================
// MAIN SCREEN
// ==========================================

export const DiagnosisListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { videos, isLoading, isRefreshing, refresh, loadMore, hasMore } =
    useDiagnosisList();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleItemPress = (video: IVideo) => {
    navigation.navigate("DiagnosisDetail", { videoId: video._id });
  };

  const handleRecord = () => {
    navigation.getParent()?.navigate("VideoScanning");
  };

  if (isLoading && videos.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6b7280" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <DiagnosisItem video={item} onPress={handleItemPress} />
        )}
        contentContainerStyle={
          videos.length === 0 ? styles.emptyListContent : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor="#6b7280"
          />
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={<EmptyState onRecord={handleRecord} />}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#6b7280" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

// ==========================================
// HELPERS
// ==========================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },

  // Item
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  thumbnailDimmed: {
    opacity: 0.5,
  },
  placeholderIcon: {
    fontSize: 26,
  },

  itemContent: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  itemStatus: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    color: "#9ca3af",
  },

  itemRight: {
    marginLeft: 8,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerIcon: {
    fontSize: 20,
    color: "#6b7280",
  },

  resultBadge: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: "center",
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  failedBadge: {
    borderColor: "#fca5a5",
  },
  failedBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#dc2626",
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#16a34a",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#16a34a",
    fontSize: 15,
    fontWeight: "600",
  },

  // Footer
  footerLoader: {
    paddingVertical: 16,
  },
});
