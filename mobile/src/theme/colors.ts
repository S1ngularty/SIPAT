/**
 * SIPAT color tokens.
 *
 * Values follow the agricultural reference in `mobile/DESIGN.md`
 * (forest green surfaces, lime accents, pale sage backgrounds) while keeping a
 * small, semantic set so screens do not hardcode their own palette.
 */
export const colors = {
  /** Dark backgrounds, navigation bar, overlays on photography. */
  forest: "#18351D",
  /** Slightly lighter forest used for gradients on dark surfaces. */
  forestLight: "#2B4A26",
  /** Weather cards, translucent panels. */
  olive: "#30491B",
  /** Secondary agricultural green for subtle accents. */
  green: "#52782B",
  /** Primary actions, selected filters, active navigation. */
  lime: "#86C653",
  /** Pressed/darker lime. */
  limeDark: "#6FAF3E",

  /** Dashboard background and light surfaces. */
  sage: "#EFF3E9",
  /** A marginally deeper sage for separators/skeletons on light surfaces. */
  sageDeep: "#E2E9D8",
  white: "#FFFFFF",

  /** Primary text on light surfaces. */
  text: "#1D1D1B",
  /** Secondary text on light surfaces. */
  textMuted: "#687067",
  /** Text and icons placed on forest/olive surfaces. */
  textOnDark: "#FFFFFF",
  /** Hairline borders on light surfaces. */
  border: "#DCE4D3",

  /** Status colors, used only to communicate meaning. */
  success: "#3F7D50",
  warning: "#C08A2E",
  danger: "#B4433A",
  info: "#3F6C9E",
} as const;

export type ColorToken = keyof typeof colors;
