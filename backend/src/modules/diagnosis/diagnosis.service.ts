import { Types } from "mongoose";
import { DiagnosisRepository } from "./diagnosis.repository.js";
import type {
  CreateDiagnosisInput,
  Diagnosis,
  DiagnosisResult,
  DiagnosisWIthDownloadUrls,
} from "./diagnosis.types.js";
import { r2Client } from "../../integrations/storage/r2.client.js";

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

    return {
      data: DiagnosisList.data,
      meta: {
        page: DiagnosisList.page,
        limit: DiagnosisList.limit,
        totalPages: DiagnosisList.totalPages,
      },
    };
  }

  async getDiagnosisByVideoId(videoId: Types.ObjectId): Promise<Diagnosis> {
    const diagnosis = await this.diagnosisRepository.findByVideoId(videoId);

    if (!diagnosis) {
      throw new Error("Diagnosis not found");
    }

    return diagnosis;
  }

  async getDiagnosisById(
    diagnosisId: Types.ObjectId,
  ): Promise<DiagnosisWIthDownloadUrls> {
    const diagnosis = await this.diagnosisRepository.findById(diagnosisId);

    if (!diagnosis) {
      throw new Error("Diagnosis not found");
    }

    const urls = await Promise.all(
      diagnosis.results.map(async (data) => ({
        ...data,
        evidenceUrl: await r2Client.createDownloadUrl(data.evidenceKey),
      })),
    );

    diagnosis.results = urls;
    const serializeData: unknown = diagnosis;

    return serializeData as DiagnosisWIthDownloadUrls;
  }

  async updateDiagnosisResults(
    videoId: Types.ObjectId,
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

  async deleteDiagnosisByVideoId(videoId: Types.ObjectId): Promise<Diagnosis> {
    const diagnosis = await this.diagnosisRepository.deleteByVideoId(videoId);

    if (!diagnosis) {
      throw new Error("Diagnosis not found");
    }

    return diagnosis;
  }
}
