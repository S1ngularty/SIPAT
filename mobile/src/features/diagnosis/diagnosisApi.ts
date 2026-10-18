import { client } from "../../api/apiClient";
import type {
  VideoAnalysis,
  VideoListItem,
  DiseaseInfo,
  CropProblem,
  CropProblemTreatment,
} from "./diagnosisTypes";

/** Raw YOLO labels look like `Tomato___Late_blight`; slugs look like `late-blight`. */
const conditionToSlug = (raw: string): string =>
  ((raw ?? "").split("___").pop() ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Human-readable form of a raw YOLO label (`Tomato___Late_blight` → `Late blight`). */
const toReadableName = (raw: string): string =>
  ((raw ?? "").split("___").pop() ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Flatten structured treatment groups into single scannable lines. */
const flattenTreatments = (treatments: CropProblemTreatment[]): string[] =>
  (treatments ?? [])
    .map((treatment) => {
      const category = treatment.category?.trim();
      if (!category) return "";
      return treatment.examples?.length
        ? `${category}: ${treatment.examples.join(", ")}`
        : category;
    })
    .filter((line) => line.length > 0);

/** Map a raw crop-problem record onto the display-ready {@link DiseaseInfo}. */
const toDiseaseInfo = (
  problem: CropProblem,
  crop: string,
  condition: string,
): DiseaseInfo => {
  const description =
    problem.description?.en?.trim() || problem.description?.tl?.trim() || "";

  return {
    slug: problem.slug,
    crop,
    condition,
    name: problem.name,
    localName: problem.localName?.trim() || undefined,
    scientificName: problem.scientificName?.trim() || undefined,
    type: problem.type,
    category: problem.category,
    severity: problem.severity,
    description: description || undefined,
    symptoms: problem.symptoms ?? [],
    favorableConditions: problem.favorableConditions ?? [],
    transmission: problem.transmission ?? [],
    prevention: problem.management ?? [],
    treatment: flattenTreatments(problem.treatments),
    safety: problem.safety ?? null,
    sources: problem.metadata?.sources ?? [],
  };
};

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
  /**
   * Video-driven list that backs the Diagnoses screen: the signed-in user's
   * videos (any status), each left-joined with its diagnosis. Requires a Clerk
   * token because it hits `GET /videos` (session-guarded).
   */
  async videoList({
    page = 1,
    limit = 10,
    token,
  }: {
    page?: number;
    limit?: number;
    token?: string | null;
  } = {}): Promise<{
    data: VideoListItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params = new URLSearchParams();

    params.append("page", String(page));
    params.append("limit", String(limit));

    const response = await client.request<VideoListItem[]>(
      `/api/v1/videos?${params.toString()}`,
      { method: "GET" },
      { token },
    );

    return {
      data: response.result ?? [],
      meta: {
        page: Number(response.meta?.page),
        limit: Number(response.meta?.limit),
        total: Number(response.meta?.total),
        totalPages: Number(response.meta?.totalPages),
      },
    };
  }

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

  /**
   * Fetch a single diagnosis by videoId.
   * Response shape matches the API payload you shared:
   *   { _id, videoId, results: TrackResult[], createdAt, updatedAt }
   */
  async diagnosisDetail(diagnosisId: string): Promise<VideoAnalysis> {
    const response = await client.request<VideoAnalysis>(
      `/api/v1/diagnosis/${diagnosisId}`,
      { method: "GET" },
    );
    return response.result;
  }

  /**
   * Fetch reference guidance (description, symptoms, prevention, treatment)
   * for the condition detected on a crop.
   *
   * Backed by the crop-problem knowledge base:
   *   GET /api/v1/crop-problems/slug/:slug   → exact record, else
   *   GET /api/v1/crop-problems?search=...   → fallback search
   *
   * Returns `null` (not an error) when the knowledge base has no record, so the
   * screen can show its "not available yet" placeholder.
   */
  async diseaseInfo(
    crop: string,
    condition: string,
  ): Promise<DiseaseInfo | null> {
    const slug = conditionToSlug(condition);
    if (!slug) return null;

    let problem = await this.cropProblemBySlug(slug);

    if (!problem) {
      problem = await this.searchCropProblem(slug, toReadableName(condition));
    }

    if (!problem) return null;

    return toDiseaseInfo(problem, crop, condition);
  }

  /** Exact lookup by slug. A 404 means "no record" and resolves to `null`. */
  private async cropProblemBySlug(slug: string): Promise<CropProblem | null> {
    const response = await client
      .request<CropProblem>(
        `/api/v1/crop-problems/slug/${encodeURIComponent(slug)}`,
        { method: "GET" },
      )
      .catch((err: { status?: number }) => {
        if (err?.status === 404) return null;
        throw err;
      });

    return response?.result ?? null;
  }

  /**
   * Fallback for labels whose slug does not match verbatim (e.g. the model says
   * `Tomato_mosaic_virus` while the record is `mosaic-virus`). Only an exact
   * slug or name match is accepted, so we never surface the wrong guidance.
   */
  private async searchCropProblem(
    slug: string,
    name: string,
  ): Promise<CropProblem | null> {
    if (!name) return null;

    const params = new URLSearchParams();
    params.append("search", name);
    params.append("limit", "10");

    try {
      const response = await client.request<CropProblem[]>(
        `/api/v1/crop-problems?${params.toString()}`,
        { method: "GET" },
      );

      const results = response.result ?? [];

      return (
        results.find((problem) => problem.slug === slug) ??
        results.find(
          (problem) => problem.name?.toLowerCase() === name.toLowerCase(),
        ) ??
        null
      );
    } catch {
      return null;
    }
  }

  async renameDiagnosis(
    videoId: string,
    newName: string,
  ): Promise<VideoAnalysis> {
    const response = await client.request<VideoAnalysis>(
      `/api/v1/diagnosis/${videoId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ diagnosisName: newName }),
      },
    );
    return response.result;
  }

  async deleteDiagnosis(videoId: string): Promise<void> {
    await client.request(`/api/v1/diagnosis/video/${videoId}`, {
      method: "DELETE",
    });
  }
}

export const diagnosisApi = new DiagnosisAPI();
