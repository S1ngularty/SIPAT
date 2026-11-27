/**
 * Screens that keep working without a connection.
 *
 * Home provides the offline guide content, while Scan and the recorder/preview
 * remain available so a farmer can capture a clip anyway: recordings are saved
 * to the device's documents directory and uploaded automatically once the
 * backend is reachable again.
 *
 * Everything else in the app (diagnosis history/detail, Flora chat, profile,
 * account settings) either reads user-owned data or calls the API, so it is
 * temporarily unavailable in limited/offline mode.
 *
 * The Home leaf route is shared by the root guard and the tab bar: when the
 * device goes offline both send the user here.
 */
export const OFFLINE_ROUTE_NAMES: ReadonlySet<string> = new Set([
  "Home",
  "Scan",
  "VideoScanning",
  "VideoPreview",
]);
