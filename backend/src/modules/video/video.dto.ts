
export interface IPresignedUploadResponse {
  videoId: string | null;
  storageKey: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface IPresignedThumbnailUploadResponse {
  videoId: string;
  thumbnailStorageKey: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface IAttachThumbnailResponse {
  videoId: string;
  thumbnailStorageKey: string;
}
