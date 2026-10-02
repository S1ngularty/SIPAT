import { Types } from "mongoose";
import { DiagnosisModel } from "./diagnosis.model.js";
import type { CreateDiagnosisInput, Diagnosis } from "./diagnosis.types.js";

export class DiagnosisRepository {
  async create(input: CreateDiagnosisInput): Promise<Diagnosis> {
    console.log("repository input", input);

    const diagnosis = await DiagnosisModel.create(input);

    return diagnosis.toObject();
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
