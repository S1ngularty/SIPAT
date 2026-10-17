import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/expo";
import { diagnosisApi } from "../diagnosisApi";
import type { VideoListItem } from "../diagnosisTypes";

const POLL_INTERVAL = 15000;
const PAGE_SIZE = 10;

type FetchMode = "replace" | "append" | "merge";

/** A video still moving through the pipeline (waiting to be analysed). */
const isInPipeline = (video: VideoListItem): boolean =>
  video.status === "pending_upload" ||
  video.status === "uploaded" ||
  video.status === "processing";

/**
 * Video-driven replacement for `useDiagnosisList`. Powers the Diagnoses screen
 * from `GET /videos`: every video (any status) with its diagnosis joined.
 */
export const useVideoList = () => {
  const { getToken } = useAuth();

  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Clerk's `getToken` does not keep its identity between renders, so calling it
  // directly inside `fetchVideos` would make `fetchVideos` change every render.
  // That re-fires the load effect and the focus effect on every render — an
  // endless fetch loop. Reading it from a ref instead keeps `fetchVideos`
  // stable (empty deps below).
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const fetchVideos = useCallback(
    async (pageNum: number, mode: FetchMode = "replace") => {
      try {
        const token = await getTokenRef.current();

        const result = await diagnosisApi.videoList({
          page: pageNum,
          limit: PAGE_SIZE,
          token,
        });

        const fetched = result.data ?? [];

        setVideos((prev) => {
          if (mode === "replace") return fetched;
          if (mode === "append") return [...prev, ...fetched];

          // Merge: refresh the first page in place. Refreshing page 1 without
          // replacing the list means background polls never drop pages the user
          // scrolled to, and never reorder/reflow the list under them.
          const freshIds = new Set(fetched.map((video) => video._id));
          return [
            ...fetched,
            ...prev.filter((video) => !freshIds.has(video._id)),
          ];
        });

        setHasMore(pageNum < result.meta.totalPages);
      } catch (error) {
        console.error("Failed to fetch videos:", error);
      }
    },
    [],
  );

  // Initial load only — the skeleton shows once, here. Guarded by a ref so it
  // can never re-run even if `fetchVideos` ever changed identity again.
  const didInitialLoad = useRef(false);

  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;

    (async () => {
      setIsLoading(true);
      await fetchVideos(1, "replace");
      setIsLoading(false);
    })();
  }, [fetchVideos]);

  // Derived as a boolean so the interval below is only re-created when this
  // actually flips — not on every poll (a `videos` dependency would tear the
  // timer down and restart it on every fetch).
  const hasProcessing = videos.some(isInPipeline);

  // Silent background poll. Merges page 1 in place: no skeleton, no spinner, no
  // scroll jump. Stops on its own once nothing is left in the pipeline.
  useEffect(() => {
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchVideos(1, "merge");
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [hasProcessing, fetchVideos]);

  /** Pull-to-refresh: native spinner only, no skeleton. */
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await fetchVideos(1, "replace");
    setIsRefreshing(false);
  }, [fetchVideos]);

  /**
   * Silent refresh, e.g. when the screen refocuses. Updates rows in place so
   * nothing visibly reloads.
   */
  const reload = useCallback(async () => {
    await fetchVideos(1, "merge");
  }, [fetchVideos]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchVideos(nextPage, "append");
  }, [hasMore, isLoading, page, fetchVideos]);

  /**
   * Optimistically renames a diagnosis. Renaming only applies to videos that
   * already have one; falls back to a refresh on failure.
   */
  const renameVideo = useCallback(
    async (diagnosisId: string, newName: string): Promise<boolean> => {
      const trimmed = newName.trim();
      if (!trimmed) return false;

      const prev = videos;

      setVideos((current) =>
        current.map((video) =>
          video.diagnosis && video.diagnosis._id === diagnosisId
            ? {
                ...video,
                diagnosis: { ...video.diagnosis, diagnosisName: trimmed },
              }
            : video,
        ),
      );

      try {
        await diagnosisApi.renameDiagnosis(diagnosisId, trimmed);
        return true;
      } catch (err) {
        console.error("Rename failed:", err);
        setVideos(prev); // rollback
        return false;
      }
    },
    [videos],
  );

  /**
   * Optimistically removes a video. Falling back to a refresh on failure.
   */
  const deleteVideo = useCallback(
    async (videoId: string): Promise<boolean> => {
      const prev = videos;

      setVideos((current) => current.filter((video) => video._id !== videoId));

      try {
        await diagnosisApi.deleteDiagnosis(videoId);
        return true;
      } catch (err) {
        console.error("Delete failed:", err);
        setVideos(prev); // rollback
        return false;
      }
    },
    [videos],
  );

  return {
    videos,
    isLoading,
    isRefreshing,
    refresh,
    reload,
    loadMore,
    hasMore,
    renameVideo,
    deleteVideo,
  };
};
