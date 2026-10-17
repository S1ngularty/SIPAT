import { VideoRepository } from "./video.repository.js";
import { VideoService } from "./video.service.js";
import { ThumbnailService } from "./thumbnail.service.js";
import { AIProcessingService } from "./ai-processing.service.js";
import { VideoController } from "./video.controller.js";

export const videoRepository = new VideoRepository();
export const thumbnailService = new ThumbnailService(videoRepository);
export const videoService = new VideoService(videoRepository, thumbnailService);
export const aiProcessingService = new AIProcessingService(videoRepository);
export const videoController = new VideoController(
  videoService,
  thumbnailService,
);
