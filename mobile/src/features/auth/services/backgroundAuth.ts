import { getClerkInstance } from "@clerk/expo";

export interface BackgroundAuth {
  token: string;
  userId: string;
}

export async function getBackgroundAuth(): Promise<BackgroundAuth | null> {
  try {
    const clerk = getClerkInstance();

    const session = clerk.session;

    if (!session) {
      console.log("[BackgroundAuth] No active session");
      return null;
    }

    const token = session?.getToken();
    const userId = clerk.user?.id;

    if (!token || !userId) {
      console.log("[BackgroundAuth] Missing token or user ID");
      return null;
    }

    return { token: String(token), userId: String(userId) };
  } catch (error) {
    console.error("[BackgroundAuth] Authentication failed:", error);
    return null;
  }
}
