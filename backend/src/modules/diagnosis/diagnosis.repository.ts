import { Types } from "mongoose";
import { DiagnosisModel } from "./diagnosis.model.js";
import type {
  CreateDiagnosisInput,
  Diagnosis,
  DiagnosisListResult,
} from "./diagnosis.types.js";

export class DiagnosisRepository {
  async create(input: CreateDiagnosisInput): Promise<Diagnosis> {
    console.log("repository input", input);

    const diagnosis = await DiagnosisModel.create(input);

    return diagnosis.toObject();
  }

  async findPaginated(
    page: number,
    limit: number,
  ): Promise<DiagnosisListResult> {
    const skip = (page - 1) * limit;

    const [result] = await DiagnosisModel.aggregate([
      {
        $lookup: {
          from: "videos",
          localField: "videoId",
          foreignField: "_id",
          as: "video",
        },
      },

      {
        $unwind: "$video",
      },

      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],

          total: [{ $count: "count" }],
        },
      },
    ]);

    const total = result.total[0]?.count ?? 0;

    return {
      data: result.data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByVideoId(
    videoId: Types.ObjectId | string,
  ): Promise<Diagnosis | null> {
    return DiagnosisModel.findOne({ videoId }).lean<Diagnosis>().exec();
  }

  async findById(diagnosisId: Types.ObjectId): Promise<Diagnosis | null> {
    return DiagnosisModel.findById(diagnosisId).lean<Diagnosis>().exec();
  }

  async updateByVideoId(
    videoId: Types.ObjectId,
    results: Diagnosis["results"],
  ): Promise<Diagnosis | null> {
    return DiagnosisModel.findOneAndUpdate(
      { videoId },
      { $set: { results } },
      {
        new: true,
        runValidators: true,
      },
    )
      .lean<Diagnosis>()
      .exec();
  }

  async deleteByVideoId(videoId: Types.ObjectId): Promise<Diagnosis | null> {
    return DiagnosisModel.findOneAndDelete({ videoId })
      .lean<Diagnosis>()
      .exec();
  }
}
