import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import type { GroqTerm } from "../diagnosisTypes";

const COLORS = {
  text: "#171717",
  textSecondary: "#737373",
  divider: "#E5E7EB",
  mutedGreen: "#E7EFE8",
  statusText: "#365B40",
  white: "#FFFFFF",
  black: "#171717",
  backdrop: "rgba(23, 23, 23, 0.35)",
};

const CloseIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = COLORS.textSecondary,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 6L18 18M18 6L6 18"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface TermGlossaryModalProps {
  /** The term to explain. `null` keeps the sheet closed. */
  term: GroqTerm | null;
  onClose: () => void;
}

/**
 * Compact bottom sheet that explains a single glossary term. Opened by tapping
 * a highlighted word in the diagnosis summary or recommendations.
 */
export const TermGlossaryModal: React.FC<TermGlossaryModalProps> = ({
  term,
  onClose,
}) => (
  <Modal
    visible={!!term}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onClose}
  >
    <Pressable
      style={styles.backdrop}
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel="Close definition"
    >
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.sheetHandle} />

        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>Term definition</Text>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close definition"
          >
            <CloseIcon size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.termName}>{term?.term ?? ""}</Text>

        <Text style={styles.definition}>{term?.definition ?? ""}</Text>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={onClose}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Got it"
        >
          <Text style={styles.doneButtonText}>Got it</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 26,
  },

  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.divider,
    alignSelf: "center",
    marginBottom: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },

  closeButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  termName: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.3,
    lineHeight: 28,
    marginTop: 10,
  },

  definition: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 23,
    marginTop: 10,
  },

  doneButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.black,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },

  doneButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
    letterSpacing: 0.1,
  },
});
