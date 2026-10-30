import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../core/configs/env.config.js";

class R2Client {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.r2.bucketName;

    this.client = new S3Client({
      region: "auto",

      endpoint: env.r2.s3Api,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
      },
    });
  }

  async createUploadUrl(
    storageKey: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: 300,
    });
  }

  async createDownloadUrl(
    storageKey: string,
    expiresIn = 300,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    return getSignedUrl(this.client, command, {
      expiresIn,
    });
  }

  async deleteObject(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    await this.client.send(command);
  }

  /**
   * Deletes every object stored under `prefix` (a "directory"), e.g. all files
   * belonging to a single video: `videos/{userId}/{videoId}/`.
   *
   * Objects are removed in batches of up to 1000 per `DeleteObjects` call
   * rather than one by one. A prefix with no matches is a harmless no-op.
   */
  async deletePrefix(prefix: string): Promise<void> {
    let continuationToken: string | undefined;

    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ...(continuationToken
            ? { ContinuationToken: continuationToken }
            : {}),
        }),
      );

      const keys = (listed.Contents ?? [])
        .map((object) => object.Key)
        .filter((key): key is string => Boolean(key));

      if (keys.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: keys.map((Key) => ({ Key })),
            },
          }),
        );
      }

      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }
}

export const r2Client = new R2Client();
