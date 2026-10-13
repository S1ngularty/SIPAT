import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Toast, { ToastConfig } from "react-native-toast-message";

type ToastVariant = "info" | "success" | "error" | "warning";

type CustomToastProps = {
  variant: ToastVariant;
};

export const toastConfig: ToastConfig = {
  customToast: ({ text1, text2, props }) => {
    const variant = props?.variant as ToastVariant;

    const getBorderColor = () => {
      switch (variant) {
        case "success":
          return "#4CAF50";

        case "error":
          return "#F44336";

        case "warning":
          return "#FF9800";

        default:
          return "#2196F3";
      }
    };

    return (
      <View
        style={[
          styles.toastContainer,
          {
            borderLeftColor: getBorderColor(),
          },
        ]}
      >
        <View style={styles.textContainer}>
          {text1 && (
            <Text style={styles.titleText} numberOfLines={1}>
              {text1}
            </Text>
          )}

          {text2 && (
            <Text style={styles.bodyText} numberOfLines={2}>
              {text2}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => Toast.hide()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  },
};

export default function showToast(
  variant: ToastVariant,
  headerMessage: string,
  message: string,
) {
  Toast.show({
    type: "customToast",

    text1: headerMessage,
    text2: message,

    position: "top",
    topOffset: 50,

    props: {
      variant,
    } satisfies CustomToastProps,
  });
}

const styles = StyleSheet.create({
  toastContainer: {
    minHeight: 65,
    width: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderLeftWidth: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 5,

    elevation: 4,
  },

  textContainer: {
    flex: 1,
    justifyContent: "center",
  },

  titleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },

  bodyText: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 16,
  },

  closeButton: {
    padding: 4,
    marginLeft: 8,
  },

  closeButtonText: {
    fontSize: 14,
    color: "#A0A0A0",
    fontWeight: "600",
  },
});
