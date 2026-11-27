import type {
  CropProblemSeverity,
  CropProblemType,
  Language,
} from "./types";

export interface CropProblemsCopy {
  browseTitle: string;
  browseSubtitle: string;
  detailFallbackTitle: string;
  detailNavTitle: string;
  back: string;
  searchPlaceholder: string;
  clearSearch: string;
  seeMore: string;
  filterAll: string;
  filterDisease: string;
  filterPest: string;
  filterHealthy: string;
  results: (count: number) => string;
  offlineReady: string;
  emptyTitle: string;
  emptyBody: string;
  language: string;
  tagalog: string;
  english: string;
  about: string;
  symptoms: string;
  favorableConditions: string;
  transmission: string;
  differentialDiagnosis: string;
  management: string;
  treatments: string;
  diagnosisGuidance: string;
  safety: string;
  sources: string;
  affectedCrops: string;
  affectedParts: string;
  scientificName: string;
  photos: string;
  photoLabel: (index: number) => string;
  photoOf: (index: number, total: number) => string;
  photoPlaceholder: string;
  noPhotoYet: string;
  carouselLabel: string;
  examples: string;
  cautions: string;
  steps: string;
  ppe: string;
  environmentalPrecautions: string;
  harvestRestrictions: string;
  reviewStatus: string;
  version: string;
  notFoundTitle: string;
  notFoundBody: string;
  openRelated: (name: string) => string;
  openSource: (url: string) => string;
  severityLabels: Record<CropProblemSeverity, string>;
  typeLabels: Record<CropProblemType, string>;
  categoryLabels: Record<string, string>;
  reviewStatusLabels: Record<string, string>;
}

const TAGALOG: CropProblemsCopy = {
  browseTitle: "Gabay sa Halaman",
  browseSubtitle: "Mga sakit at peste — sintomas, pag-iwas at paggamot",
  detailFallbackTitle: "Gabay",
  detailNavTitle: "Detalye ng gabay",
  back: "Bumalik",
  searchPlaceholder: "Hanapin ang sakit, peste, o pananim",
  clearSearch: "Burahin ang paghahanap",
  seeMore: "Higit pa",
  filterAll: "Lahat",
  filterDisease: "Sakit",
  filterPest: "Peste",
  filterHealthy: "Malusog",
  results: (count) => `${count} resulta`,
  offlineReady: "Available offline",
  emptyTitle: "Walang nahanap",
  emptyBody: "Subukan ang ibang salita.",
  language: "Wika",
  tagalog: "Tagalog",
  english: "English",
  about: "Paglalarawan",
  symptoms: "Mga Sintomas",
  favorableConditions: "Mga Kondisyon",
  transmission: "Pagkalat",
  differentialDiagnosis: "Iba Pang Posibleng Sakit",
  management: "Pamamahala",
  treatments: "Paggamot",
  diagnosisGuidance: "Gabay sa Pagsusuri",
  safety: "Kaligtasan",
  sources: "Mga Pinagmulan",
  affectedCrops: "Apektadong pananim",
  affectedParts: "Apektadong bahagi",
  scientificName: "Siyentipikong pangalan",
  photos: "Mga larawan",
  photoLabel: (index) => `Larawan ${index}`,
  photoOf: (index, total) => `Larawan ${index} ng ${total}`,
  photoPlaceholder: "Pansamantalang larawan",
  noPhotoYet: "Wala pang larawan",
  carouselLabel: "Mga larawan ng halaman",
  examples: "Mga halimbawa",
  cautions: "Mga paalala",
  steps: "Mga hakbang",
  ppe: "Kagamitang pang-proteksyon",
  environmentalPrecautions: "Pag-iingat sa kapaligiran",
  harvestRestrictions: "Bago ang ani",
  reviewStatus: "Katayuan ng pagsusuri",
  version: "Bersyon",
  notFoundTitle: "Hindi mahanap ang gabay",
  notFoundBody: "Maaaring hindi available ang record na ito sa napiling wika.",
  openRelated: (name) => `Buksan ang gabay para sa ${name}`,
  openSource: (url) => `Buksan ang pinagmulan: ${url}`,
  severityLabels: {
    low: "Mababa",
    medium: "Katamtaman",
    high: "Mataas",
  },
  typeLabels: {
    disease: "Sakit",
    pest: "Peste",
    healthy: "Malusog",
  },
  categoryLabels: {
    fungal: "Fungal",
    oomycete: "Oomycete",
    viral: "Viral",
    bacterial: "Bacterial",
    insect: "Insekto",
    mite: "Mite",
    undetermined: "Hindi tiyak",
    "no-visible-symptoms": "Walang nakikitang sintomas",
  },
  reviewStatusLabels: {
    draft: "Draft",
    reviewed: "Nasuri na",
  },
};

const ENGLISH: CropProblemsCopy = {
  browseTitle: "Crop Care",
  browseSubtitle: "Diseases and pests — symptoms, prevention and treatment",
  detailFallbackTitle: "Guide",
  detailNavTitle: "Guide details",
  back: "Go back",
  searchPlaceholder: "Search diseases, pests, or crops",
  clearSearch: "Clear search",
  seeMore: "See more",
  filterAll: "All",
  filterDisease: "Diseases",
  filterPest: "Pests",
  filterHealthy: "Healthy",
  results: (count) => `${count} result${count === 1 ? "" : "s"}`,
  offlineReady: "Available offline",
  emptyTitle: "No matches",
  emptyBody: "Try another word.",
  language: "Language",
  tagalog: "Tagalog",
  english: "English",
  about: "About",
  symptoms: "Symptoms",
  favorableConditions: "Favorable Conditions",
  transmission: "How It Spreads",
  differentialDiagnosis: "Other Possible Causes",
  management: "Management",
  treatments: "Treatment",
  diagnosisGuidance: "Diagnosis Guidance",
  safety: "Safety",
  sources: "Sources",
  affectedCrops: "Affected crops",
  affectedParts: "Affected parts",
  scientificName: "Scientific name",
  photos: "Photos",
  photoLabel: (index) => `Photo ${index}`,
  photoOf: (index, total) => `Photo ${index} of ${total}`,
  photoPlaceholder: "Image placeholder",
  noPhotoYet: "No photos yet",
  carouselLabel: "Crop photos",
  examples: "Examples",
  cautions: "Cautions",
  steps: "Steps",
  ppe: "Personal protective equipment",
  environmentalPrecautions: "Environmental precautions",
  harvestRestrictions: "Before harvest",
  reviewStatus: "Review status",
  version: "Version",
  notFoundTitle: "Guide not found",
  notFoundBody: "This record may not be available in the selected language.",
  openRelated: (name) => `Open the guide for ${name}`,
  openSource: (url) => `Open source: ${url}`,
  severityLabels: {
    low: "Low",
    medium: "Medium",
    high: "High",
  },
  typeLabels: {
    disease: "Disease",
    pest: "Pest",
    healthy: "Healthy",
  },
  categoryLabels: {
    fungal: "Fungal",
    oomycete: "Oomycete",
    viral: "Viral",
    bacterial: "Bacterial",
    insect: "Insect",
    mite: "Mite",
    undetermined: "Undetermined",
    "no-visible-symptoms": "No visible symptoms",
  },
  reviewStatusLabels: {
    draft: "Draft",
    reviewed: "Reviewed",
  },
};

export const CROP_PROBLEMS_COPY: Record<Language, CropProblemsCopy> = {
  tl: TAGALOG,
  en: ENGLISH,
};

export const getCropProblemsCopy = (language: Language): CropProblemsCopy =>
  CROP_PROBLEMS_COPY[language] ?? CROP_PROBLEMS_COPY.tl;

/** Maps UI filter chips to record `type` values. */
export const FILTER_TYPES = [
  "all",
  "disease",
  "pest",
  "healthy",
] as const;

export type CropProblemFilter = (typeof FILTER_TYPES)[number];
