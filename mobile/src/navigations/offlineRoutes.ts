/**
 * Screens that keep working without a connection.
 *
 * Everything else in the app (scanning, diagnosis history/detail, Flora chat,
 * profile, account settings) either reads user-owned data or calls the API, so
 * it is temporarily unavailable in limited/offline mode.
 *
 * The Home leaf route is shared by the root guard and the tab bar: when the
 * device goes offline both send the user here.
 */
export const OFFLINE_ROUTE_NAMES: ReadonlySet<string> = new Set(["Home"]);
