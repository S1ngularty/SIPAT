import type { NextFunction, Request, Response } from "express";
import type { CropProblemService } from "./cropProblem.service.js";
import type { ApiResponse } from "../../core/types/api.type.js";
import { wrapResponse } from "../../core/utils/response.util.js";
import {
  createCropProblemSchema,
  cropProblemListQuerySchema,
  updateCropProblemSchema,
} from "./cropProblem.validation.js";
import type { CropProblemFilter, CreateCropProblemInput } from "./cropProblem.types.js";

/** Drops `undefined` values so the filter matches the domain type exactly. */
function buildFilter(
  query: ReturnType<typeof cropProblemListQuerySchema.parse>,
): CropProblemFilter {
  const filter: CropProblemFilter = {};

  if (query.type) filter.type = query.type;
  if (query.severity) filter.severity = query.severity;
  if (query.category) filter.category = query.category;
  if (query.affectedCrops) filter.affectedCrops = query.affectedCrops;
  if (query.affectedParts) filter.affectedParts = query.affectedParts;
  if (query.reviewStatus) filter.reviewStatus = query.reviewStatus;
  if (query.search) filter.search = query.search;

  return filter;
}

export class CropProblemController {
  constructor(private readonly cropProblemService: CropProblemService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const parsed = createCropProblemSchema.safeParse(req.body);

    if (!parsed.success) {
      wrapResponse("Invalid crop problem payload", 400, res, null, {
        errors: parsed.error.flatten(),
      });
      return;
    }

    const cropProblem = await this.cropProblemService.createCropProblem(
      parsed.data,
    );

    const response: ApiResponse<typeof cropProblem> = {
      message: "Crop problem created successfully",
      success: true,
      result: cropProblem,
    };

    res.status(201).json(response);
  };

  /**
   * Idempotent bulk import used by the admin UI / seeding flows. Accepts either
   * a bare array or `{ cropProblems: [...] }`.
   */
  bulkUpsert = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = req.body as
        | unknown[]
        | { cropProblems?: unknown[]; data?: unknown[] };

      const items = Array.isArray(body)
        ? body
        : (body?.cropProblems ?? body?.data ?? []);

      if (!Array.isArray(items) || items.length === 0) {
        wrapResponse("No crop problems supplied", 400, res, null);
        return;
      }

      const parsedItems: CreateCropProblemInput[] = [];
      const errors: { index: number; errors: unknown }[] = [];

      items.forEach((item, index) => {
        const parsed = createCropProblemSchema.safeParse(item);

        if (parsed.success) {
          parsedItems.push(parsed.data);
        } else {
          errors.push({ index, errors: parsed.error.flatten() });
        }
      });

      const result =
        await this.cropProblemService.upsertCropProblems(parsedItems);

      wrapResponse("Crop problems imported successfully", 207, res, result, {
        invalid: errors.length,
        errors,
      });
    } catch (error) {
      console.log("Crop problem bulk import error:", error);
      next(error);
    }
  };

  getList = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = cropProblemListQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        wrapResponse("Invalid query parameters", 400, res, null, {
          errors: parsed.error.flatten(),
        });
        return;
      }

      const query = parsed.data;
      const result = await this.cropProblemService.getCropProblemList({
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        filter: buildFilter(query),
      });

      wrapResponse("OK", 200, res, result.data, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error) {
      console.log("Crop problem list error:", error);
      next(error);
    }
  };

  getBySlug = async (
    req: Request<{ slug: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const cropProblem = await this.cropProblemService.getCropProblemBySlug(
        req.params.slug,
      );

      const response: ApiResponse<typeof cropProblem> = {
        message: "Crop problem retrieved successfully",
        success: true,
        result: cropProblem,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error && error.message === "Crop problem not found") {
        wrapResponse(error.message, 404, res, null);
        return;
      }

      next(error);
    }
  };

  getByIdentifier = async (
    req: Request<{ identifier: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const cropProblem =
        await this.cropProblemService.getCropProblemByIdentifier(
          req.params.identifier,
        );

      const response: ApiResponse<typeof cropProblem> = {
        message: "Crop problem retrieved successfully",
        success: true,
        result: cropProblem,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error && error.message === "Crop problem not found") {
        wrapResponse(error.message, 404, res, null);
        return;
      }

      next(error);
    }
  };

  update = async (
    req: Request<{ identifier: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = updateCropProblemSchema.safeParse(req.body);

      if (!parsed.success) {
        wrapResponse("Invalid crop problem payload", 400, res, null, {
          errors: parsed.error.flatten(),
        });
        return;
      }

      const cropProblem = await this.cropProblemService.updateCropProblem(
        req.params.identifier,
        parsed.data,
      );

      const response: ApiResponse<typeof cropProblem> = {
        message: "Crop problem updated successfully",
        success: true,
        result: cropProblem,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error && error.message === "Crop problem not found") {
        wrapResponse(error.message, 404, res, null);
        return;
      }

      next(error);
    }
  };

  delete = async (
    req: Request<{ identifier: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.cropProblemService.deleteCropProblem(req.params.identifier);

      const response: ApiResponse<null> = {
        message: "Crop problem deleted successfully",
        success: true,
        result: null,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error && error.message === "Crop problem not found") {
        wrapResponse(error.message, 404, res, null);
        return;
      }

      next(error);
    }
  };
}
