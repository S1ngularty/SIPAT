import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { runBackgroundSync } from "../features/scan/services/backgroundSync";

export const BACKGROUND_SYNC_TASK = "SIPAT_BACKGROUND_SYNC";

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log("[BackgroundTask] Starting sync");

    const result = await runBackgroundSync();

    console.log("[BackgroundTask] Sync completed:", result);

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("[BackgroundTask] Sync failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSync() {
  try {
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

    if (isRegistered) {
      console.log("[BackgroundTask] Already registered");
      return;
    }

    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15,
    });

    console.log("[BackgroundTask] Registration successful");
  } catch (error) {
    console.error("[BackgroundTask] Registration failed:", error);
  }
}
