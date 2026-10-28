import React from "react";
import { StyleSheet, Text, TextStyle, StyleProp } from "react-native";

import type { GroqTerm } from "../diagnosisTypes";
import type { TermSegment } from "../utils/termHighlight";

const COLORS = {
  text: "#171717",
  statusText: "#365B40",
  mutedGreen: "#E7EFE8",
};

interface TermHighlightTextProps {
  /** Full plain-text value. Used as the fallback when `segments` is empty. */
  text: string;
  /** Output of `splitByTerms` for `text`. */
  segments: TermSegment[];
  onPressTerm: (term: GroqTerm) => void;
  style?: StyleProp<TextStyle>;
  termStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * Renders a paragraph where glossary terms are tappable, underlined words.
 * Every segment is a nested `<Text>` so the highlights flow inline with the
 * surrounding copy instead of breaking it into blocks.
 */
export const TermHighlightText: React.FC<TermHighlightTextProps> = ({
  text,
  segments,
  onPressTerm,
  style,
  termStyle,
  numberOfLines,
}) => {
  if (!segments.length) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) => {
        const term = segment.term;

        if (!term) {
          return <Text key={`text-${index}`}>{segment.text}</Text>;
        }

        return (
          <Text
            key={`term-${term.id}-${index}`}
            style={[styles.term, termStyle]}
            onPress={() => onPressTerm(term)}
            suppressHighlighting={false}
            accessibilityRole="link"
            accessibilityLabel={`${term.term}. Tap to see its definition.`}
            accessibilityHint="Opens a short explanation of this term"
          >
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  term: {
    color: COLORS.statusText,
    fontWeight: "600",
    textDecorationLine: "underline",
    textDecorationColor: COLORS.statusText,
    backgroundColor: COLORS.mutedGreen,
  },
});
