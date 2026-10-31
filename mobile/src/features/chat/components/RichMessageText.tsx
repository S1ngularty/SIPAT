import React, { useMemo } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { colors } from "../../../theme";

type Props = {
  text: string;
  /** Short agricultural terms to emphasize. */
  highlightTerms?: string[];
  /** Section titles or important sentences to render bold. */
  boldTexts?: string[];
  style?: StyleProp<TextStyle>;
};

type MarkKind = "bold" | "highlight";

type Mark = {
  start: number;
  end: number;
  kind: MarkKind;
};

type Span = {
  text: string;
  bold: boolean;
  highlight: boolean;
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
      marks.push({ start: index, end: index + entry.length, kind });
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

    spans.push({
      text: text.slice(start, end),
      bold: marks.some(
        (mark) => mark.kind === "bold" && mark.start <= start && mark.end >= end,
      ),
      highlight: marks.some(
        (mark) =>
          mark.kind === "highlight" && mark.start <= start && mark.end >= end,
      ),
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
  style,
}) => {
  const spans = useMemo(
    () => buildSpans(text, highlightTerms, boldTexts),
    [text, highlightTerms, boldTexts],
  );

  return (
    <Text style={style}>
      {spans.map((span, index) => (
        <Text
          key={index}
          style={[span.bold && styles.bold, span.highlight && styles.highlight]}
        >
          {span.text}
        </Text>
      ))}
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
  },
});
