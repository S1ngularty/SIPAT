import { fastAPIClient } from "../../integrations/fastApi/fastapi.client.js";
import { r2Client } from "../../integrations/storage/r2.client.js";
import { videoRepository } from "./video.repository.js";

class AIProcessingService {
  async processVideo(videoId: string): Promise<unknown> {
    try {
      if (!videoId) throw new Error("Video Id is missing");

      const video = await videoRepository.findById(videoId);

      if (!video) throw new Error("video not found");

      const downloadUrl = await r2Client.createDownloadUrl(
        video.storageKey,
        300,
      );

      if (!downloadUrl) throw new Error("failed to general download url");

      const processResult = await fastAPIClient.aiProcess({
        storage_key:video.storageKey,
        video_url: downloadUrl,
      });

      console.log("processed result log:", processResult);

      return processResult;
      //then return if successfully requested
    } catch (error) {
      console.log(`AI processing Error: ${error}`);
      throw error;
    }
  }
}

export const AIProcessing = new AIProcessingService();
