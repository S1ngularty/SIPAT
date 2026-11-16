import { client } from "../../api/apiClient";
import type {
  UpdateProfileInput,
  UserProfile,
} from "./profileTypes";

class ProfileAPI {
  /** The signed-in user's profile. `GET /api/v1/users/me` (session-guarded). */
  async getMe(token?: string | null): Promise<UserProfile> {
    const response = await client.request<UserProfile>(
      "/api/v1/users/me",
      { method: "GET" },
      { token },
    );

    return response.result;
  }

  /**
   * Update the signed-in user's profile. Only name, phone number, farm location
   * and preferred crops are accepted; identity fields stay server-owned.
   */
  async updateMe(
    input: UpdateProfileInput,
    token?: string | null,
  ): Promise<Partial<UserProfile>> {
    const response = await client.request<Partial<UserProfile>>(
      "/api/v1/users/me",
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
      { token },
    );

    return response.result;
  }
}

export const profileApi = new ProfileAPI();
