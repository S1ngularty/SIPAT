import type { TextStyle } from "react-native";

/**
 * Typography scale. The hierarchy should come from size + weight rather than
 * from introducing many colors.
 */
export const typography = {
  screenTitle: { fontSize: 22, fontWeight: "700" } as TextStyle,
  sectionTitle: { fontSize: 19, fontWeight: "700" } as TextStyle,
  cardTitle: { fontSize: 15, fontWeight: "600" } as TextStyle,
  body: { fontSize: 14, fontWeight: "400" } as TextStyle,
  label: { fontSize: 12, fontWeight: "400" } as TextStyle,
  caption: { fontSize: 11, fontWeight: "400" } as TextStyle,
} as const;
