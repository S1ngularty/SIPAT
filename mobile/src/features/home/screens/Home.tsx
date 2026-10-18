import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
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
import { HomeHeroSheet } from "../components/HomeHeroSheet";
import { DiagnosisCard } from "../components/DiagnosisCard";
import { BrowseSymptoms, ExploreCropCareCard } from "../components/KnowledgeShortcuts";
import { getWeatherState } from "../weather";
import { useDiagnosisList } from "../../diagnosis/hooks/useDiagnosisList";
import type { VideoAnalysis } from "../../diagnosis/diagnosisTypes";
import type { TabParamList } from "../../../navigations/HomeTabNavigation";
import type { UserStackParamList } from "../../../navigations/UserNavigation";

/** Home only previews the newest diagnoses; the rest live on the Diagnoses tab. */
const MAX_HOME_DIAGNOSES = 3;

type HomeNavigation = BottomTabNavigationProp<TabParamList, "Home">;
type UserStackNavigation = NativeStackNavigationProp<UserStackParamList>;

const SectionHeader: React.FC<{
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
}> = ({ title, actionLabel, onPressAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionLabel && onPressAction ? (
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
    ) : null}
  </View>
);

const DiagnosisRowSkeleton: React.FC = () => (
  <View style={styles.rowSkeleton}>
    <Skeleton width={64} height={64} borderRadius={radii.md} />
    <View style={styles.rowSkeletonBody}>
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

  /**
   * Temporary: the Crop Care guide and symptom browser have no screens yet,
   * so the shortcuts acknowledge the tap instead of navigating nowhere.
   */
  const openCropCare = useCallback(() => {
    Alert.alert(
      "Explore Crop Care",
      "Diseases and pests with symptoms, prevention and treatments — coming soon.",
    );
  }, []);

  const openSymptom = useCallback((symptom: string) => {
    Alert.alert(
      "Browse Symptoms",
      `Possible causes of "${symptom}" — coming soon.`,
    );
  }, []);

  const openAllSymptoms = useCallback(() => {
    Alert.alert(
      "Browse Symptoms",
      "The full symptom list is coming soon.",
    );
  }, []);

  const displayName =
    user?.firstName || user?.fullName || user?.username || "Farmer";

  /** The newest diagnoses only, newest-first. */
  const latestDiagnoses = useMemo(
    () =>
      [...analyses]
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )
        .slice(0, MAX_HOME_DIAGNOSES),
    [analyses],
  );

  const hasMoreDiagnoses = analyses.length > MAX_HOME_DIAGNOSES;

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
          actionLabel={hasMoreDiagnoses ? "See More" : undefined}
          onPressAction={openDiagnoses}
        />

        {isLoading ? (
          <View style={styles.list}>
            <DiagnosisRowSkeleton />
            <DiagnosisRowSkeleton />
            <DiagnosisRowSkeleton />
          </View>
        ) : latestDiagnoses.length === 0 ? (
          <EmptyDiagnoses onRecord={openVideoScan} />
        ) : (
          <View style={styles.list}>
            {latestDiagnoses.map((item) => (
              <DiagnosisCard
                key={item._id}
                analysis={item}
                variant="row"
                onPress={openDiagnosis}
              />
            ))}
          </View>
        )}


        <ExploreCropCareCard onPress={openCropCare} />

        <SectionHeader title="Browse Symptoms" />

        <BrowseSymptoms
          onPressSymptom={openSymptom}
          onPressSeeMore={openAllSymptoms}
        />      </ScrollView>
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
  list: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  rowSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  rowSkeletonBody: {
    flex: 1,
    gap: spacing.sm,
  },
  seeMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    alignSelf: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.forest,
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
