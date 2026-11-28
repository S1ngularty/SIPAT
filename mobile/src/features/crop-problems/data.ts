import problems from "../../data/crop-problem.json";
import type {
  Bilingual,
  BilingualList,
  CropProblem,
  Language,
  TextWithImages,
} from "./types";

/**
 * Bundled knowledge base. Keeping it in the JS bundle is what makes the
 * browser work without a connection: no API call, no cache to warm.
 *
 * The records are bilingual, so the same dataset serves both languages.
 */
const CROP_PROBLEMS = problems as unknown as CropProblem[];

export const getCropProblems = (): readonly CropProblem[] => CROP_PROBLEMS;

export const getCropProblem = (id: string): CropProblem | undefined =>
  CROP_PROBLEMS.find(
    (problem) => problem.id === id || problem.slug === id,
  );

/** Picks the copy for the active language from a bilingual field. */
export const getLocalizedText = (
  value: Bilingual,
  language: Language,
): string => value[language] ?? value.tl;

/** Picks the copy for the active language from a bilingual list field. */
export const getLocalizedList = (
  value: BilingualList,
  language: Language,
): string[] => value[language] ?? value.tl;

/** Picks the copy for the active language from a list of bilingual values. */
export const getLocalizedItems = (
  items: readonly Bilingual[],
  language: Language,
): string[] => items.map((item) => getLocalizedText(item, language));

/** Picks the copy for the active language from an entry's `text` field. */
export const getEntryText = (
  entry: TextWithImages,
  language: Language,
): string => getLocalizedText(entry.text, language);

const normalizeSearchText = (value: string): string =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Search across every string in a record, in both languages. A query typed in
 * either language finds the same record even while the UI shows the other one.
 */
const buildSearchText = (problem: CropProblem): string =>
  [
    problem.id,
    problem.slug,
    problem.name,
    problem.localName.tl,
    problem.localName.en,
    problem.scientificName,
    problem.type,
    problem.category,
    problem.severity,
    problem.description.tl,
    problem.description.en,
    ...problem.affectedCrops.tl,
    ...problem.affectedCrops.en,
    ...problem.affectedParts.tl,
    ...problem.affectedParts.en,
    ...problem.favorableConditions.flatMap((item) => [item.tl, item.en]),
    ...problem.transmission.flatMap((item) => [item.tl, item.en]),
    ...problem.differentialDiagnosis.flatMap((item) => [item.tl, item.en]),
    ...problem.symptoms.flatMap((entry) => [entry.text.tl, entry.text.en]),
    ...problem.management.flatMap((entry) => [entry.text.tl, entry.text.en]),
    ...problem.diagnosisGuidance.flatMap((entry) => [
      entry.text.tl,
      entry.text.en,
    ]),
    ...problem.treatments.flatMap((treatment) => [
      treatment.category.tl,
      treatment.category.en,
      ...treatment.examples.flatMap((item) => [item.tl, item.en]),
      ...treatment.cautions.flatMap((item) => [item.tl, item.en]),
      ...treatment.steps.flatMap((step) => [step.text.tl, step.text.en]),
    ]),
    ...problem.metadata.sources,
  ]
    .filter(Boolean)
    .join(" ");

/**
 * Token-based search: every word in the query must appear somewhere in the
 * record. A trailing `s` is also matched without the plural ending, so
 * "dark spots" finds "dark spot" copy.
 */
export const searchCropProblems = (
  problemsToSearch: readonly CropProblem[],
  query: string,
): readonly CropProblem[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return problemsToSearch;

  const tokens = normalizedQuery.split(" ").filter(Boolean);

  return problemsToSearch.filter((problem) => {
    const haystack = normalizeSearchText(buildSearchText(problem));

    return tokens.every((token) => {
      if (haystack.includes(token)) return true;
      // "spots" -> "spot", "leaves" -> "leave".
      return token.length > 3 && haystack.includes(token.slice(0, -1));
    });
  });
};
