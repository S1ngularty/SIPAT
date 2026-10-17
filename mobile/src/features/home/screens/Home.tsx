import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useBottomTabBarHeight,
  type BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useUser } from "@clerk/expo";
import { ArrowRight, ScanLine, Sprout } from "lucide-react-native";

import { colors, radii, spacing } from "../../../theme";
import { Skeleton } from "../../../components/ui/SkeletonComponent";
import {
  CategoryFilterList,
  type CategoryFilter,
} from "../../../components/ui/CategoryFilterList";
import { HomeHeroSheet } from "../components/HomeHeroSheet";
import { DiagnosisCard } from "../components/DiagnosisCard";
import { getWeatherState } from "../weather";
import { useDiagnosisList } from "../../diagnosis/hooks/useDiagnosisList";
import type { VideoAnalysis } from "../../diagnosis/diagnosisTypes";
import { getDateBucket, type DateBucket } from "../utils/diagnosis";
import type { TabParamList } from "../../../navigations/HomeTabNavigation";
import type { UserStackParamList } from "../../../navigations/UserNavigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
/** Card width leaves the next card peeking so horizontal scrolling is obvious. */
const CARD_WIDTH = Math.round(Math.min(260, SCREEN_WIDTH * 0.68));

type HomeNavigation = BottomTabNavigationProp<TabParamList, "Home">;
type UserStackNavigation = NativeStackNavigationProp<UserStackParamList>;

type HomeFilter = "all" | DateBucket;

const HOME_FILTERS: readonly CategoryFilter<HomeFilter>[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7Days", label: "This week" },
  { value: "older", label: "Older" },
];

const SectionHeader: React.FC<{
  title: string;
  actionLabel: string;
  onPressAction: () => void;
}> = ({ title, actionLabel, onPressAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Pressable
      onPress={onPressAction}
      accessibilityRole="button"
      accessibilityLabel={actionLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
    >
      <Text style={styles.seeAllText}>{actionLabel}</Text>
      <ArrowRight size={15} color={colors.green} strokeWidth={2} />
    </Pressable>
  </View>
);

const DiagnosisCardSkeleton: React.FC<{ width: number }> = ({ width }) => (
  <View style={[styles.skeletonCard, { width }]}>
    <Skeleton
      width={width}
      height={Math.round(width * 0.62)}
      borderRadius={0}
    />
    <View style={styles.skeletonBody}>
      <Skeleton width="70%" height={14} borderRadius={4} />
      <Skeleton width="50%" height={11} borderRadius={4} />
      <Skeleton width="40%" height={10} borderRadius={4} />
    </View>
  </View>
);

const EmptyDiagnoses: React.FC<{ onRecord: () => void }> = ({ onRecord }) => (
  <View style={styles.emptyCard}>
    <View style={styles.emptyIcon}>
      <Sprout size={26} color={colors.green} strokeWidth={1.8} />
    </View>
    <Text style={styles.emptyTitle}>No diagnoses yet</Text>
    <Text style={styles.emptyBody}>
      Record a short video of your crops and your results will appear here.
    </Text>
    <Pressable
      onPress={onRecord}
      accessibilityRole="button"
      accessibilityLabel="Record a video"
      style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
    >
      <ScanLine size={18} color={colors.forest} strokeWidth={2.2} />
      <Text style={styles.emptyButtonText}>Record a video</Text>
    </Pressable>
  </View>
);

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigation>();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useUser();

  const { analyses, isLoading, reload } = useDiagnosisList();

  const [activeFilter, setActiveFilter] = useState<HomeFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const openVideoScan = useCallback(() => {
    navigation.getParent<UserStackNavigation>()?.navigate("VideoScanning");
  }, [navigation]);

  const openDiagnoses = useCallback(() => {
    navigation.navigate("Diagnoses");
  }, [navigation]);

  const openDiagnosis = useCallback(
    (analysis: VideoAnalysis) => {
      navigation
        .getParent<UserStackNavigation>()
        ?.navigate("DiagnosisDetail", { videoId: analysis._id });
    },
    [navigation],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const displayName =
    user?.firstName || user?.fullName || user?.username || "Farmer";

  const visibleDiagnoses = useMemo(() => {
    if (activeFilter === "all") return analyses;
    return analyses.filter(
      (analysis) => getDateBucket(analysis.createdAt) === activeFilter,
    );
  }, [analyses, activeFilter]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
            colors={[colors.green]}
          />
        }
      >
        <HomeHeroSheet
          name={displayName}
          avatarUrl={user?.imageUrl}
          onPressAvatar={() => navigation.navigate("Profile")}
          onPressNotifications={openDiagnoses}
          weather={getWeatherState()}
        />

        <SectionHeader
          title="Recent Diagnoses"
          actionLabel="See All"
          onPressAction={openDiagnoses}
        />

        <CategoryFilterList
          categories={HOME_FILTERS}
          active={activeFilter}
          onChange={setActiveFilter}
          accessibilityLabel="Filter diagnoses by date"
        />

        <View style={styles.carousel}>
          {isLoading ? (
            <View style={styles.skeletonRow}>
              <DiagnosisCardSkeleton width={CARD_WIDTH} />
              <DiagnosisCardSkeleton width={CARD_WIDTH} />
            </View>
          ) : visibleDiagnoses.length === 0 ? (
            <EmptyDiagnoses onRecord={openVideoScan} />
          ) : (
            <FlatList
              horizontal
              data={visibleDiagnoses}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <DiagnosisCard
                  analysis={item}
                  width={CARD_WIDTH}
                  onPress={openDiagnosis}
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.cardGap} />}
              contentContainerStyle={styles.carouselContent}
              showsHorizontalScrollIndicator={false}
              style={styles.carouselList}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.green,
  },
  carousel: {
    marginTop: spacing.lg,
  },
  carouselContent: {
    paddingHorizontal: spacing.xl,
  },
  carouselList: {
    flexGrow: 0,
  },
  cardGap: {
    width: spacing.md,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  skeletonCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  skeletonBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 19,
    maxWidth: 280,
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
  pressed: {
    opacity: 0.7,
  },
});

export default HomeScreen;
