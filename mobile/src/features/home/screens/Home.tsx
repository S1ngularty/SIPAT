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
import { OfflineNotice } from "../../../components/common/OfflineNotice";
import { HomeHeroSheet } from "../components/HomeHeroSheet";
import { ChatPromptBar } from "../components/ChatPromptBar";
import { DiagnosisCard } from "../components/DiagnosisCard";
import { AgriTipCard } from "../components/AgriTipCard";
import { BrowseCropProblems } from "../components/KnowledgeShortcuts";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { useWeather } from "../hooks/useWeather";
import { useVideoList } from "../../diagnosis/hooks/useVideoList";
import { useChatbot } from "../../chat/ChatProvider";
import { getSessionTip } from "../utils/agriTips";
import type { VideoListItem } from "../../diagnosis/diagnosisTypes";
import type { TabParamList } from "../../../navigations/HomeTabNavigation";
import type { UserStackParamList } from "../../../navigations/UserNavigation";
import { useNetwork } from "../../../network/NetworkProvider";
import { useLanguage } from "../../../modules/language/LanguageProvider";
import { getCropProblemsCopy } from "../../crop-problems/copy";
import { getCropProblems } from "../../crop-problems/data";
import type { CropProblem } from "../../crop-problems/types";

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
  const { isOffline } = useNetwork();
  const { language } = useLanguage();
  const cropCopy = getCropProblemsCopy(language);

  // Suspended while offline: the list is owned data and needs a session.
  const { videos, isLoading, reload } = useVideoList({ enabled: !isOffline });

  /** Asks for location permission once on mount, then shows the place name. */
  const location = useCurrentLocation({ enabled: !isOffline });

  /**
   * Weather follows the resolved coordinates, so the reading always matches the
   * place shown in the badge. While the GPS fix is pending the block stays in
   * its loading state instead of flashing an error.
   */
  const weather = useWeather({
    coordinates: location.place
      ? {
          latitude: location.place.latitude,
          longitude: location.place.longitude,
        }
      : null,
    locationLabel: location.place?.label,
    pending: location.status === "loading",
    unavailableMessage:
      location.status === "denied"
        ? "Turn on location to see the weather where you are."
        : undefined,
    enabled: !isOffline,
  });

  const {
    isSending: isChatSending,
    send: sendChatMessage,
  } = useChatbot();

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isOffline) reload();
    }, [isOffline, reload]),
  );

  const openVideoScan = useCallback(() => {
    if (isOffline) return;
    navigation.getParent<UserStackNavigation>()?.navigate("VideoScanning");
  }, [isOffline, navigation]);

  const openChat = useCallback(() => {
    if (isOffline) return;
    navigation.getParent<UserStackNavigation>()?.navigate("Chat");
  }, [isOffline, navigation]);

  const openDiagnoses = useCallback(() => {
    if (isOffline) return;
    navigation.navigate("Diagnoses");
  }, [isOffline, navigation]);

  const openDiagnosis = useCallback(
    (item: VideoListItem) => {
      // Rows that have not produced a diagnosis yet (processing / failed) have
      // no detail screen to open.
      if (isOffline || !item.diagnosis) return;

      navigation
        .getParent<UserStackNavigation>()
        ?.navigate("DiagnosisDetail", { videoId: item.diagnosis._id });
    },
    [isOffline, navigation],
  );

  const onRefresh = useCallback(async () => {
    if (isOffline) return;

    setRefreshing(true);
    weather.refresh();
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [isOffline, reload, weather.refresh]);

  /** Weather retry re-resolves the location too, in case that was the failure. */
  const retryWeather = useCallback(() => {
    if (isOffline) return;

    location.refresh();
    weather.refresh();
  }, [isOffline, location.refresh, weather.refresh]);

  /**
   * Opens the offline crop-care browser. The guide reads from the JSON bundle,
   * so this works in limited mode too.
   */
  const openProblem = useCallback(
    (problem: CropProblem) => {
      navigation
        .getParent<UserStackNavigation>()
        ?.navigate("CropProblemDetail", { id: problem.id });
    },
    [navigation],
  );

  const openAllProblems = useCallback(() => {
    navigation.getParent<UserStackNavigation>()?.navigate("CropProblems");
  }, [navigation]);

  /**
   * Sends the prompt, then opens the conversation screen. The message is added
   * to the shared history synchronously, so the chat screen already shows it.
   */
  const handleChatSend = useCallback(
    (message: string) => {
      if (isOffline) return;
      void sendChatMessage(message);
      openChat();
    },
    [isOffline, openChat, sendChatMessage],
  );

  const handleChatMic = useCallback(() => {
    if (isOffline) return;
    Alert.alert("Flora", "Voice questions are coming soon.");
  }, [isOffline]);

  const displayName =
    user?.firstName || user?.fullName || user?.username || "Farmer";

  /** The newest videos with their diagnosis, newest-first. */
  const latestDiagnoses = useMemo(
    () =>
      [...videos]
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )
        .slice(0, MAX_HOME_DIAGNOSES),
    [videos],
  );

  const hasMoreDiagnoses = videos.length > MAX_HOME_DIAGNOSES;

  /** First three guide records; tapping one opens its detail directly. */
  const homeProblems = useMemo(() => getCropProblems().slice(0, 3), []);

  /** Picked once per app session (module-level), so it's stable while open. */
  const tip = getSessionTip();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + spacing.xxl }}
        refreshControl={
          isOffline ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.green}
              colors={[colors.green]}
            />
          )
        }
      >
        <HomeHeroSheet
          name={displayName}
          avatarUrl={user?.imageUrl}
          onPressAvatar={() => navigation.navigate("Profile")}
          onPressNotifications={openDiagnoses}
          onPressChat={openChat}
          location={location}
          weather={weather.state}
          onPressWeatherRetry={retryWeather}
          isOffline={isOffline}
        />

        {isOffline ? <OfflineNotice /> : null}

        {isOffline ? null : (
          <ChatPromptBar
            onSend={handleChatSend}
            onPressMic={handleChatMic}
            isSending={isChatSending}
          />
        )}

        {/* <SectionHeader title="Agri Tips" />

        {tip ? <AgriTipCard tip={tip} /> : null} */}

        {isOffline ? null : (
          <>
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
                    item={item}
                    variant="row"
                    onPress={openDiagnosis}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <SectionHeader title={cropCopy.browseTitle} />

        <BrowseCropProblems
          problems={homeProblems}
          seeMoreLabel={cropCopy.seeMore}
          onPressProblem={openProblem}
          onPressSeeMore={openAllProblems}
        />
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
