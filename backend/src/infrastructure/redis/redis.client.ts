import { Redis } from "ioredis";
import { env } from "../../core/configs/env.config.js";

export const redis = new Redis({
  host: env.redis.redis_host,
  port: Number(env.redis.redis_port),
  maxRetriesPerRequest: null,
});
