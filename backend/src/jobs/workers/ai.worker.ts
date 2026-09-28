import { Worker } from "bullmq";
import { redis } from "../../infrastructure/redis/redis.client.js";

const worker = new Worker(
  "ai-processing",
  async (job) => {
    console.log("================================");
    console.log("JOB RECEIVED");
    console.log("Job ID:", job.id);
    console.log("Job name:", job.name);
    console.log("Job data:", job.data);
    console.log("================================");

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