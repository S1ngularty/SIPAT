import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ArrowLeft } from "lucide-react-native";
import { colors, radii, spacing } from "../../../theme";
import { useLanguage } from "../../../modules/language/LanguageProvider";
import type { UserStackParamList } from "../../../navigations/UserNavigation";
import { getCropProblemsCopy } from "../copy";
import { getCropProblems, getLocalizedText, searchCropProblems } from "../data";
import type { CropProblem } from "../types";
import { CropProblemImage } from "../components/CropProblemImage";
import { getFirstAvailableImage } from "../imageAssets";
import { LanguageToggle } from "../components/LanguageToggle";

const CARD_IMAGE_SIZE = 108;

interface ProblemCardProps {
  problem: CropProblem;
  isLast: boolean;
  onPress: (problem: CropProblem) => void;
}

const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  isLast,
  onPress,
}) => {
  const { language } = useLanguage();

  return (
    <Pressable
      onPress={() => onPress(problem)}
      style={({ pressed }) => [
        styles.card,
        !isLast && styles.cardDivider,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${problem.name}. ${getLocalizedText(
        problem.localName,
        language,
      )}`}
    >
      <CropProblemImage
        path={getFirstAvailableImage(problem.images)}
        label={problem.name}
        style={styles.cardImage}
      />

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {problem.name}
        </Text>
        <Text style={styles.cardLocalName} numberOfLines={3}>
          {getLocalizedText(problem.localName, language)}
        </Text>
      </View>
    </Pressable>
  );
};

/**
 * Offline crop-care browser. Everything it shows comes from the bundled
 * bilingual JSON file, so it opens instantly and works with no network at all.
 */
export const CropProblemsScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<UserStackParamList>>();
  const route = useRoute<RouteProp<UserStackParamList, "CropProblems">>();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const copy = getCropProblemsCopy(language);

  const [search, setSearch] = useState(route.params?.query ?? "");

  // Home shortcuts can open this screen with a prefilled query. Re-apply it if
  // the same screen is opened with a different value.
  useEffect(() => {
    if (route.params?.query !== undefined) {
      setSearch(route.params.query);
    }
  }, [route.params?.query]);

  const problems = useMemo(
    () => searchCropProblems(getCropProblems(), search),
    [search],
  );

  const openProblem = useCallback(
    (problem: CropProblem) => {
      Keyboard.dismiss();
      navigation.navigate("CropProblemDetail", { id: problem.id });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.navBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={copy.back}
          hitSlop={8}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={1.8} />
        </Pressable>

        <Text style={styles.navTitle} numberOfLines={1}>
          {copy.browseTitle}
        </Text>

        <LanguageToggle />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={copy.searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          selectionColor={colors.green}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={copy.searchPlaceholder}
        />
      </View>

      <FlatList
        data={problems}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ProblemCard
            problem={item}
            isLast={index === problems.length - 1}
            onPress={openProblem}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing.xxxl },
          problems.length === 0 && styles.listEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
            <Text style={styles.emptyText}>{copy.emptyBody}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  navBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: 0.1,
  },
  searchWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  searchInput: {
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    fontSize: 15,
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  cardDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  cardImage: {
    width: CARD_IMAGE_SIZE,
    height: CARD_IMAGE_SIZE,
    borderRadius: radii.sm,
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  cardLocalName: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
