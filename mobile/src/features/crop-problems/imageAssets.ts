
import type { ImageSourcePropType } from "react-native";

/**
 * Local asset registry for crop-problem photos.
 * Includes images inside browse-images subdirectories only.
 */
const LOCAL_IMAGE_REGISTRY: Record<string, ImageSourcePropType> = {
  // Anthracnose
  "assets/browse-images/anthracnose/1.jpeg": require("../../../assets/browse-images/anthracnose/1.jpeg"),
  "assets/browse-images/anthracnose/2.jpeg": require("../../../assets/browse-images/anthracnose/2.jpeg"),
  "assets/browse-images/anthracnose/3.jpg": require("../../../assets/browse-images/anthracnose/3.jpg"),

  // Aphids
  "assets/browse-images/aphids/11.jpeg": require("../../../assets/browse-images/aphids/11.jpeg"),
  "assets/browse-images/aphids/2.jpeg": require("../../../assets/browse-images/aphids/2.jpeg"),
  "assets/browse-images/aphids/3.jpeg": require("../../../assets/browse-images/aphids/3.jpeg"),

  // Bacterial Spot
  "assets/browse-images/bacterial-spot/1.jpeg": require("../../../assets/browse-images/bacterial-spot/1.jpeg"),
  "assets/browse-images/bacterial-spot/2.jpeg": require("../../../assets/browse-images/bacterial-spot/2.jpeg"),
  "assets/browse-images/bacterial-spot/3.jpeg": require("../../../assets/browse-images/bacterial-spot/3.jpeg"),

  // Black Spot
  "assets/browse-images/black-spot/1.jpeg": require("../../../assets/browse-images/black-spot/1.jpeg"),
  "assets/browse-images/black-spot/2.jpeg": require("../../../assets/browse-images/black-spot/2.jpeg"),
  "assets/browse-images/black-spot/3.jpeg": require("../../../assets/browse-images/black-spot/3.jpeg"),
  "assets/browse-images/black-spot/4.jpeg": require("../../../assets/browse-images/black-spot/4.jpeg"),

  // Early Blight
  "assets/browse-images/early-blight/1.jpeg": require("../../../assets/browse-images/early-blight/1.jpeg"),
  "assets/browse-images/early-blight/2.jpeg": require("../../../assets/browse-images/early-blight/2.jpeg"),
  "assets/browse-images/early-blight/3.jpeg": require("../../../assets/browse-images/early-blight/3.jpeg"),

  // Flea Beetles
  "assets/browse-images/flee-beetles/1.jpeg": require("../../../assets/browse-images/flee-beetles/1.jpeg"),
  "assets/browse-images/flee-beetles/2.jpeg": require("../../../assets/browse-images/flee-beetles/2.jpeg"),
  "assets/browse-images/flee-beetles/3.jpeg": require("../../../assets/browse-images/flee-beetles/3.jpeg"),

  // Fruit Borer
  "assets/browse-images/fruit-borrer/1.jpeg": require("../../../assets/browse-images/fruit-borrer/1.jpeg"),
  "assets/browse-images/fruit-borrer/2.jpeg": require("../../../assets/browse-images/fruit-borrer/2.jpeg"),
  "assets/browse-images/fruit-borrer/3.jpeg": require("../../../assets/browse-images/fruit-borrer/3.jpeg"),

  // Fruit Rot
  "assets/browse-images/fruit-rot/1.jpeg": require("../../../assets/browse-images/fruit-rot/1.jpeg"),
  "assets/browse-images/fruit-rot/2.jpeg": require("../../../assets/browse-images/fruit-rot/2.jpeg"),
  "assets/browse-images/fruit-rot/3.jpeg": require("../../../assets/browse-images/fruit-rot/3.jpeg"),

  // Healthy
  "assets/browse-images/helthy/1.jpeg": require("../../../assets/browse-images/helthy/1.jpeg"),
  "assets/browse-images/helthy/2.jpeg": require("../../../assets/browse-images/helthy/2.jpeg"),
  "assets/browse-images/helthy/3.jpeg": require("../../../assets/browse-images/helthy/3.jpeg"),
  "assets/browse-images/helthy/4.jpeg": require("../../../assets/browse-images/helthy/4.jpeg"),

  // Late Blight
  "assets/browse-images/late-blight/1.jpeg": require("../../../assets/browse-images/late-blight/1.jpeg"),
  "assets/browse-images/late-blight/2.jpeg": require("../../../assets/browse-images/late-blight/2.jpeg"),
  "assets/browse-images/late-blight/3.jpeg": require("../../../assets/browse-images/late-blight/3.jpeg"),
  "assets/browse-images/late-blight/4.jpeg": require("../../../assets/browse-images/late-blight/4.jpeg"),

  // Leaf Curl
  "assets/browse-images/leaf-curl/1.jpeg": require("../../../assets/browse-images/leaf-curl/1.jpeg"),
  "assets/browse-images/leaf-curl/2.jpeg": require("../../../assets/browse-images/leaf-curl/2.jpeg"),
  "assets/browse-images/leaf-curl/3.jpeg": require("../../../assets/browse-images/leaf-curl/3.jpeg"),

  // Leaf Miner
  "assets/browse-images/leaf-miner/1.jpg": require("../../../assets/browse-images/leaf-miner/1.jpg"),
  "assets/browse-images/leaf-miner/2.jpeg": require("../../../assets/browse-images/leaf-miner/2.jpeg"),
  "assets/browse-images/leaf-miner/3.jpeg": require("../../../assets/browse-images/leaf-miner/3.jpeg"),
  "assets/browse-images/leaf-miner/4.jpeg": require("../../../assets/browse-images/leaf-miner/4.jpeg"),

  // Leaf Mold
  "assets/browse-images/leaf-mold/1.jpeg": require("../../../assets/browse-images/leaf-mold/1.jpeg"),
  "assets/browse-images/leaf-mold/2.jpeg": require("../../../assets/browse-images/leaf-mold/2.jpeg"),
  "assets/browse-images/leaf-mold/3.jpeg": require("../../../assets/browse-images/leaf-mold/3.jpeg"),
  "assets/browse-images/leaf-mold/4.jpeg": require("../../../assets/browse-images/leaf-mold/4.jpeg"),

  // Mosaic Virus
  "assets/browse-images/mosaic-virus/1.jpeg": require("../../../assets/browse-images/mosaic-virus/1.jpeg"),
  "assets/browse-images/mosaic-virus/2.jpeg": require("../../../assets/browse-images/mosaic-virus/2.jpeg"),
  "assets/browse-images/mosaic-virus/3.jpeg": require("../../../assets/browse-images/mosaic-virus/3.jpeg"),

  // Powdery Mildew
  "assets/browse-images/powdery-mildew/1.jpeg": require("../../../assets/browse-images/powdery-mildew/1.jpeg"),
  "assets/browse-images/powdery-mildew/2.jpeg": require("../../../assets/browse-images/powdery-mildew/2.jpeg"),
  "assets/browse-images/powdery-mildew/3.jpeg": require("../../../assets/browse-images/powdery-mildew/3.jpeg"),

  // Rust
  "assets/browse-images/rust/1.jpeg": require("../../../assets/browse-images/rust/1.jpeg"),
  "assets/browse-images/rust/2.jpeg": require("../../../assets/browse-images/rust/2.jpeg"),
  "assets/browse-images/rust/3.jpeg": require("../../../assets/browse-images/rust/3.jpeg"),

  // Septoria
  "assets/browse-images/septoria/1.jpeg": require("../../../assets/browse-images/septoria/1.jpeg"),
  "assets/browse-images/septoria/2.jpeg": require("../../../assets/browse-images/septoria/2.jpeg"),
  "assets/browse-images/septoria/3.jpeg": require("../../../assets/browse-images/septoria/3.jpeg"),
  "assets/browse-images/septoria/4.jpeg": require("../../../assets/browse-images/septoria/4.jpeg"),

  // Spider Mites
  "assets/browse-images/spider-mites/1.jpeg": require("../../../assets/browse-images/spider-mites/1.jpeg"),
  "assets/browse-images/spider-mites/2.jpeg": require("../../../assets/browse-images/spider-mites/2.jpeg"),
  "assets/browse-images/spider-mites/3.jpeg": require("../../../assets/browse-images/spider-mites/3.jpeg"),

  // Thrips
  "assets/browse-images/thrips/1.jpeg": require("../../../assets/browse-images/thrips/1.jpeg"),
  "assets/browse-images/thrips/2.jpeg": require("../../../assets/browse-images/thrips/2.jpeg"),
  "assets/browse-images/thrips/3.jpeg": require("../../../assets/browse-images/thrips/3.jpeg"),

  // Wilt
  "assets/browse-images/wilt/1.jpeg": require("../../../assets/browse-images/wilt/1.jpeg"),
  "assets/browse-images/wilt/2.jpeg": require("../../../assets/browse-images/wilt/2.jpeg"),
  "assets/browse-images/wilt/3.jpeg": require("../../../assets/browse-images/wilt/3.jpeg"),
  "assets/browse-images/wilt/4.jpeg": require("../../../assets/browse-images/wilt/4.jpeg"),

  // Yellow Leaf Curl Virus
  "assets/browse-images/yellow-leaf-curl-virus/1.jpeg": require("../../../assets/browse-images/yellow-leaf-curl-virus/1.jpeg"),
  "assets/browse-images/yellow-leaf-curl-virus/2.jpeg": require("../../../assets/browse-images/yellow-leaf-curl-virus/2.jpeg"),
  "assets/browse-images/yellow-leaf-curl-virus/3.jpeg": require("../../../assets/browse-images/yellow-leaf-curl-virus/3.jpeg"),
  "assets/browse-images/yellow-leaf-curl-virus/4.jpeg": require("../../../assets/browse-images/yellow-leaf-curl-virus/4.jpeg"),
};

const REMOTE_IMAGE_PATTERN = /^(https?:\/\/|file:\/\/|data:image\/)/i;

export const CROP_PROBLEM_PLACEHOLDER_IMAGE: ImageSourcePropType =
  require("../../../assets/images/crop-placeholder.png");

export const getCropProblemImageSource = (
  path: string,
): ImageSourcePropType | null => {
  if (!path) return null;

  const registered = LOCAL_IMAGE_REGISTRY[path];
  if (registered) return registered;

  return REMOTE_IMAGE_PATTERN.test(path) ? { uri: path } : null;
};
