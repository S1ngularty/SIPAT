import { useState, useCallback, useEffect, useRef } from "react";
import { diagnosisApi } from "../diagnosisApi";
import type { VideoAnalysis } from "../diagnosisTypes";

const POLL_INTERVAL = 5000;
const PAGE_SIZE = 10;

export const useDiagnosisList = () => {
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAnalyses = useCallback(
    async (pageNum: number, replace: boolean = false) => {
      try {
        const result = await diagnosisApi.diagnosisList({
          page: pageNum,
          limit: PAGE_SIZE,
        });

        const fetched = result.data ?? [];
        const totalPages = result.meta.totalPages;

        setAnalyses((prev) => (replace ? fetched : [...prev, ...fetched]));
        setHasMore(pageNum < totalPages);
      } catch (error) {
        console.error("Failed to fetch diagnoses:", error);
      }
    },
    [],
  );

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await fetchAnalyses(1, true);
      setIsLoading(false);
    })();
  }, [fetchAnalyses]);

  useEffect(() => {
    const hasProcessing = analyses.some(
      (a) => a.video?.status === "processing" || a.video?.status === "uploaded",
    );

    if (hasProcessing) {
      pollRef.current = setInterval(async () => {
        await fetchAnalyses(1, true);
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [analyses, fetchAnalyses]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await fetchAnalyses(1, true);
    setIsRefreshing(false);
  }, [fetchAnalyses]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchAnalyses(nextPage, false);
  }, [hasMore, isLoading, page, fetchAnalyses]);

  /**
   * Optimistically renames a video. Falls back to a refresh on failure.
   */
  const renameAnalysis = useCallback(
    async (analysisId: string, newName: string): Promise<boolean> => {
      const trimmed = newName.trim();
      if (!trimmed) return false;

      const prev = analyses;

      // Optimistic update
      setAnalyses((current) =>
        current.map((a) =>
          a._id === analysisId
            ? { ...a, video: { ...a.video!, originalFileName: trimmed } }
            : a,
        ),
      );

      try {
        await diagnosisApi.renameDiagnosis(analysisId, trimmed);
        return true;
      } catch (err) {
        console.error("Rename failed:", err);
        setAnalyses(prev); // rollback
        return false;
      }
    },
    [analyses],
  );

  /**
   * Optimistically removes an item. Falls back to a refresh on failure.
   */
  const deleteAnalysis = useCallback(
    async (analysisId: string): Promise<boolean> => {
      const prev = analyses;

      setAnalyses((current) => current.filter((a) => a._id !== analysisId));

      try {
        await diagnosisApi.deleteDiagnosis(analysisId);
        return true;
      } catch (err) {
        console.error("Delete failed:", err);
        setAnalyses(prev); // rollback
        return false;
      }
    },
    [analyses],
  );

  return {
    analyses,
    isLoading,
    isRefreshing,
    refresh,
    loadMore,
    hasMore,
    renameAnalysis,
    deleteAnalysis,
  };
};