import { fastAPIClient } from "../../integrations/fastApi/fastapi.client.js";
import { r2Client } from "../../integrations/storage/r2.client.js";
import { diagnosisService } from "../diagnosis/index.js";
import { VideoRepository } from "./video.repository.js";

class AIProcessingService {
  constructor(private readonly videoRepository: VideoRepository) {}

  async processVideo(videoId: string): Promise<unknown> {
    try {
      if (!videoId) throw new Error("Video Id is missing");

      const video = await this.videoRepository.videoUpdateStatus(videoId, {
        status: "processing",
        processedAt: new Date(Date.now()),
      });

      if (!video) throw new Error("video not found");

      const downloadUrl = await r2Client.createDownloadUrl(
        video.storageKey,
        300,
      );

      if (!downloadUrl) throw new Error("failed to general download url");

      const processResult = await fastAPIClient.aiProcess({
        storage_key: video.storageKey,
        video_url: downloadUrl,
      });

      console.log("processed result log:", processResult);

      if (processResult != null && !processResult.success) {
        await this.videoRepository.videoUpdateStatus(videoId, {
          status: "failed",
        });

        throw new Error(`Failed to Process the video: ${videoId}`);
      }

      const diagnosisData =
        processResult?.results?.map((item) => ({
          trackId: Number(item.track_id),
          crop: item.crop,
          condition: item.condition,
          confidence: Number(item.confidence),
          duration: Number(item.duration),
          observations: Number(item.observations),
          evidenceKey: item.evidence_key,
        })) ?? [];

      console.log("Diagnosis Data ", diagnosisData);

      const createDiagnosis = await diagnosisService.createDiagnosis({
        videoId,
        results: diagnosisData,
      });

      if (!createDiagnosis)
        throw new Error(
          `Failed to create the Diagnosis with video ID: ${videoId}`,
        );

      await this.videoRepository.videoUpdateStatus(videoId, {
        status: "completed",
      });

      return processResult;
      //then return if successfully requested
    } catch (error) {
      console.log(`AI processing Error: ${error}`);
      throw error;
    }
  }
}
