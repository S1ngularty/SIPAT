import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type NetworkStatus = {
  /** `null` until the first NetInfo reading arrives. */
  isConnected: boolean | null;
  /** `null` when reachability has not been determined yet. */
  isInternetReachable: boolean | null;
  /**
   * True only when the device is definitely offline. An unknown state is
   * treated as online so a cold start never flashes the limited experience.
   */
  isOffline: boolean;
  /** False until the first NetInfo reading arrives. */
  isInitialized: boolean;
};

const INITIAL_STATUS: NetworkStatus = {
  isConnected: null,
  isInternetReachable: null,
  isOffline: false,
  isInitialized: false,
};

const NetworkContext = createContext<NetworkStatus | null>(null);

const toStatus = (state: NetInfoState): NetworkStatus => ({
  isConnected: state.isConnected,
  isInternetReachable: state.isInternetReachable,
  isOffline:
    state.isConnected === false || state.isInternetReachable === false,
  isInitialized: true,
});

/**
 * App-wide connectivity state.
 *
 * NetInfo's `isConnected` only says a network interface is up; the app also
 * needs `isInternetReachable` so a Wi-Fi network with no route to the internet
 * is treated as offline. Both signals are combined into `isOffline`, and an
 * indeterminate reading is treated as online until proven otherwise.
 */
export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<NetworkStatus>(INITIAL_STATUS);

  useEffect(() => {
    let isActive = true;

    const update = (state: NetInfoState) => {
      if (isActive) setStatus(toStatus(state));
    };

    // `addEventListener` fires immediately with the current reading, but an
    // explicit fetch covers platforms where the initial callback is delayed.
    void NetInfo.fetch().then(update).catch(() => undefined);
    const unsubscribe = NetInfo.addEventListener(update);

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => status, [status]);

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
