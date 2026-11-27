import tagalogProblems from "../../data/crop-problems-tagalog.json";
import englishProblems from "../../data/crop-problems-english.json";
import type {
  CropProblem,
  CropProblemTextEntry,
  Language,
} from "./types";

/**
 * Bundled knowledge base. Keeping both files in the JS bundle is what makes
 * the browser work without a connection: no API call, no cache to warm.
 */
const DATASETS: Record<Language, readonly CropProblem[]> = {
  tl: tagalogProblems as unknown as CropProblem[],
  en: englishProblems as unknown as CropProblem[],
};

export const getCropProblems = (language: Language): readonly CropProblem[] =>
  DATASETS[language] ?? DATASETS.tl;

export const getCropProblem = (
  id: string,
  language: Language,
): CropProblem | undefined =>
  getCropProblems(language).find(
    (problem) => problem.id === id || problem.slug === id,
  );

/** Picks the copy for the active language from a bilingual entry. */
export const getEntryText = (
  entry: CropProblemTextEntry,
  language: Language,
): string => (language === "tl" ? entry.text : (entry.textEn ?? entry.text));

const normalizeSearchText = (value: string): string =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Search across every string in a record, in both languages. The English file
 * mirrors the Tagalog one by id, so a query typed in either language finds the
 * same record even while the UI shows the other language.
 */
const buildSearchText = (problem: CropProblem): string =>
  [
    problem.name,
    problem.localName,
    problem.scientificName,
    problem.type,
    problem.category,
    problem.severity,
    problem.description.tl,
    problem.description.en,
    ...problem.affectedCrops,
    ...problem.affectedParts,
    ...problem.favorableConditions,
    ...problem.transmission,
    ...problem.differentialDiagnosis,
    ...problem.symptoms.flatMap((entry) => [entry.text, entry.textEn ?? ""]),
    ...problem.management.flatMap((entry) => [entry.text, entry.textEn ?? ""]),
    ...problem.diagnosisGuidance.flatMap((entry) => [
      entry.text,
      entry.textEn ?? "",
    ]),
    ...problem.treatments.flatMap((treatment) => [
      treatment.category,
      ...treatment.examples,
      ...treatment.cautions,
      ...treatment.steps.map((step) => step.text),
    ]),
    ...problem.metadata.sources,
  ]
    .filter(Boolean)
    .join(" ");

const getCounterpart = (
  problem: CropProblem,
  language: Language,
): CropProblem | undefined => {
  const otherLanguage: Language = language === "tl" ? "en" : "tl";
  return DATASETS[otherLanguage].find((candidate) => candidate.id === problem.id);
};

/**
 * Token-based search: every word in the query must appear somewhere in the
 * record. A trailing `s` is also matched without the plural ending, so
 * "dark spots" finds "dark spot" copy.
 */
export const searchCropProblems = (
  problems: readonly CropProblem[],
  query: string,
  language: Language,
): readonly CropProblem[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return problems;

  const tokens = normalizedQuery.split(" ").filter(Boolean);

  return problems.filter((problem) => {
    const counterpart = getCounterpart(problem, language);
    const haystack = normalizeSearchText(
      `${buildSearchText(problem)} ${
        counterpart ? buildSearchText(counterpart) : ""
      }`,
    );

    return tokens.every((token) => {
      if (haystack.includes(token)) return true;
      // "spots" -> "spot", "leaves" -> "leave".
      return token.length > 3 && haystack.includes(token.slice(0, -1));
    });
  });
};
