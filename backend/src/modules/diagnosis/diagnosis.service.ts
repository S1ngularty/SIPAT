import { Types } from "mongoose";
import { DiagnosisRepository } from "./diagnosis.repository.js";
import type {
  CreateDiagnosisInput,
  Diagnosis,
  DiagnosisResult,
  DiagnosisWIthDownloadUrls,
  GroqAnalysis,
} from "./diagnosis.types.js";
import { r2Client } from "../../integrations/storage/r2.client.js";
import { thumbnailService, videoService } from "../video/index.js";

export class DiagnosisService {
  constructor(private readonly diagnosisRepository: DiagnosisRepository) {}

  async createDiagnosis(input: CreateDiagnosisInput): Promise<Diagnosis> {
    const existingDiagnosis = await this.diagnosisRepository.findByVideoId(
      input.videoId,
    );

    if (existingDiagnosis) {
      throw new Error("Diagnosis already exists for this video");
    }

    return this.diagnosisRepository.create(input);
  }

  async getDiagnosisList(page = 1, limit = 5) {
    const DiagnosisList = await this.diagnosisRepository.findPaginated(
      page,
      limit,
    );

    // Attach a pre-signed GET so the client can render each video's preview
    // image in the diagnosis list.
    const data = await Promise.all(
      DiagnosisList.data.map(async (item) => ({
        ...item,
        video: {
          ...item.video,
          thumbnailUrl: await thumbnailService.createDownloadUrl(
            item.video.thumbnailStorageKey,
          ),
        },
      })),
    );

    return {
      data,
      meta: {
        page: DiagnosisList.page,
        limit: DiagnosisList.limit,
        totalPages: DiagnosisList.totalPages,
      },
    };
  }

  async getDiagnosisByVideoId(videoId: string): Promise<Diagnosis> {
    const diagnosis = await this.diagnosisRepository.findByVideoId(videoId);

    if (!diagnosis) {
      throw new Error("Diagnosis not found");
    }

    return diagnosis;
  }

  async getDiagnosisById(
    diagnosisId: string,
  ): Promise<DiagnosisWIthDownloadUrls> {
    const diagnosis = await this.diagnosisRepository.findById(diagnosisId);

    if (!diagnosis) {
      throw new Error("Diagnosis not found");
    }

    const results = await Promise.all(
      diagnosis.results.map(async (data) => ({
        ...data,
        evidenceUrl: await r2Client.createDownloadUrl(data.evidenceKey),
      })),
    );

    const video = {
      ...diagnosis.video,
      evidenceVideoUrl: await r2Client.createDownloadUrl(
        diagnosis.video.storageKey,
      ),
      thumbnailUrl: await thumbnailService.createDownloadUrl(
        diagnosis.video.thumbnailStorageKey,
      ),
    };

    return {
      _id: diagnosis._id,
      video,
      results,
      analysis: diagnosis.analysis,
      createdAt: diagnosis.createdAt,
      updatedAt: diagnosis.updatedAt,
    };
  }

  async updateDiagnosisResults(
    videoId: string,
    results: DiagnosisResult[],
  ): Promise<Diagnosis> {
    const diagnosis = await this.diagnosisRepository.updateByVideoId(
      videoId,
      results,
    );

    if (!diagnosis) {
      throw new Error("Diagnosis not found");
    }

    return diagnosis;
  }

  /**
   * Store a (re)generated LLM analysis, including the glossary `terms` the
   * mobile app highlights. `null` clears it.
   */
  async updateDiagnosisAnalysis(
    videoId: string,
    analysis: GroqAnalysis | null,
  ): Promise<Diagnosis> {
    const diagnosis = await this.diagnosisRepository.updateAnalysisByVideoId(
      videoId,
      analysis,
    );

    if (!diagnosis) {
      throw new Error("Diagnosis not found");
    }

    return diagnosis;
  }

  async renameDiagnosis(
    name: string,
    diagnosisId: string,
  ): Promise<{ diagnosisName: string; diagnosisId: Types.ObjectId }> {
    const result = await this.diagnosisRepository.renameDiagnsis(
      name,
      diagnosisId,
    );

    if (!result)
      throw new Error(`Failed to rename the diagnosis ${diagnosisId}`);

    return { diagnosisName: name, diagnosisId: result._id };
  }

  async deleteDiagnosisByVideoId(videoId: string): Promise<Diagnosis> {
    const [diagnosisDoc, videoDoc] = await Promise.all([
      this.diagnosisRepository.deleteByVideoId(videoId),
      videoService.deleteVideo(String(videoId)),
    ]);

    if (!diagnosisDoc) {
      throw new Error("Diagnosis not found");
    }

    return diagnosisDoc;
  }
}
