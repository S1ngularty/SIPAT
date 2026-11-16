import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "@react-navigation/native";
import { profileApi } from "../profileApi";
import type { UpdateProfileInput, UserProfile } from "../profileTypes";

/**
 * Loads and updates the signed-in user's profile from `/api/v1/users/me`.
 * Refetches quietly whenever the hosting screen regains focus, so edits made on
 * another screen are reflected without a manual pull-to-refresh.
 */
export const useProfile = () => {
  const { getToken } = useAuth();

  // Clerk's `getToken` changes identity between renders; read it from a ref so
  // `load` stays stable and the focus effect does not re-fire every render.
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const token = await getTokenRef.current();
      const data = await profileApi.getMe(token);
      setProfile(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load your profile");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // The first focus shows the loading state; later focuses refresh silently.
  const didLoadRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      void load(!didLoadRef.current);
      didLoadRef.current = true;
    }, [load]),
  );

  const refresh = useCallback(() => load(false), [load]);

  /**
   * Persist profile changes and merge the server's answer into the cached
   * profile. A full refetch happens the next time the screen is focused.
   */
  const save = useCallback(async (input: UpdateProfileInput) => {
    const token = await getTokenRef.current();
    const updated = await profileApi.updateMe(input, token);

    setProfile((current) =>
      current ? { ...current, ...updated } : (updated as UserProfile),
    );

    return updated;
  }, []);

  return {
    profile,
    isLoading,
    error,
    refresh,
    save,
  };
};
