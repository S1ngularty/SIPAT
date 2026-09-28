import { Queue } from "bullmq";
import { redis } from "../../infrastructure/redis/redis.client.js";

export const AIQueue = new Queue("ai-processing", {
  connection: redis,
});
