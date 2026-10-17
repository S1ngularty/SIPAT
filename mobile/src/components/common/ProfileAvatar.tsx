import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";

type Props = {
  uri?: string | null;
  /** Used to derive fallback initials when no image is available. */
  name?: string | null;
  size?: number;
};

const getInitials = (name?: string | null): string => {
  const trimmed = name?.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/**
 * Circular profile image with a deterministic initials fallback so the layout
 * stays stable when the user has no avatar (or it fails to load).
 */
export const ProfileAvatar: React.FC<Props> = ({ uri, name, size = 44 }) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  const showImage = Boolean(uri) && !imageFailed;
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (showImage) {
    return (
      <Image
        source={{ uri: uri as string }}
        onError={() => setImageFailed(true)}
        style={[styles.image, dimensionStyle]}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[styles.fallback, dimensionStyle]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ? `${name} avatar` : "Profile avatar"}
    >
      <Text
        style={[styles.initials, { fontSize: size * 0.36 }]}
        allowFontScaling={false}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.sageDeep,
  },
  fallback: {
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.textOnDark,
    fontWeight: "700",
  },
});
