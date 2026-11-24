import { useAuth } from "@clerk/expo";
import React, { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import showToast from "../../helper/toast";
import { useNetwork } from "../../network/NetworkProvider";
import { syncPendingVideos } from "./services/videoSync";

/** How often the queue is retried while the server stays reachable. */
const SYNC_INTERVAL_MS = 30_000;

/**
 * Runs the offline recording queue for the whole app, not just one screen.
 *
 * A queued video is retried as soon as:
 *   - the device has internet, and
 *   - the backend answers its health check,
 * and then every 30 seconds while those stay true. Foregrounding the app is
 * another trigger, so recordings saved before a force-quit still leave the
 * device without the user opening the scanner again.
 */
export const VideoSyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getToken, userId } = useAuth();
  const { isConnected, isInternetReachable, isServerReachable } = useNetwork();

  // Clerk's callbacks do not keep their identity between renders; reading them
  // through refs keeps the timers/listeners below stable.
  const getTokenRef = useRef(getToken);
  const userIdRef = useRef(userId);

  useEffect(() => {
    getTokenRef.current = getToken;
    userIdRef.current = userId;
  }, [getToken, userId]);

  const isSyncRunningRef = useRef(false);

  const online =
    isConnected !== false &&
    isInternetReachable !== false &&
    isServerReachable === true;

  const runSync = useCallback(async () => {
    if (!online || isSyncRunningRef.current) return;

    isSyncRunningRef.current = true;

    try {
      const result = await syncPendingVideos({
        getToken: async () => getTokenRef.current().catch(() => null),
        ownerId: userIdRef.current ?? null,
      });

      if (result.uploaded > 0) {
        showToast(
          "success",
          "Scans uploaded",
          `${result.uploaded} saved ${
            result.uploaded === 1 ? "video was" : "videos were"
          } uploaded successfully.`,
        );
      }
    } catch (error) {
      // A local database/file failure is not fatal: the interval will try
      // again, and the rows remain queued.
      console.error("Video sync failed:", error);
    } finally {
      isSyncRunningRef.current = false;
    }
  }, [online]);

  // Connectivity restored (or the first successful health check after boot).
  useEffect(() => {
    if (online) {
      void runSync();
    }
  }, [online, runSync]);

  // Keep retrying while the connection stays healthy — this also covers a
  // single failed upload whose network state never changed.
  useEffect(() => {
    if (!online) return;

    const interval = setInterval(() => {
      void runSync();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [online, runSync]);

  // A recording saved before a force-quit gets another chance on resume.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          void runSync();
        }
      },
    );

    return () => subscription.remove();
  }, [runSync]);

  return <>{children}</>;
};
