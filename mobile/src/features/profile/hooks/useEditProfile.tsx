import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import showToast from "../../../helper/toast";
import { useProfile } from "./useProfile";
import type { UpdateProfileInput } from "../profileTypes";
import type { UserStackParamList } from "../../../navigations/UserNavigation";

/** Mirrors the backend's phone validation so the error is caught early. */
const PHONE_PATTERN = /^[0-9+\-\s()]+$/;

export interface EditProfileForm {
  name: string;
  phoneNumber: string;
  province: string;
  municipality: string;
  barangay: string;
  preferredCrops: string[];
}

const EMPTY_FORM: EditProfileForm = {
  name: "",
  phoneNumber: "",
  province: "",
  municipality: "",
  barangay: "",
  preferredCrops: [],
};

export const useEditProfile = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<UserStackParamList>>();
  const { profile, isLoading, error, save, refresh } = useProfile();

  const [form, setForm] = useState<EditProfileForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Seed the form once the profile arrives, but never overwrite what the user
  // has already typed (a focus refresh can land while they are editing).
  const didSeedRef = useRef(false);

  useEffect(() => {
    if (!profile || didSeedRef.current) return;
    didSeedRef.current = true;

    setForm({
      name: profile.name ?? "",
      phoneNumber: profile.phoneNumber ?? "",
      province: profile.farmLocation?.province ?? "",
      municipality: profile.farmLocation?.municipality ?? "",
      barangay: profile.farmLocation?.barangay ?? "",
      preferredCrops: profile.preferredCrops ?? [],
    });
  }, [profile]);

  const setField = useCallback(
    <K extends keyof EditProfileForm>(key: K, value: EditProfileForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const toggleCrop = useCallback((crop: string) => {
    setForm((current) => ({
      ...current,
      preferredCrops: current.preferredCrops.includes(crop)
        ? current.preferredCrops.filter((value) => value !== crop)
        : [...current.preferredCrops, crop],
    }));
  }, []);

  const submit = useCallback(async () => {
    const name = form.name.trim();

    if (name.length < 2) {
      showToast(
        "error",
        "Name is too short",
        "Please enter at least 2 characters for your name.",
      );
      return;
    }

    const phoneNumber = form.phoneNumber.trim();

    if (phoneNumber && !PHONE_PATTERN.test(phoneNumber)) {
      showToast(
        "error",
        "Invalid phone number",
        "Use digits, spaces, plus, dash or parentheses only.",
      );
      return;
    }

    const province = form.province.trim();
    const municipality = form.municipality.trim();
    const barangay = form.barangay.trim();

    const payload: UpdateProfileInput = {
      name,
      ...(phoneNumber ? { phoneNumber } : {}),
      // Always send the object so clearing every field clears it server-side.
      farmLocation: {
        ...(province ? { province } : {}),
        ...(municipality ? { municipality } : {}),
        ...(barangay ? { barangay } : {}),
      },
      preferredCrops: form.preferredCrops,
    };

    setIsSaving(true);

    try {
      await save(payload);
      showToast(
        "success",
        "Profile updated",
        "Your profile changes have been saved.",
      );
      navigation.goBack();
    } catch (err: any) {
      showToast(
        "error",
        "Couldn't save profile",
        err?.message ?? "Please check your connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [form, navigation, save]);

  return {
    form,
    setField,
    toggleCrop,
    submit,
    isSaving,
    isLoading,
    error,
    refresh,
    navigation,
  };
};
