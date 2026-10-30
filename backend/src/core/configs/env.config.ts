function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) throw new Error(`Missing environment variable: ${name}`);

  return value;
}

export const env = {
  r2: {
    accountId: requiredEnv("R2_ACCOUNT_ID"),
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    bucketName: requiredEnv("R2_BUCKET_NAME"),
    s3Api: requiredEnv("S3_API"),
  },

  mongoose: {
    db_uri: requiredEnv("DB_URI"),
  },

  redis: {
    redis_host: requiredEnv("REDIS_HOST"),
    redis_port: requiredEnv("REDIS_PORT"),
  },

  fastapi: {
    based_url: requiredEnv("FASTAPI_URL"),
    /**
     * How long the worker waits for `/detection/process` before giving up.
     * Detection downloads the clip, runs YOLO tracking and uploads evidence
     * crops, so it can legitimately take several minutes. Default: 15 minutes.
     */
    timeout_ms:
      Number(process.env.FASTAPI_TIMEOUT_MS) > 0
        ? Number(process.env.FASTAPI_TIMEOUT_MS)
        : 15 * 60 * 1000,
  },
  
  groq:{
    api_key: requiredEnv("GROQ_API_KEY")
  }
};
