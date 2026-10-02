import { Job, Worker } from "bullmq";
import { redis } from "../../infrastructure/redis/redis.client.js";
import { AIProcessing } from "../../modules/video/ai-processing.service.js";

interface JobData {
  videoId: string;
}

interface JobResponse {
  success: boolean;
  videoId: string;
}

const worker = new Worker<JobData, JobResponse>(
  "ai-processing",
  async (job) => {
    console.log("================================");
    console.log("JOB RECEIVED");
    console.log("Job ID:", job.id);
    console.log("Job name:", job.name);
    console.log("Job data:", job.data);
    console.log("================================");

    const processVideo = await AIProcessing.processVideo(job.data.videoId);

    return {
      success: true,
      videoId: job.data.videoId,
    };
  },
  {
    connection: redis,
  },
);

worker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed`);
  console.log("Result:", result);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed`);
  console.error(error);
});
