/** Where the farmer's crops are grown. Every level is optional. */
export interface FarmLocation {
  province?: string;
  municipality?: string;
  barangay?: string;
}

/**
 * The user profile as returned by `GET /api/v1/users/me`.
 */
export interface UserProfile {
  id: string;
  clerkId?: string;
  email?: string;
  name: string;
  role?: "user" | "admin";
  phoneNumber?: string;
  farmLocation?: FarmLocation;
  preferredCrops?: string[];
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Body accepted by `PATCH /api/v1/users/me`. */
export interface UpdateProfileInput {
  name?: string;
  phoneNumber?: string;
  farmLocation?: FarmLocation;
  preferredCrops?: string[];
}

export interface PreferredCropOption {
  value: string;
  label: string;
}

/** Crops the backend currently accepts for `preferredCrops`. */
export const PREFERRED_CROPS: PreferredCropOption[] = [
  { value: "tomato", label: "Tomato" },
  { value: "eggplant", label: "Eggplant" },
  { value: "pepper", label: "Pepper" },
  { value: "potato", label: "Potato" },
];

/** `tomato` → `Tomato`; falls back to the raw value for unknown crops. */
export const formatCropLabel = (value: string): string =>
  PREFERRED_CROPS.find((crop) => crop.value === value)?.label ?? value;

/** `["tomato", "pepper"]` → `Tomato, Pepper`. */
export const formatPreferredCrops = (crops?: string[]): string =>
  crops?.length ? crops.map(formatCropLabel).join(", ") : "Not set";

/** Provinces are broad; the app only needs a readable single-line label. */
export const formatFarmLocation = (location?: FarmLocation): string =>
  [location?.barangay, location?.municipality, location?.province]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ") || "Not set";
