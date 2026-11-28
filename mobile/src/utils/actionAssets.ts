import type { ImageSourcePropType } from "react-native";

/**
 * Action illustrations bundled with the app. Each file is named after the
 * action it represents, so the same asset can be picked from an explicit
 * `actionRef` or from the wording of a free-form recommendation.
 */
export type ActionAssetKey =
  | "adjust-watering"
  | "check-nutrition"
  | "check-watering"
  | "improve-air-circulation"
  | "isolate-suspicious-plant"
  | "monitor-insect-vectors"
  | "preserve-beneficial-insects"
  | "protect-seedlings"
  | "remove-infected-plant-parts"
  | "remove-infested-leaves"
  | "remove-rotten-fruit"
  | "sanitize-tools"
  | "scouting"
  | "seek-agricultural-advice";

const ACTION_ASSETS: Record<ActionAssetKey, ImageSourcePropType> = {
  "adjust-watering": require("../../assets/action-assets/adjust-watering.jpeg"),
  "check-nutrition": require("../../assets/action-assets/check-nutrition.jpeg"),
  "check-watering": require("../../assets/action-assets/check-watering.jpeg"),
  "improve-air-circulation": require("../../assets/action-assets/improve-air-circulation.jpeg"),
  "isolate-suspicious-plant": require("../../assets/action-assets/isolate-suspicious-plant.jpeg"),
  "monitor-insect-vectors": require("../../assets/action-assets/monitor-insect-vectors.jpeg"),
  "preserve-beneficial-insects": require("../../assets/action-assets/preserve-beneficial-insects.jpeg"),
  "protect-seedlings": require("../../assets/action-assets/protect-seedlings.jpeg"),
  "remove-infected-plant-parts": require("../../assets/action-assets/remove-infected-plant-parts.jpeg"),
  "remove-infested-leaves": require("../../assets/action-assets/remove-infested-leaves.jpeg"),
  "remove-rotten-fruit": require("../../assets/action-assets/remove-rotten-fruit.jpeg"),
  "sanitize-tools": require("../../assets/action-assets/sanitize-tools.jpeg"),
  scouting: require("../../assets/action-assets/scouting.jpeg"),
  "seek-agricultural-advice": require("../../assets/action-assets/seek-agricultural-advice.jpeg"),
};

/** Older records use a few action refs that do not have a one-to-one asset. */
const ACTION_REF_ALIASES: Record<string, ActionAssetKey> = {
  "remove-infested-fruit": "remove-rotten-fruit",
  "remove-infested-plant-parts": "remove-infected-plant-parts",
};

const isActionAssetKey = (value: string): value is ActionAssetKey =>
  Object.prototype.hasOwnProperty.call(ACTION_ASSETS, value);

/** Resolve an explicit `/action-ref` from a crop-problem record. */
export const getActionAssetByRef = (
  ref: string,
): ImageSourcePropType | null => {
  const key = (ref ?? "").trim().replace(/^\/+/, "");
  if (!key) return null;

  const resolved = isActionAssetKey(key) ? key : ACTION_REF_ALIASES[key];
  return resolved ? ACTION_ASSETS[resolved] : null;
};

const normalize = (value: string): string =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

interface ActionTextRule {
  key: ActionAssetKey;
  pattern: RegExp;
}

/**
 * Ordered from specific to general. The first matching rule wins, so a
 * recommendation like "sanitize pruning tools" gets the tools illustration
 * instead of the generic pruning one.
 */
const ACTION_TEXT_RULES: ActionTextRule[] = [
  {
    key: "seek-agricultural-advice",
    pattern:
      /\b(agricultural|farm|extension)\s+(technician|expert|officer|worker)|agricultural advice|agronomist|agriculturist|consult|consultation|expert advice|seek (local )?(agricultural|technical|crop-specific)? ?advice|technical advice|crop-specific advice|local advice|seek confirmation|obtain .*confirmation|diagnostic confirmation|crop-specific confirmation|confirm the host|host-pathogen|ask (an )?(expert|technician)|dalubhasa|teknisyan|konsultahin|kumonsulta|humingi ng payo|magtanong sa (eksperto|teknisyan)\b/,
  },
  {
    key: "sanitize-tools",
    pattern:
      /\b(sanitize|sanitise|disinfect|sterilize|sterilise|clean)\b.*\b(tools?|shears?|pruners?|knives?|knife|equipment|kagamitan)|isopropyl|bleach|alcohol|(linisin|malinis).*kagamitan|desimpektahin\b/,
  },
  {
    key: "remove-rotten-fruit",
    pattern:
      /\b(rotten|decayed|decaying|moldy|mouldy|infected|infested)\b.*\b(fruits?|bunga|prutas)|(remove|pick|harvest|alisin|tanggalin)\b.*\b(fruits?|bunga|prutas)|bulok.*(bunga|prutas)|(bunga|prutas).*bulok\b/,
  },
  {
    key: "remove-infested-leaves",
    pattern:
      /\b(remove|prune|trim|cut|pick|pluck|alisin|tanggalin|putulin)\b.*\b(leaves|leaf|dahon|foliage)\b|\b(infested|affected|infected|damaged|heavily affected)\b.*\b(leaves|leaf|dahon)\b/,
  },
  {
    key: "remove-infected-plant-parts",
    pattern:
      /\b(remove|prune|trim|cut|deadhead|pinch|dispose|itapon|alisin|tanggalin|putulin)\b.*\b(infected|diseased|affected|damaged|dead|decaying|decayed|sick|infested|nahawa|may sakit|apektado)\b|\b(remove|dispose|clean up)\b.*\b(debris|fallen leaves|plant material)\b/,
  },
  {
    key: "improve-air-circulation",
    pattern:
      /\b(air ?flow|air circulation|circulation|ventilat|spacing|spaced|thin|thinning|hangin|sirkulasyon)\b/,
  },
  {
    key: "protect-seedlings",
    pattern:
      /\b(seedlings?|punla|young plants?|bagong tanim|transplant|nursery|row covers?|insect net(ting)?|netting|physical barriers?)\b/,
  },
  {
    key: "preserve-beneficial-insects",
    pattern:
      /\b(beneficial|natural enem(y|ies)|predators?|parasitoids?|ladybugs?|ladybirds?|praying mantis|good insects?|kapaki-pakinabang na kulisap)\b/,
  },
  {
    key: "monitor-insect-vectors",
    pattern:
      /\b(insect vectors?|vectors?|aphids?|whitefl(y|ies)|thrips|mites?|mealybugs?|scale insects?|sticky traps?|yellow sticky|trap crops?|beetles?|larvae|leaf miners?|borers?|frass|entry holes|insects?|pests?|insekto|kulisap|peste)\b/,
  },
  {
    key: "check-nutrition",
    pattern:
      /\b(nutrients?|nutrition|fertiliz|fertilis|pataba|sustansya|nutrisyon|soil test|compost)\b/,
  },
  {
    key: "check-watering",
    pattern:
      /\b(check|test|monitor|inspect|suriin|tingnan)\b.*\b(soil moisture|watering|water|dilig|tubig|lupa)|watering schedule\b/,
  },
  {
    key: "adjust-watering",
    pattern:
      /\b(adjust|modify|change|regulate|control|i-adjust|baguhin)\b.*\b(water|watering|irrigation|dilig|tubig)|\bwater(ing)?\b|irrigat|irrigation|overhead (irrigation|watering)|dilig|tubig|moisture|wetness|wetting|wet plants?|overwater|underwater|drought|mulch|basa.*lupa|tuyo.*lupa\b/,
  },
  {
    key: "isolate-suspicious-plant",
    pattern:
      /\b(isolat|quarantin|separate|ihiwalay|ilayo|hiwalay|keep.*away|away from healthy|avoid.*spread|prevent.*spread|avoid moving|contaminated soil)\b/,
  },
  {
    key: "remove-infected-plant-parts",
    pattern: /\b(prune|pruning|prunin|pinch off|deadhead)\b/,
  },
  {
    key: "scouting",
    pattern:
      /\b(scout|scouting|monitor|monitoring|inspect|inspection|observe|observation|surveillance|check|document|record|regular|nearby plants|symptoms|pagmamanman|inspeksyon|suriin|obserbahan|bantayan)\b/,
  },
];

/** Resolve the illustration for a free-form recommendation. */
export const getActionAssetForText = (
  text: string,
): ImageSourcePropType | null => {
  const normalized = normalize(text ?? "");
  if (!normalized) return null;

  const match = ACTION_TEXT_RULES.find((rule) => rule.pattern.test(normalized));
  return match ? ACTION_ASSETS[match.key] : null;
};

/** Resolve the illustration from an action title plus its explanation. */
export const getActionAsset = (
  title: string,
  explanation = "",
): ImageSourcePropType | null =>
  getActionAssetForText(`${title ?? ""} ${explanation ?? ""}`);
