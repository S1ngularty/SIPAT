import { Redis } from "ioredis";
import { env } from "../../core/configs/env.config.js";

export const redis = new Redis(env.redis.redis_url);
