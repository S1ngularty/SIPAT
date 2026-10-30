import { VideoModel } from "./video.model.js";
import type { VideoDocument } from "./video.model.js";
import type {
  ICreateVideo,
  IUpdateVideo,
  IVideoFilter,
  IVideoListOptions,
  IVideoProjection,
  UpdateVideoStatusInput,
  Video,
  VideoStatus,
  VideoWithDiagnosisListResult,
} from "./video.types.js";
import type { QueryFilter, SortOrder } from "mongoose";

export class VideoRepository {
  // ==========================================
  // CREATE
  // ==========================================

  async createVideo(videoData: ICreateVideo): Promise<VideoDocument> {
    return VideoModel.create(videoData);
  }

  // ==========================================
  // READ
  // ==========================================

  async findById(videoId: string): Promise<VideoDocument | null> {
    return VideoModel.findById(videoId).exec();
  }

  async findByIdAndUser(
    videoId: string,
    userId: string,
  ): Promise<VideoDocument | null> {
    return VideoModel.findOne({ _id: videoId, userId }).exec();
  }

  async findByStorageKey(storageKey: string): Promise<VideoDocument | null> {
    return VideoModel.findOne({ storageKey }).exec();
  }

  async findByIdempotencyKey(key: string): Promise<VideoDocument | null> {
    const videoDoc = await VideoModel.findOne({ idempotencyKey: key });
    if (videoDoc) return videoDoc;

    return null;
  }

  async findByUser(userId: string): Promise<VideoDocument[]> {
    return VideoModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findPendingVideos(limit: number = 10): Promise<VideoDocument[]> {
    return VideoModel.find({ status: "uploaded" })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  async getVideosList(options: IVideoListOptions = {}): Promise<{
    videos: VideoDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      filter = {},
      projection,
    } = options;

    const skip = (page - 1) * limit;

    // Build filter
    const filterQuery: QueryFilter<VideoDocument> = {};

    if (filter.userId) filterQuery.userId = filter.userId;
    if (filter.status) filterQuery.status = filter.status;
    if (filter.createdAfter || filter.createdBefore) {
      filterQuery.createdAt = {};
      if (filter.createdAfter) filterQuery.createdAt.$gte = filter.createdAfter;
      if (filter.createdBefore)
        filterQuery.createdAt.$lte = filter.createdBefore;
    }

    // Build sort
    const sortOptions: { [key: string]: SortOrder } = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // Build projection string
    const projectionString = this.buildProjection(projection);

    const query = VideoModel.find(filterQuery);
    if (projectionString) query.select(projectionString);

    const [videos, total] = await Promise.all([
      query.sort(sortOptions).skip(skip).limit(limit).exec(),
      VideoModel.countDocuments(filterQuery).exec(),
    ]);

    return {
      videos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Paginated videos for one user, each left-joined with its diagnosis (when
   * one exists). Videos are returned regardless of status so the client can
   * also show queued / processing recordings.
   */
  async findPaginatedWithDiagnosis(options: {
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<VideoWithDiagnosisListResult> {
    const { userId, page = 1, limit = 10 } = options;

    const skip = (page - 1) * limit;

    const [result] = await VideoModel.aggregate([
      { $match: { userId } },

      { $sort: { createdAt: -1 } },

      {
        $lookup: {
          from: "diagnoses",
          localField: "_id",
          foreignField: "videoId",
          as: "diagnosis",
        },
      },

      // Keep videos that do not have a diagnosis yet.
      {
        $unwind: {
          path: "$diagnosis",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const data = result?.data ?? [];
    const total = result?.total?.[0]?.count ?? 0;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // UPDATE
  // ==========================================

  async updateVideo(
    videoId: string,
    updates: IUpdateVideo,
  ): Promise<VideoDocument | null> {
    return VideoModel.findByIdAndUpdate(
      videoId,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  async videoUpdateStatus(
    videoId: string,
    { status, processedAt }: UpdateVideoStatusInput,
  ): Promise<VideoDocument | null> {
    return VideoModel.findByIdAndUpdate(
      videoId,
      {
        $set: {
          status,
          processedAt: processedAt ?? null,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  async markAsProcessing(videoId: string): Promise<VideoDocument | null> {
    return VideoModel.findByIdAndUpdate(
      videoId,
      { $set: { status: "processing" } },
      { returnDocument: "after" },
    ).exec();
  }

  async markAsCompleted(
    videoId: string,
    processedAt: Date = new Date(),
  ): Promise<VideoDocument | null> {
    return VideoModel.findByIdAndUpdate(
      videoId,
      { $set: { status: "completed", processedAt } },
      { returnDocument: "after" },
    ).exec();
  }

  async markAsFailed(
    videoId: string,
    processedAt: Date = new Date(),
  ): Promise<VideoDocument | null> {
    return VideoModel.findByIdAndUpdate(
      videoId,
      { $set: { status: "failed", processedAt } },
      { returnDocument: "after" },
    ).exec();
  }

  async markAsUploaded(videoId: string): Promise<VideoDocument | null> {
    return VideoModel.findByIdAndUpdate(
      videoId,
      { $set: { status: "uploaded" } },
      { returnDocument: "after" },
    ).exec();
  }

  /**
   * Records the preview-image key on a video the user owns.
   * Scoped by `userId` so a video can never be pointed at another user's object.
   */
  async attachThumbnail(
    videoId: string,
    userId: string,
    thumbnailStorageKey: string,
  ): Promise<VideoDocument | null> {
    return VideoModel.findOneAndUpdate(
      { _id: videoId, userId },
      { $set: { thumbnailStorageKey } },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  // ==========================================
  // DELETE
  // ==========================================

  async deleteVideo(videoId: string): Promise<Video | null> {
    const result = await VideoModel.findByIdAndDelete(videoId).exec();
    return result;
  }

  async deleteByIdAndUser(videoId: string, userId: string): Promise<boolean> {
    const result = await VideoModel.findOneAndDelete({
      _id: videoId,
      userId,
    }).exec();
    return result !== null;
  }

  async deleteByUser(userId: string): Promise<number> {
    const result = await VideoModel.deleteMany({ userId }).exec();
    return result.deletedCount ?? 0;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  async existsById(videoId: string): Promise<boolean> {
    const count = await VideoModel.countDocuments({ _id: videoId }).exec();
    return count > 0;
  }

  async existsByStorageKey(storageKey: string): Promise<boolean> {
    const count = await VideoModel.countDocuments({ storageKey }).exec();
    return count > 0;
  }

  async countByStatus(status: VideoStatus): Promise<number> {
    return VideoModel.countDocuments({ status }).exec();
  }

  async countByUser(userId: string): Promise<number> {
    return VideoModel.countDocuments({ userId }).exec();
  }

  private buildProjection(projection?: IVideoProjection): string {
    if (!projection) return "";

    const fields: string[] = [];
    if (projection.includeStorageKey === false) fields.push("-storageKey");
    if (projection.includeFileSize === false) fields.push("-fileSize");
    if (projection.includeContentType === false) fields.push("-contentType");
    if (projection.includeTimestamps === false)
      fields.push("-createdAt -updatedAt");

    return fields.join(" ");
  }
}

export const videoRepository = new VideoRepository();
