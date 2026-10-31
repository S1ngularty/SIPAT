import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Copy, Sparkles, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "../../../theme";

const BORDER = "#E3E8E0";
const BACKDROP = "rgba(20, 24, 26, 0.45)";
const ASK_FILL = "#F6FAF1";
const ASK_BORDER = "#DCEBCB";
const SHEET_OFFSET = 380;

type Props = {
  visible: boolean;
  /** Highlighted term that was tapped. Kept while the sheet animates out. */
  term: string | null;
  onClose: () => void;
  onCopy: (term: string) => void;
  onAsk: (term: string) => void;
};

/**
 * Bottom sheet for a tapped highlighted term. Replaces the native alert so the
 * options feel like part of the chat: a dimmed backdrop, a rounded sheet with
 * the term, and two full-width actions.
 */
export const HighlightActionSheet: React.FC<Props> = ({
  visible,
  term,
  onClose,
  onCopy,
  onAsk,
}) => {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [shownTerm, setShownTerm] = useState(term ?? "");

  const mountedRef = useRef(visible);
  const slide = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // Keep the last term on screen while the sheet slides out.
  useEffect(() => {
    if (visible && term) setShownTerm(term);
  }, [term, visible]);

  useEffect(() => {
    if (visible) {
      mountedRef.current = true;
      setMounted(true);

      slide.setValue(1);
      fade.setValue(0);

      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slide, {
          toValue: 0,
          damping: 22,
          stiffness: 240,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    if (!mountedRef.current) return;

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        mountedRef.current = false;
        setMounted(false);
      }
    });
  }, [fade, slide, visible]);

  const handleCopy = useCallback(() => {
    if (shownTerm) onCopy(shownTerm);
  }, [onCopy, shownTerm]);

  const handleAsk = useCallback(() => {
    if (shownTerm) onAsk(shownTerm);
  }, [onAsk, shownTerm]);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]} />

        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss options"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              transform: [
                {
                  translateY: slide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, SHEET_OFFSET],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>HIGHLIGHTED TERM</Text>
              <Text style={styles.term} numberOfLines={3}>
                {shownTerm}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <X size={17} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel={`Copy ${shownTerm}`}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.actionIcon}>
                <Copy size={18} color={colors.text} strokeWidth={1.9} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Copy</Text>
                <Text style={styles.actionHint}>
                  Save the term to your clipboard
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleAsk}
              accessibilityRole="button"
              accessibilityLabel={`Ask Flora about ${shownTerm}`}
              style={({ pressed }) => [
                styles.action,
                styles.askAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.actionIcon, styles.askIcon]}>
                <Sparkles size={18} color={colors.green} strokeWidth={2} />
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, styles.askTitle]}>
                  Ask Flora about this
                </Text>
                <Text style={styles.actionHint}>Send it as a new question</Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [
              styles.cancel,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: BACKDROP,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 16,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: BORDER,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: colors.textMuted,
  },
  term: {
    marginTop: spacing.xs,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 66,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: colors.white,
  },
  askAction: {
    backgroundColor: ASK_FILL,
    borderColor: ASK_BORDER,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  askIcon: {
    backgroundColor: colors.white,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  askTitle: {
    color: colors.green,
  },
  actionHint: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  cancel: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});
