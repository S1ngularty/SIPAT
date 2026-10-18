import { CropProblemRepository } from "./cropProblem.repository.js";
import type {
  CreateCropProblemInput,
  CropProblem,
  CropProblemBulkUpsertResult,
  CropProblemListOptions,
  CropProblemListResult,
  UpdateCropProblemInput,
} from "./cropProblem.types.js";

export class CropProblemService {
  constructor(private readonly cropProblemRepository: CropProblemRepository) {}

  async createCropProblem(
    input: CreateCropProblemInput,
  ): Promise<CropProblem> {
    const [slugExists, idExists] = await Promise.all([
      this.cropProblemRepository.existsBySlug(input.slug),
      this.cropProblemRepository.existsById(input.id),
    ]);

    if (slugExists) {
      throw new Error(`Crop problem with slug "${input.slug}" already exists`);
    }

    if (idExists) {
      throw new Error(`Crop problem with id "${input.id}" already exists`);
    }

    return this.cropProblemRepository.create(input);
  }

  /**
   * Idempotent seed/import path. Records are matched on their stable `id` and
   * updated in place, so re-running a seed never duplicates data.
   */
  async upsertCropProblems(
    inputs: CreateCropProblemInput[],
  ): Promise<CropProblemBulkUpsertResult> {
    return this.cropProblemRepository.upsertMany(inputs);
  }

  async getCropProblemByIdentifier(identifier: string): Promise<CropProblem> {
    const cropProblem =
      await this.cropProblemRepository.findByIdentifier(identifier);

    if (!cropProblem) {
      throw new Error("Crop problem not found");
    }

    return cropProblem;
  }

  async getCropProblemBySlug(slug: string): Promise<CropProblem> {
    const cropProblem = await this.cropProblemRepository.findBySlug(slug);

    if (!cropProblem) {
      throw new Error("Crop problem not found");
    }

    return cropProblem;
  }

  async getCropProblemList(
    options: CropProblemListOptions,
  ): Promise<CropProblemListResult> {
    return this.cropProblemRepository.findPaginated(options);
  }

  async updateCropProblem(
    identifier: string,
    updates: UpdateCropProblemInput,
  ): Promise<CropProblem> {
    const cropProblem = await this.cropProblemRepository.updateByIdentifier(
      identifier,
      updates,
    );

    if (!cropProblem) {
      throw new Error("Crop problem not found");
    }

    return cropProblem;
  }

  async deleteCropProblem(identifier: string): Promise<CropProblem> {
    const cropProblem =
      await this.cropProblemRepository.deleteByIdentifier(identifier);

    if (!cropProblem) {
      throw new Error("Crop problem not found");
    }

    return cropProblem;
  }
}
