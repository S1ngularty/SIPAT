import { useCallback, useMemo, useState } from "react";

import type { GroqTerm } from "../diagnosisTypes";
import { normalizeTerms, splitByTerms } from "../utils/termHighlight";
import type { TermSegment } from "../utils/termHighlight";

interface UseGlossaryResult {
  /** Valid glossary terms, longest phrase first. */
  terms: GroqTerm[];
  /** Term whose definition sheet is open, or `null`. */
  activeTerm: GroqTerm | null;
  /** Split any summary/recommendation string into plain + tappable segments. */
  segmentsFor: (text: string | null | undefined) => TermSegment[];
  openTerm: (term: GroqTerm) => void;
  closeTerm: () => void;
}

/**
 * Drives the inline glossary: cleans the terms returned by the LLM, splits text
 * into highlightable segments, and owns the selected-term state for the
 * definition popup.
 */
export const useGlossary = (
  terms: GroqTerm[] | null | undefined,
): UseGlossaryResult => {
  const [activeTerm, setActiveTerm] = useState<GroqTerm | null>(null);

  const safeTerms = useMemo(() => normalizeTerms(terms), [terms]);

  const segmentsFor = useCallback(
    (text: string | null | undefined) => splitByTerms(text ?? "", safeTerms),
    [safeTerms],
  );

  const openTerm = useCallback((term: GroqTerm) => setActiveTerm(term), []);
  const closeTerm = useCallback(() => setActiveTerm(null), []);

  return {
    terms: safeTerms,
    activeTerm,
    segmentsFor,
    openTerm,
    closeTerm,
  };
};
