import React, { useMemo } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { colors } from "../../../theme";

type Props = {
  text: string;
  /** Short agricultural terms to emphasize. */
  highlightTerms?: string[];
  /** Section titles or important sentences to render bold. */
  boldTexts?: string[];
  /** Called when a highlighted term is tapped (Copy / Ask Flora menu). */
  onPressHighlight?: (term: string) => void;
  style?: StyleProp<TextStyle>;
};

type MarkKind = "bold" | "highlight";

type Mark = {
  start: number;
  end: number;
  kind: MarkKind;
  term: string;
};

type Span = {
  text: string;
  bold: boolean;
  highlight: boolean;
  /** Set when this slice belongs to a tappable highlight term. */
  highlightTerm?: string;
};

/** Finds every literal occurrence of each entry inside the message. */
const collectMarks = (
  text: string,
  entries: readonly string[] | undefined,
  kind: MarkKind,
): Mark[] => {
  if (!entries || entries.length === 0) return [];

  const marks: Mark[] = [];

  for (const raw of entries) {
    const entry = raw.trim();

    if (entry === "") continue;

    let index = text.indexOf(entry);

    while (index !== -1) {
      marks.push({ start: index, end: index + entry.length, kind, term: entry });
      index = text.indexOf(entry, index + entry.length);
    }
  }

  return marks;
};

/**
 * Splits the message at every mark boundary and records which styles apply to
 * each slice. Overlapping entries (e.g. a highlight inside a bold sentence)
 * end up with both styles instead of one winning.
 */
const buildSpans = (
  text: string,
  highlightTerms?: string[],
  boldTexts?: string[],
): Span[] => {
  const marks = [
    ...collectMarks(text, boldTexts, "bold"),
    ...collectMarks(text, highlightTerms, "highlight"),
  ];

  if (marks.length === 0) {
    return [{ text, bold: false, highlight: false }];
  }

  const boundaries = new Set<number>([0, text.length]);

  for (const mark of marks) {
    boundaries.add(mark.start);
    boundaries.add(mark.end);
  }

  const points = [...boundaries].sort((a, b) => a - b);
  const spans: Span[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];

    if (end <= start) continue;

    const covers = (mark: Mark) => mark.start <= start && mark.end >= end;
    const highlights = marks.filter(
      (mark) => mark.kind === "highlight" && covers(mark),
    );
    const longestHighlight = highlights.reduce<Mark | undefined>(
      (longest, mark) =>
        !longest || mark.end - mark.start > longest.end - longest.start
          ? mark
          : longest,
      undefined,
    );

    spans.push({
      text: text.slice(start, end),
      bold: marks.some((mark) => mark.kind === "bold" && covers(mark)),
      highlight: highlights.length > 0,
      ...(longestHighlight ? { highlightTerm: longestHighlight.term } : {}),
    });
  }

  return spans;
};

/**
 * Renders assistant text with the metadata the backend validated: `boldTexts`
 * for emphasis and `highlightTerms` for agricultural terms. Plain messages
 * render as a single unstyled span.
 */
export const RichMessageText: React.FC<Props> = ({
  text,
  highlightTerms,
  boldTexts,
  onPressHighlight,
  style,
}) => {
  const spans = useMemo(
    () => buildSpans(text, highlightTerms, boldTexts),
    [text, highlightTerms, boldTexts],
  );

  return (
    <Text style={style}>
      {spans.map((span, index) => {
        const term = span.highlightTerm;
        const handlePress =
          term && onPressHighlight ? () => onPressHighlight(term) : undefined;

        return (
          <Text
            key={index}
            style={[
              span.bold && styles.bold,
              span.highlight && styles.highlight,
            ]}
            onPress={handlePress}
            accessibilityRole={handlePress ? "button" : undefined}
            accessibilityLabel={handlePress ? term : undefined}
            accessibilityHint={
              handlePress ? "Choose to copy or ask Flora about it" : undefined
            }
          >
            {span.text}
          </Text>
        );
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  bold: {
    fontWeight: "700",
    color: colors.text,
  },
  highlight: {
    fontWeight: "600",
    color: colors.green,
    backgroundColor: "#EAF3DF",
    textDecorationLine: "underline",
    textDecorationColor: colors.green,
  },
});
