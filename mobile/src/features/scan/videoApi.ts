import FileSystem from "expo-file-system";
import { client } from "../../api/apiClient";

import type {
  CreateVideoUploadRequest,
  CreateVideoUploadResponse,
  IVideo,
} from "./types/videoTypes";

class VideoAPI {
  async requestVideoUpload(
    input: CreateVideoUploadRequest,
    token: string,
    idempotencyKey: string,
  ): Promise<CreateVideoUploadResponse> {
    const response = await client.request<CreateVideoUploadResponse>(
      "/api/v1/videos/upload",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      { token, idempotencyKey },
    );

    return response.result;
  }

  async videoUploadObjectStorage(
    presignedUrl: string,
    file: FileSystem.File,
  ): Promise<void> {
    const data: Uint8Array = await file.bytes();

    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: data as BufferSource,
      headers: {
        "Content-Type": file.type,
      },
    });
  }

  async completeVideoUpload(videoId: string, token: string) {
    const response = await client.request<IVideo>(
      `/api/v1/videos/${videoId}/uploaded`,
      {
        method: "PATCH",
      },
      { token },
    );

    return response;
  }
}

export const videoApi = new VideoAPI();
