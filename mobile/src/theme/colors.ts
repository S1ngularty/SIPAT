/**
 * SIPAT color tokens.
 *
 * The app is built on a white base with neutral dark-grey surfaces and green
 * accents (see DESIGN.md §11 "Implemented SIPAT UI style"):
 *
 * - White screens with hairline outlines; no tinted page backgrounds.
 * - Dark neutral (charcoal) for the navigation bar and dark panels.
 * - Green reserved for actions, active states and status.
 * - White text/icons only over photography or dark surfaces.
 *
 * Green is deliberately not used for large fills: it is an accent, so
 * photography and text stay legible and the UI stays minimal.
 */
export const colors = {
  /** Near-black green used for text/icons on lime actions. */
  forest: "#18351D",
  /** Secondary agricultural green for subtle accents. */
  green: "#52782B",
  /** Primary actions and selected states. */
  lime: "#86C653",

  /** Dark neutral: bottom navigation, dark panels, active chips. */
  charcoal: "#22282A",
  /** White-opacity fill for capsules/buttons on the dark navigation bar. */
  capsuleOnDark: "rgba(255, 255, 255, 0.12)",
  /** Slim hairline for panels/controls placed over photography. */
  outlineOnDark: "rgba(255, 255, 255, 0.26)",
  /** Scrim behind modals/sheets. */
  backdrop: "rgba(34, 40, 42, 0.45)",

  white: "#FFFFFF",
  /** Neutral muted fill: thumbnails, empty-state circles, image placeholders. */
  surfaceMuted: "#F3F4F6",
  /** Shimmer base for loading skeletons (animated with opacity). */
  skeleton: "#D9D9D9",
  /** Slim outline for cards and controls; visible without being heavy. */
  borderStrong: "#D1D6D0",

  /** Primary text on light surfaces. */
  text: "#1D1D1B",
  /** Secondary text on light surfaces. */
  textMuted: "#6B7280",
  /** Text and icons placed on dark surfaces. */
  textOnDark: "#FFFFFF",

  /** Status colors, used only to communicate meaning. */
  success: "#3F7D50",
  warning: "#C08A2E",
  danger: "#B4433A",
} as const;

export type ColorToken = keyof typeof colors;
