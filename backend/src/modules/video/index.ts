import { VideoRepository } from "./video.repository.js";
import { VideoService } from "./video.service.js";
import { AIProcessingService } from "./ai-processing.service.js";
import { VideoController } from "./video.controller.js";

export const videoRepository = new VideoRepository();
export const videoService = new VideoService(videoRepository);
export const aiProcessingService = new AIProcessingService(videoRepository);
export const videoController = new VideoController(videoService);
