import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, Check, RefreshCw, Sprout } from 'lucide-react-native';

import { colors, radii, spacing } from '../../theme';
import type { SpeechStatus } from '../../modules/speech-recognition';

type Props = {
  status: SpeechStatus;
  /** Download progress, 0–1. */
  progress: number;
  error: string | null;
  onRetry: () => void;
  onSkip: () => void;
};

const BRAND_BACKGROUND = ['#14321B', '#1B2A24', '#22282A'] as const;

/**
 * Startup splash. The model check runs behind this screen, with its status
 * pinned to the bottom-left corner so the brand stays the focus.
 */
export const BootSplash: React.FC<Props> = ({
  status,
  progress,
  error,
  onRetry,
  onSkip,
}) => {
  const percent = Math.round(progress * 100);

  const content = useMemo(() => {
    switch (status) {
      case 'checking':
        return {
          title: 'Checking for updates',
          detail: 'Looking for the offline speech model…',
        };
      case 'downloading':
        return {
          title: 'System updating',
          detail: `Downloading the speech model${percent > 0 ? ` · ${percent}%` : '…'}`,
        };
      case 'loading':
        return {
          title: 'Almost ready',
          detail: "Loading Flora's offline voice model…",
        };
      case 'ready':
        return {
          title: 'System up to date',
          detail: 'Starting SIPAT…',
        };
      case 'skipped':
        return {
          title: 'Continuing without voice',
          detail: 'Voice input is off until the app is restarted.',
        };
      case 'error':
      default:
        return {
          title: 'System update failed',
          detail: error ?? 'The speech model could not be prepared.',
        };
    }
  }, [error, percent, status]);

  return (
    <LinearGradient
      colors={BRAND_BACKGROUND}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Sprout size={44} color={colors.lime} strokeWidth={1.6} />
            </View>
          </View>

          <Text style={styles.brand}>SIPAT</Text>
          <Text style={styles.tagline}>Crop health, right in your pocket</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.statusRow}>
            {status === 'error' ? (
              <AlertTriangle size={16} color={colors.warning} strokeWidth={2} />
            ) : status === 'ready' ? (
              <Check size={16} color={colors.lime} strokeWidth={2.4} />
            ) : (
              <ActivityIndicator size="small" color={colors.lime} />
            )}

            <View style={styles.statusBody}>
              <Text style={styles.statusTitle}>{content.title}</Text>
              <Text style={styles.statusDetail} numberOfLines={2}>
                {content.detail}
              </Text>

              {status === 'downloading' ? (
                <View
                  style={styles.progressTrack}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: percent }}
                >
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(4, percent)}%` },
                    ]}
                  />
                </View>
              ) : null}
            </View>
          </View>

          {status === 'error' ? (
            <View style={styles.actions}>
              <Pressable
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel="Retry the system update"
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}
              >
                <RefreshCw size={15} color={colors.forest} strokeWidth={2.2} />
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>

              <Pressable
                onPress={onSkip}
                accessibilityRole="button"
                accessibilityLabel="Continue without voice input"
                style={({ pressed }) => [
                  styles.skipButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.skipText}>Continue without voice</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  logoRing: {
    width: 116,
    height: 116,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(134, 198, 83, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  logoInner: {
    width: 92,
    height: 92,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(134, 198, 83, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(134, 198, 83, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.textOnDark,
  },
  tagline: {
    marginTop: spacing.sm,
    fontSize: 13,
    letterSpacing: 0.3,
    color: 'rgba(255, 255, 255, 0.62)',
  },
  footer: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  statusBody: {
    flexShrink: 1,
    gap: 2,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textOnDark,
  },
  statusDetail: {
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255, 255, 255, 0.62)',
  },
  progressTrack: {
    width: 168,
    height: 3,
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  actions: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 40,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  skipButton: {
    height: 34,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.72)',
  },
  pressed: {
    opacity: 0.7,
  },
});
