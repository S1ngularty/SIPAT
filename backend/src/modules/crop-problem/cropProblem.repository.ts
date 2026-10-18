import { Types } from "mongoose";
import { CropProblemModel } from "./cropProblem.model.js";
import type {
  CreateCropProblemInput,
  CropProblem,
  CropProblemBulkUpsertResult,
  CropProblemFilter,
  CropProblemListOptions,
  CropProblemListResult,
  UpdateCropProblemInput,
} from "./cropProblem.types.js";

/**
 * Resolves either a Mongo `_id` or the human-authored `id` to a query. Callers
 * (controllers, services) can pass whichever the client supplied.
 */
function identifierQuery(identifier: string) {
  return Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { id: identifier };
}

export class CropProblemRepository {
  async create(input: CreateCropProblemInput): Promise<CropProblem> {
    const created = await CropProblemModel.create(input);

    return created.toObject();
  }

  /**
   * Idempotent bulk write keyed on the stable `id` field. Existing records are
   * updated in place; new ones are inserted.
   */
  async upsertMany(
    inputs: CreateCropProblemInput[],
  ): Promise<CropProblemBulkUpsertResult> {
    if (inputs.length === 0) {
      return { matched: 0, modified: 0, upserted: 0, total: 0 };
    }

    const result = await CropProblemModel.bulkWrite(
      inputs.map((input) => ({
        updateOne: {
          filter: { id: input.id },
          update: { $set: input },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      total: inputs.length,
    };
  }

  async findByIdentifier(identifier: string): Promise<CropProblem | null> {
    return CropProblemModel.findOne(identifierQuery(identifier))
      .lean<CropProblem>()
      .exec();
  }

  async findBySlug(slug: string): Promise<CropProblem | null> {
    return CropProblemModel.findOne({ slug })
      .lean<CropProblem>()
      .exec();
  }

  async findPaginated(
    options: CropProblemListOptions = {},
  ): Promise<CropProblemListResult> {
    const {
      page = 1,
      limit = 20,
      sortBy = "name",
      sortOrder = "asc",
      filter = {},
    } = options;

    const query = this.buildFilterQuery(filter);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      CropProblemModel.find(query)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean<CropProblem[]>()
        .exec(),
      CropProblemModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateByIdentifier(
    identifier: string,
    updates: UpdateCropProblemInput,
  ): Promise<CropProblem | null> {
    return CropProblemModel.findOneAndUpdate(
      identifierQuery(identifier),
      { $set: updates },
      { new: true, runValidators: true },
    )
      .lean<CropProblem>()
      .exec();
  }

  async deleteByIdentifier(identifier: string): Promise<CropProblem | null> {
    return CropProblemModel.findOneAndDelete(identifierQuery(identifier))
      .lean<CropProblem>()
      .exec();
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await CropProblemModel.countDocuments({ slug }).exec();
    return count > 0;
  }

  async existsById(id: string): Promise<boolean> {
    const count = await CropProblemModel.countDocuments({ id }).exec();
    return count > 0;
  }

  async countAll(): Promise<number> {
    return CropProblemModel.countDocuments().exec();
  }

  private buildFilterQuery(filter: CropProblemFilter) {
    const query: Record<string, unknown> = {};

    if (filter.type) query.type = filter.type;
    if (filter.severity) query.severity = filter.severity;
    if (filter.category) query.category = filter.category;
    if (filter.reviewStatus) query["metadata.reviewStatus"] = filter.reviewStatus;

    if (filter.affectedCrops && filter.affectedCrops.length > 0) {
      query.affectedCrops = { $in: filter.affectedCrops };
    }

    if (filter.affectedParts && filter.affectedParts.length > 0) {
      query.affectedParts = { $in: filter.affectedParts };
    }

    if (filter.search) {
      const escaped = filter.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped, "i");
      query.$or = [
        { name: pattern },
        { slug: pattern },
        { localName: pattern },
        { scientificName: pattern },
      ];
    }

    return query;
  }
}
