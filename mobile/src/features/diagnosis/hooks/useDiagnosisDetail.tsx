import { useCallback, useEffect, useState } from "react";
import { diagnosisApi } from "../diagnosisApi";
import type { VideoAnalysis } from "../diagnosisTypes";

interface UseDiagnosisDetailResult {
  analysis: VideoAnalysis | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useDiagnosisDetail = (
  videoId: string,
): UseDiagnosisDetailResult => {
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refreshing = false) => {
      try {
        if (refreshing) setIsRefreshing(true);
        else setIsLoading(true);

        setError(null);

        const data = await diagnosisApi.diagnosisDetail(videoId);
        setAnalysis(data);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load diagnosis");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [videoId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { analysis, isLoading, isRefreshing, error, refresh };
};