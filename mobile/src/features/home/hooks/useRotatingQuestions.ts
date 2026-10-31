import { useCallback, useEffect, useRef, useState } from "react";

export type RotatingQuestionsOptions = {
  /** How often the chip set is replaced. */
  intervalMs?: number;
  /** Fewest chips shown per rotation. */
  minCount?: number;
  /** Most chips shown per rotation. */
  maxCount?: number;
  /** When false, the pool is returned as-is and the timer is not started. */
  enabled?: boolean;
};

const shuffle = (items: readonly string[]): string[] => {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }

  return copy;
};

/** Shuffles the pool and takes a random number of questions from it. */
const pickQuestions = (
  pool: readonly string[],
  minCount: number,
  maxCount: number,
): string[] => {
  if (pool.length === 0) return [];
  if (pool.length <= minCount) return shuffle(pool);

  const upper = Math.min(maxCount, pool.length);
  const lower = Math.min(minCount, upper);
  const count = lower + Math.floor(Math.random() * (upper - lower + 1));

  return shuffle(pool).slice(0, count);
};

const isSameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((question, index) => question === b[index]);

/** Re-rolls until the new set differs, so the chips visibly change each tick. */
const pickFreshQuestions = (
  pool: readonly string[],
  minCount: number,
  maxCount: number,
  previous: readonly string[],
): string[] => {
  let next = pickQuestions(pool, minCount, maxCount);

  for (let attempt = 0; attempt < 5 && isSameSet(next, previous); attempt += 1) {
    next = pickQuestions(pool, minCount, maxCount);
  }

  return next;
};

/**
 * Returns a random, differently-sized slice of `pool` and replaces it on an
 * interval. The count varies per tick so the chip cloud stays uneven in length
 * while the flex-wrap layout decides how many fit on each row.
 */
export function useRotatingQuestions(
  pool: readonly string[],
  {
    intervalMs = 15_000,
    minCount = 2,
    maxCount = 4,
    enabled = true,
  }: RotatingQuestionsOptions = {},
): readonly string[] {
  const [questions, setQuestions] = useState<readonly string[]>(() =>
    pickQuestions(pool, minCount, maxCount),
  );

  const previousRef = useRef<readonly string[]>(questions);

  const rotate = useCallback(() => {
    const next = pickFreshQuestions(pool, minCount, maxCount, previousRef.current);

    previousRef.current = next;
    setQuestions(next);
  }, [pool, minCount, maxCount]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timer = setInterval(rotate, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, intervalMs, rotate]);

  return enabled ? questions : pool;
}
