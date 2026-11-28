import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ArrowLeft } from "lucide-react-native";
import { colors, spacing } from "../../../theme";
import { useLanguage } from "../../../modules/language/LanguageProvider";
import type { UserStackParamList } from "../../../navigations/UserNavigation";
import { getCropProblemsCopy } from "../copy";
import {
  getCropProblem,
  getCropProblems,
  getEntryText,
  getLocalizedItems,
  getLocalizedList,
  getLocalizedText,
} from "../data";
import type {
  Language,
  TextWithImages,
  Treatment,
} from "../types";
import { CropProblemCarousel } from "../components/CropProblemCarousel";
import { LanguageToggle } from "../components/LanguageToggle";
import { OptionalImageGallery } from "../components/OptionalImageGallery";
import { getCropProblemImageSource } from "../imageAssets";
import { getActionAssetForText } from "../../../utils/actionAssets";

const MARGIN = spacing.xl;

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

/** A plain text section: no card, no border, no icon. */
const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <View style={styles.bulletList}>
    {items.map((item, index) => (
      <View key={`${index}-${item}`} style={styles.bulletRow}>
        <View style={styles.bullet} />
        <Text style={styles.bodyText}>{item}</Text>
      </View>
    ))}
  </View>
);

const hasResolvableImage = (images: string[]): boolean =>
  images.some((path) => getCropProblemImageSource(path) !== null);

const ActionEntryBody: React.FC<{
  text: string;
  images: string[];
  language: Language;
  showActionImage?: boolean;
}> = ({ text, images, language, showActionImage = false }) => {
  const fallback =
    showActionImage && !hasResolvableImage(images)
      ? getActionAssetForText(text)
      : null;

  return (
    <>
      <Text style={styles.bodyText}>{text}</Text>
      {fallback ? (
        <Image
          source={fallback}
          style={styles.entryActionImage}
          resizeMode="cover"
          accessible={false}
        />
      ) : null}
      <OptionalImageGallery images={images} language={language} />
    </>
  );
};

const EntryList: React.FC<{
  entries: TextWithImages[];
  language: Language;
  showActionImages?: boolean;
}> = ({ entries, language, showActionImages = false }) => (
  <View
    style={[
      styles.entryList,
      showActionImages && styles.entryListWithImages,
    ]}
  >
    {entries.map((entry, index) => (
      <View key={entry.id} style={styles.entry}>
        <Text style={styles.entryNumber}>
          {String(index + 1).padStart(2, "0")}
        </Text>
        <View style={styles.entryBody}>
          <ActionEntryBody
            text={getEntryText(entry, language)}
            images={entry.images}
            language={language}
            showActionImage={showActionImages}
          />
        </View>
      </View>
    ))}
  </View>
);

const TreatmentBlock: React.FC<{
  treatment: Treatment;
  language: Language;
}> = ({ treatment, language }) => {
  const copy = getCropProblemsCopy(language);
  const steps = [...treatment.steps].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.treatment}>
      <Text style={styles.treatmentTitle}>
        {getLocalizedText(treatment.category, language)}
      </Text>

      <OptionalImageGallery images={treatment.images} language={language} />

      {treatment.examples.length > 0 ? (
        <View style={styles.subBlock}>
          <Text style={styles.subTitle}>{copy.examples}</Text>
          <BulletList items={getLocalizedItems(treatment.examples, language)} />
        </View>
      ) : null}

      {treatment.cautions.length > 0 ? (
        <View style={styles.subBlock}>
          <Text style={styles.subTitle}>{copy.cautions}</Text>
          <BulletList items={getLocalizedItems(treatment.cautions, language)} />
        </View>
      ) : null}

      {steps.length > 0 ? (
        <View style={styles.subBlock}>
          <Text style={styles.subTitle}>{copy.steps}</Text>
          <View style={[styles.stepList, styles.stepListWithImages]}>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.entry}>
                <Text style={styles.entryNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <View style={styles.entryBody}>
                  <ActionEntryBody
                    text={getLocalizedText(step.text, language)}
                    images={step.images}
                    language={language}
                    showActionImage
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

interface RelatedItem {
  key: string;
  name: string;
  targetId?: string;
}

export const CropProblemDetailScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<UserStackParamList>>();
  const route = useRoute<RouteProp<UserStackParamList, "CropProblemDetail">>();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const copy = getCropProblemsCopy(language);

  const problem = useMemo(
    () => getCropProblem(route.params.id),
    [route.params.id],
  );

  const related = useMemo<RelatedItem[]>(() => {
    if (!problem) return [];

    const all = getCropProblems();

    return problem.differentialDiagnosis.map((value) => {
      const english = value.en.trim().toLowerCase();
      const match = all.find(
        (candidate) =>
          candidate.id === value.en ||
          candidate.slug === value.en ||
          candidate.name.trim().toLowerCase() === english ||
          candidate.localName.en.trim().toLowerCase() === english,
      );

      return {
        key: `${value.en}-${value.tl}`,
        name: getLocalizedText(value, language),
        targetId: match?.id,
      };
    });
  }, [language, problem]);

  const hasSafety =
    !!problem &&
    (problem.safety.ppe.length > 0 ||
      problem.safety.environmentalPrecautions.length > 0 ||
      getLocalizedText(problem.safety.harvestRestrictions, language).trim()
        .length > 0);

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
          {copy.detailNavTitle}
        </Text>

        <LanguageToggle />
      </View>

      {!problem ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>{copy.notFoundTitle}</Text>
          <Text style={styles.notFoundText}>{copy.notFoundBody}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + spacing.xxxl,
          }}
        >
          <View style={styles.headingBlock}>
            <Text style={styles.name}>{problem.name}</Text>
            <Text style={styles.localName}>
              {getLocalizedText(problem.localName, language)}
            </Text>
            {getLocalizedList(problem.affectedCrops, language).length > 0 ? (
              <Text style={styles.cropLine}>
                {getLocalizedList(problem.affectedCrops, language).join(" · ")}
              </Text>
            ) : null}
          </View>

          <CropProblemCarousel images={problem.images} language={language} />

          <Section title={copy.about}>
            <Text style={styles.bodyText}>
              {getLocalizedText(problem.description, language)}
            </Text>
          </Section>

          {problem.symptoms.length > 0 ? (
            <Section title={copy.symptoms}>
              <EntryList entries={problem.symptoms} language={language} />
            </Section>
          ) : null}

          {problem.favorableConditions.length > 0 ? (
            <Section title={copy.favorableConditions}>
              <BulletList
                items={getLocalizedItems(problem.favorableConditions, language)}
              />
            </Section>
          ) : null}

          {problem.transmission.length > 0 ? (
            <Section title={copy.transmission}>
              <BulletList
                items={getLocalizedItems(problem.transmission, language)}
              />
            </Section>
          ) : null}

          {related.length > 0 ? (
            <Section title={copy.differentialDiagnosis}>
              <View style={styles.relatedList}>
                {related.map((item, index) => {
                  const isLast = index === related.length - 1;
                  const content = (
                    <Text
                      style={[
                        styles.relatedText,
                        item.targetId ? styles.relatedLink : null,
                      ]}
                    >
                      {item.name}
                    </Text>
                  );

                  return item.targetId ? (
                    <Pressable
                      key={item.key}
                      onPress={() =>
                        navigation.push("CropProblemDetail", {
                          id: item.targetId as string,
                        })
                      }
                      style={({ pressed }) => [
                        styles.relatedRow,
                        !isLast && styles.relatedDivider,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={copy.openRelated(item.name)}
                    >
                      {content}
                    </Pressable>
                  ) : (
                    <View
                      key={item.key}
                      style={[
                        styles.relatedRow,
                        !isLast && styles.relatedDivider,
                      ]}
                    >
                      {content}
                    </View>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {problem.management.length > 0 ? (
            <Section title={copy.management}>
              <EntryList
                entries={problem.management}
                language={language}
                showActionImages
              />
            </Section>
          ) : null}

          {problem.treatments.length > 0 ? (
            <Section title={copy.treatments}>
              <View style={styles.treatmentList}>
                {problem.treatments.map((treatment) => (
                  <TreatmentBlock
                    key={treatment.id}
                    treatment={treatment}
                    language={language}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          {problem.diagnosisGuidance.length > 0 ? (
            <Section title={copy.diagnosisGuidance}>
              <EntryList
                entries={problem.diagnosisGuidance}
                language={language}
              />
            </Section>
          ) : null}

          {hasSafety ? (
            <Section title={copy.safety}>
              {problem.safety.ppe.length > 0 ? (
                <View style={styles.subBlock}>
                  <Text style={styles.subTitle}>{copy.ppe}</Text>
                  <BulletList
                    items={getLocalizedItems(problem.safety.ppe, language)}
                  />
                </View>
              ) : null}

              {problem.safety.environmentalPrecautions.length > 0 ? (
                <View style={styles.subBlock}>
                  <Text style={styles.subTitle}>
                    {copy.environmentalPrecautions}
                  </Text>
                  <BulletList
                    items={getLocalizedItems(
                      problem.safety.environmentalPrecautions,
                      language,
                    )}
                  />
                </View>
              ) : null}

              {getLocalizedText(
                problem.safety.harvestRestrictions,
                language,
              ).trim().length > 0 ? (
                <View style={styles.subBlock}>
                  <Text style={styles.subTitle}>
                    {copy.harvestRestrictions}
                  </Text>
                  <Text style={styles.bodyText}>
                    {getLocalizedText(
                      problem.safety.harvestRestrictions,
                      language,
                    )}
                  </Text>
                </View>
              ) : null}
            </Section>
          ) : null}
        </ScrollView>
      )}
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
  headingBlock: {
    paddingHorizontal: MARGIN,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  name: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.6,
  },
  localName: {
    marginTop: spacing.sm,
    fontSize: 16,
    lineHeight: 23,
    color: colors.textMuted,
  },
  cropLine: {
    marginTop: spacing.md,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  section: {
    paddingHorizontal: MARGIN,
    paddingTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.2,
  },
  sectionBody: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    backgroundColor: colors.borderStrong,
    flexShrink: 0,
  },
  entryList: {
    gap: spacing.lg,
  },
  entryListWithImages: {
    gap: spacing.xxxl,
  },
  entry: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  entryNumber: {
    minWidth: 24,
    marginTop: 1,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  entryBody: {
    flex: 1,
    minWidth: 0,
  },
  entryActionImage: {
    width: 270,
    height: 270,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.md,
  },
  relatedList: {
    marginTop: -spacing.xs,
  },
  relatedRow: {
    paddingVertical: spacing.md,
  },
  relatedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  relatedText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  relatedLink: {
    color: colors.green,
    fontWeight: "500",
  },
  treatmentList: {
    gap: spacing.xxl,
  },
  treatment: {
    gap: spacing.md,
  },
  treatmentTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "600",
    color: colors.text,
  },
  subBlock: {
    gap: spacing.sm,
  },
  subTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.textMuted,
  },
  stepList: {
    gap: spacing.lg,
  },
  stepListWithImages: {
    gap: spacing.xxxl,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  notFoundTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  notFoundText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
