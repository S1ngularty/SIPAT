import { useState, useCallback, useEffect, useRef } from "react";
// import { api } from "../services/api";
import type { Video } from "../../types/video.types";

const POLL_INTERVAL = 5000; // 5 seconds
const PAGE_SIZE = 10;

export const useDiagnosisList = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVideos = useCallback(
    async (pageNum: number, replace: boolean = false) => {
      // try {
      //   const response = await api.get("/videos", {
      //     params: { page: pageNum, limit: PAGE_SIZE },
      //   });
      //   const { users: fetchedVideos, pagination } = response.data.result;
      //   setVideos((prev) =>
      //     replace ? fetchedVideos : [...prev, ...fetchedVideos],
      //   );
      //   setHasMore(pageNum < pagination.totalPages);
      // } catch (error) {
      //   console.error("Failed to fetch videos:", error);
      // }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await fetchVideos(1, true);
      setIsLoading(false);
    })();
  }, []);

  // Polling — only if there are processing items
  useEffect(() => {
    const hasProcessing = videos.some(
      (v) => v.status === "processing" || v.status === "uploaded",
    );

    if (hasProcessing) {
      pollRef.current = setInterval(async () => {
        await fetchVideos(1, true);
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [videos, fetchVideos]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await fetchVideos(1, true);
    setIsRefreshing(false);
  }, [fetchVideos]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchVideos(nextPage, false);
  }, [hasMore, isLoading, page, fetchVideos]);

  return {
    videos,
    isLoading,
    isRefreshing,
    refresh,
    loadMore,
    hasMore,
  };
};
