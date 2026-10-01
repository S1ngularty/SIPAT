import type { Request, Response } from "express";
import { Types } from "mongoose";
import type { DiagnosisService } from "./diagnosis.service.js";
import type { CreateDiagnosisInput } from "./diagnosis.types.js";
import type { ApiResponse } from "../../core/types/api.type.js";

export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  async create(req: Request, res: Response): Promise<void> {
    const { videoId, results } = req.body;

    const diagnosis = await this.diagnosisService.createDiagnosis({
      videoId: new Types.ObjectId(videoId),
      results,
    });

    const response: ApiResponse<typeof diagnosis> = {
      message: "Diagnosis created successfully",
      success: true,
      result: diagnosis,
    };

    res.status(201).json(response);
  }

  async getByVideoId(req: Request, res: Response): Promise<void> {
    const { videoId } = req.params;

    if (videoId) throw new Error("video ID is required");

    const diagnosis = await this.diagnosisService.getDiagnosisByVideoId(
      new Types.ObjectId(videoId),
    );

    const response: ApiResponse<typeof diagnosis> = {
      message: "Diagnosis retrieved successfully",
      success: true,
      result: diagnosis,
    };

    res.status(200).json(response);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { diagnosisId } = req.params;

    if (diagnosisId) throw new Error("diagosis ID is required");

    const diagnosis = await this.diagnosisService.getDiagnosisById(
      new Types.ObjectId(diagnosisId),
    );

    const response: ApiResponse<typeof diagnosis> = {
      message: "Diagnosis retrieved successfully",
      success: true,
      result: diagnosis,
    };

    res.status(200).json(response);
  }

  async updateResults(req: Request, res: Response): Promise<void> {
    const { videoId } = req.params;
    const { results } = req.body;

    if (videoId) throw new Error("video is required");

    const diagnosis = await this.diagnosisService.updateDiagnosisResults(
      new Types.ObjectId(videoId),
      results,
    );

    const response: ApiResponse<typeof diagnosis> = {
      message: "Diagnosis updated successfully",
      success: true,
      result: diagnosis,
    };

    res.status(200).json(response);
  }

  async deleteByVideoId(req: Request, res: Response): Promise<void> {
    const { videoId } = req.params;

    if (videoId) throw new Error("video is required");

    await this.diagnosisService.deleteDiagnosisByVideoId(
      new Types.ObjectId(videoId),
    );

    const response: ApiResponse<null> = {
      message: "Diagnosis deleted successfully",
      success: true,
      result: null,
    };

    res.status(200).json(response);
  }
}
