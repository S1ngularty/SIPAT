import { getBackgroundAuth } from "../../auth/services/backgroundAuth";
import { syncPendingVideos } from "./videoSync";

export async function runBackgroundSync() {
  try {
    console.log("[BackgroundSync] Starting synchronization");

    const auth = await getBackgroundAuth();

    if (!auth) {
      console.log("[BackgroundSync] No authenticated session");
      return;
    }

    const result = await syncPendingVideos({
      getToken: async () => auth.token,
      ownerId: auth.userId,
    });

    console.log("[BackgroundSync] Completed:", result);

    return result;
  } catch (error) {
    console.error("[BackgroundSync] Failed:", error);
  }
}
