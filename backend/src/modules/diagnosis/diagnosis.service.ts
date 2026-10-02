import { Types } from "mongoose";
import { DiagnosisRepository } from "./diagnosis.repository.js";
import type {
  CreateDiagnosisInput,
  Diagnosis,
  DiagnosisResult,
} from "./diagnosis.types.js";

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
      data: {
        results: DiagnosisList.data,
      },
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

  async getDiagnosisById(diagnosisId: Types.ObjectId): Promise<Diagnosis> {
    const diagnosis = await this.diagnosisRepository.findById(diagnosisId);

    if (!diagnosis) {
      throw new Error("Diagnosis not found");
    }

    return diagnosis;
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
