import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Lightweight backend health endpoint. It must be derived from the public API
 * URL the rest of the app already uses; a separate variable that is never
 * defined would make every health check fail and keep the app in offline mode.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
const SERVER_HEALTH_URL = API_URL ? `${API_URL}/api/v1/health` : "";
const HEALTH_CHECK_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 30000; // Check every 30s while app is active

export type NetworkStatus = {
  /** `null` until the first NetInfo reading arrives. */
  isConnected: boolean | null;
  /** `null` when reachability has not been determined yet. */
  isInternetReachable: boolean | null;
  /** `null` until the first server check finishes. */
  isServerReachable: boolean | null;
  /**
   * True only when the device is definitely offline OR the server failed its health check.
   * Unknown states stay `false` so cold starts don't flash an offline banner.
   */
  isOffline: boolean;
  /** False until the first NetInfo reading arrives. */
  isInitialized: boolean;
  /** Manually trigger a server health check (e.g., on a "Retry" button). */
  recheckServer: () => Promise<boolean>;
};

const INITIAL_STATUS: Omit<NetworkStatus, "recheckServer"> = {
  isConnected: null,
  isInternetReachable: null,
  isServerReachable: null,
  isOffline: false,
  isInitialized: false,
};

const NetworkContext = createContext<NetworkStatus | null>(null);

const computeIsOffline = (
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
  isServerReachable: boolean | null,
): boolean =>
  isConnected === false ||
  isInternetReachable === false ||
  isServerReachable === false;

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState(INITIAL_STATUS);
  const isCheckingRef = useRef(false);

  const checkServer = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) return false;
    if (!SERVER_HEALTH_URL) return false;

    isCheckingRef.current = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HEALTH_CHECK_TIMEOUT_MS,
    );

    try {
      // HEAD avoids downloading a response body; switch to GET if your server rejects HEAD
      const response = await fetch(SERVER_HEALTH_URL, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });

      const reachable = response.ok; // True for 200–299 status codes
      setStatus((prev) => ({
        ...prev,
        isServerReachable: reachable,
        isOffline: computeIsOffline(
          prev.isConnected,
          prev.isInternetReachable,
          reachable,
        ),
      }));
      return reachable;
    } catch {
      setStatus((prev) => ({
        ...prev,
        isServerReachable: false,
        isOffline: computeIsOffline(
          prev.isConnected,
          prev.isInternetReachable,
          false,
        ),
      }));
      return false;
    } finally {
      clearTimeout(timeoutId);
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const handleNetInfoUpdate = (state: NetInfoState) => {
      if (!isActive) return;

      const deviceOffline =
        state.isConnected === false || state.isInternetReachable === false;

      setStatus((prev) => {
        // If the device just went offline, clear previous server reachability
        const nextServerReachable = deviceOffline
          ? false
          : prev.isServerReachable;

        return {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          isServerReachable: nextServerReachable,
          isOffline: computeIsOffline(
            state.isConnected,
            state.isInternetReachable,
            nextServerReachable,
          ),
          isInitialized: true,
        };
      });

      // Only ping your server when the device has network connectivity
      if (!deviceOffline) {
        void checkServer();
      }
    };

    void NetInfo.fetch()
      .then(handleNetInfoUpdate)
      .catch(() => undefined);
    const unsubscribeNetInfo = NetInfo.addEventListener(handleNetInfoUpdate);

    // Re-check server when the user brings the app back to the foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void checkServer();
      }
    };
    const appStateSub = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    // Periodic check while the app is open in the foreground
    const intervalId = setInterval(() => {
      if (AppState.currentState === "active") {
        void checkServer();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      unsubscribeNetInfo();
      appStateSub.remove();
      clearInterval(intervalId);
    };
  }, [checkServer]);

  const value = useMemo(
    () => ({
      ...status,
      recheckServer: checkServer,
    }),
    [status, checkServer],
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkStatus => {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error("useNetwork must be used inside a NetworkProvider");
  }

  return context;
};
