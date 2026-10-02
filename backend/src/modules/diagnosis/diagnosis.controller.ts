import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import type { DiagnosisService } from "./diagnosis.service.js";
import type {
  ApiResponse,
  PaginationQuery,
} from "../../core/types/api.type.js";
import { wrapResponse } from "../../core/utils/response.util.js";

export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  create = async (req: Request, res: Response): Promise<void> => {
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
  };

  getDiagnosisList = async (
    req: Request<{ page: number; limit: number }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { page, limit } = req.params;
      const result = await this.diagnosisService.getDiagnosisList(page, limit);

      wrapResponse("OK", 200, res, result);
    } catch (error) {
      console.log("Diagnosis List erorr:", error);

      next(error);
    }
  };

  getByVideoId = async (
    req: Request<{ videoId: string }>,
    res: Response,
  ): Promise<void> => {
    const { videoId } = req.params;

    if (!videoId) throw new Error("video ID is required");

    const diagnosis = await this.diagnosisService.getDiagnosisByVideoId(
      new Types.ObjectId(videoId),
    );

    const response: ApiResponse<typeof diagnosis> = {
      message: "Diagnosis retrieved successfully",
      success: true,
      result: diagnosis,
    };

    res.status(200).json(response);
  };

  getById = async (
    req: Request<{ diagnosisId: string }>,
    res: Response,
  ): Promise<void> => {
    const { diagnosisId } = req.params;

    if (!diagnosisId) throw new Error("diagosis ID is required");

    const diagnosis = await this.diagnosisService.getDiagnosisById(
      new Types.ObjectId(diagnosisId),
    );

    const response: ApiResponse<typeof diagnosis> = {
      message: "Diagnosis retrieved successfully",
      success: true,
      result: diagnosis,
    };

    res.status(200).json(response);
  };

  updateResults = async(
    req: Request<{ videoId: string }>,
    res: Response,
  ): Promise<void> => {
    const { videoId } = req.params;
    const { results } = req.body;

    if (!videoId) throw new Error("video is required");

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
  };

  deleteByVideoId = async (
    req: Request<{ videoId: string }>,
    res: Response,
  ): Promise<void> => {
    const { videoId } = req.params;

    if (!videoId) throw new Error("video is required");

    await this.diagnosisService.deleteDiagnosisByVideoId(
      new Types.ObjectId(videoId),
    );

    const response: ApiResponse<null> = {
      message: "Diagnosis deleted successfully",
      success: true,
      result: null,
    };

    res.status(200).json(response);
  };
}
