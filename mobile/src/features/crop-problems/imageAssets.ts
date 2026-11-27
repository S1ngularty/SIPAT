import type { ImageSourcePropType } from "react-native";

/**
 * Local asset registry for crop-problem photos.
 *
 * The JSON records currently point at paths such as
 * `assets/crop-problems/early-blight/leaf-01.jpg`, but those files do not
 * exist yet, so every renderer falls back to `CROP_PROBLEM_PLACEHOLDER_IMAGE`.
 *
 * When the photos are ready, add a `require()` entry here keyed by the exact
 * path in the JSON. No screen changes are needed:
 *
 * ```ts
 * "assets/crop-problems/early-blight/leaf-01.jpg":
 *   require("../../../assets/crop-problems/early-blight/leaf-01.jpg"),
 * ```
 *
 * Remote URLs (`https://…`) already render directly without registration.
 */
const LOCAL_IMAGE_REGISTRY: Record<string, ImageSourcePropType> = {};

const REMOTE_IMAGE_PATTERN = /^(https?:\/\/|file:\/\/|data:image\/)/i;

export const CROP_PROBLEM_PLACEHOLDER_IMAGE: ImageSourcePropType = require("../../../assets/images/crop-placeholder.png");

export const getCropProblemImageSource = (
  path: string,
): ImageSourcePropType | null => {
  if (!path) return null;

  const registered = LOCAL_IMAGE_REGISTRY[path];
  if (registered) return registered;

  return REMOTE_IMAGE_PATTERN.test(path) ? { uri: path } : null;
};
