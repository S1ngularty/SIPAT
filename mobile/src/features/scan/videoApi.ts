import { client } from "../../api/apiClient";

import type {
  AttachThumbnailResponse,
  CreateVideoUploadRequest,
  CreateVideoUploadResponse,
  IVideo,
  PresignedThumbnailUploadResponse,
} from "../../types/video";

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

  /**
   * PUTs a local file to object storage with a presigned URL.
   *
   * Deliberately uses `XMLHttpRequest` instead of `fetch`, and passes the file as
   * React Native's `{ uri }` body form. Both choices are load-bearing:
   *
   * 1. `fetch` is replaced by Expo's winter runtime (SDK 54+). Its
   *    `normalizeBodyInitAsync` understands only string / Blob / ArrayBuffer /
   *    FormData / ReadableStream and throws `Unsupported BodyInit type` for
   *    anything else, so RN's `{ uri }` file body cannot go through it.
   *    `XMLHttpRequest` is not patched by that runtime and hands its body to the
   *    native networking module untouched.
   * 2. `{ uri }` is what we actually need. RN's native networking opens the path
   *    itself, which sidesteps `expo-file-system`'s path permission gate. In Expo
   *    Go that gate only allows the experience-scoped directories, so a file that
   *    a native module wrote into the raw Android cache directory — such as
   *    `expo-video-thumbnails` output — reports `exists === false` and throws on
   *    read even though it is sitting on disk. (In a dev or production build the
   *    raw cache directory *is* the app's own, so expo-file-system happens to
   *    work there. That is exactly why it must not be relied on.)
   *
   * It also streams the file instead of buffering it in JS, which a
   * `Uint8Array` or `Blob` body would do: a 7 MB recording became a ~10 MB
   * base64 string on its way to the native layer.
   *
   * `contentType` must equal the type the URL was signed with, and the header is
   * mandatory — the native layer rejects a `uri` body without a content type.
   */
  uploadLocalFileToObjectStorage(
    presignedUrl: string,
    fileUri: string,
    contentType: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();

      request.open("PUT", presignedUrl);
      request.setRequestHeader("Content-Type", contentType);

      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          resolve();
          return;
        }

        reject(
          new Error(
            `Object storage upload failed (${request.status} ${request.statusText})`,
          ),
        );
      };

      request.onerror = () =>
        reject(
          new Error(
            "Object storage upload failed: the file could not be read or the request failed",
          ),
        );

      // RN reads the file natively; `{ uri }` is its file-body form.
      request.send({ uri: fileUri } as unknown as XMLHttpRequestBodyInit);
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

  /**
   * Step 1 of the thumbnail flow: ask the backend for a presigned PUT and the
   * key the rendered preview image must be stored at.
   */
  async requestThumbnailUpload(
    videoId: string,
    contentType: string,
    token: string,
  ): Promise<PresignedThumbnailUploadResponse> {
    const response = await client.request<PresignedThumbnailUploadResponse>(
      `/api/v1/videos/${videoId}/thumbnail`,
      {
        method: "POST",
        body: JSON.stringify({ contentType }),
      },
      { token },
    );

    return response.result;
  }

  /** Step 3: record the uploaded preview image on the video. */
  async attachThumbnail(
    videoId: string,
    thumbnailStorageKey: string,
    token: string,
  ): Promise<AttachThumbnailResponse> {
    const response = await client.request<AttachThumbnailResponse>(
      `/api/v1/videos/${videoId}/thumbnail`,
      {
        method: "PATCH",
        body: JSON.stringify({ thumbnailStorageKey }),
      },
      { token },
    );

    return response.result;
  }
}

export const videoApi = new VideoAPI();
