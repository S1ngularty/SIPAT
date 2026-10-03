import { useCallback, useEffect, useState } from "react";
import { diagnosisApi } from "../diagnosisApi";
import type { DiseaseInfo } from "../diagnosisTypes";

interface UseEvidencePreviewResult {
  diseaseInfo: DiseaseInfo | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const useEvidencePreview = (
  crop: string,
  condition: string,
): UseEvidencePreviewResult => {
  const [diseaseInfo, setDiseaseInfo] = useState<DiseaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const info = await diagnosisApi
        .diseaseInfo(crop, condition)
        .catch(() => null);

      setDiseaseInfo(info);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load disease info");
    } finally {
      setIsLoading(false);
    }
  }, [crop, condition]);

  useEffect(() => {
    load();
  }, [load]);

  return { diseaseInfo, isLoading, error, reload: load };
};