import { client } from "../../api/apiClient";
import type { VideoAnalysis } from "./diagnosisTypes";

export interface AnalysisListResult {
  data: {
    results: VideoAnalysis[];
  };
  meta: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

class DiagnosisAPI {
  async diagnosisList({ page = 1, limit = 5 }): Promise<{
    data: VideoAnalysis[];
    meta: { page: number; limit: number; totalPages: number };
  }> {
    const params = new URLSearchParams();

    params.append("page", String(page));
    params.append("limit", String(limit));

    const response = await client.request<VideoAnalysis[]>(
      `/api/v1/diagnosis/list?${params.toString()}`,
      { method: "GET" },
    );

    return {
      data: response.result,
      meta: {
        page: Number(response.meta?.page),
        limit: Number(response.meta?.limit),
        totalPages: Number(response.meta?.total),
      },
    };
  }
}

export const diagnosisApi = new DiagnosisAPI();
