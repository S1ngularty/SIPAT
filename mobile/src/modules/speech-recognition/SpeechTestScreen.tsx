import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSpeech, useSpeechRecorder } from './index';

/**
 * Developer lab for the offline speech pipeline. The model itself is prepared
 * once at startup by `SpeechProvider`, so this screen only exercises capture.
 */
export default function SpeechTestScreen() {
  const { status, progress, error, isReady, retry } = useSpeech();

  const {
    isRecording,
    isTranscribing,
    transcribeProgress,
    durationMs,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useSpeechRecorder();

  const [transcript, setTranscript] = useState('');

  const statusText = (() => {
    switch (status) {
      case 'checking':
        return 'Checking the speech model…';
      case 'downloading':
        return `Downloading the speech model… ${Math.round(progress * 100)}%`;
      case 'loading':
        return 'Loading the Whisper model…';
      case 'ready':
        return 'Whisper is ready';
      case 'skipped':
        return 'Voice input is disabled for this session';
      case 'error':
      default:
        return error ?? 'Model initialization failed';
    }
  })();

  const handleToggleRecording = useCallback(async () => {
    try {
      if (isRecording) {
        const text = await stopRecording();

        setTranscript(text || 'No speech was recognized.');
        return;
      }

      setTranscript('');
      await startRecording();
    } catch (recordingError) {
      console.error('Recording error:', recordingError);

      Alert.alert(
        'Voice Input',
        recordingError instanceof Error
          ? recordingError.message
          : 'Unknown error',
      );
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleCancel = useCallback(() => {
    cancelRecording();
    setTranscript('');
  }, [cancelRecording]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Speech Recognition Lab</Text>

      <Text style={styles.subtitle}>
        Offline Tagalog speech recognition using Whisper.
      </Text>

      {/* MODEL SECTION */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Whisper Model</Text>

        <Text style={styles.status}>{statusText}</Text>

        {status === 'downloading' && (
          <Text style={styles.progress}>
            Download: {Math.round(progress * 100)}%
          </Text>
        )}

        {status === 'error' && (
          <Pressable style={styles.primaryButton} onPress={retry}>
            <Text style={styles.buttonText}>Retry download</Text>
          </Pressable>
        )}

        {isReady && (
          <Text style={styles.success}>Model loaded successfully</Text>
        )}
      </View>

      {/* RECORDING SECTION */}

      <View style={styles.recordingContainer}>
        <Text style={styles.sectionTitle}>Voice Recording</Text>

        <Text style={styles.recordingStatus}>
          {isTranscribing
            ? `Transcribing ${Math.round(transcribeProgress)}%`
            : isRecording
              ? `● Recording · ${Math.round(durationMs / 1000)}s`
              : 'Ready'}
        </Text>

        <Pressable
          style={[styles.recordButton, isRecording && styles.stopButton]}
          disabled={!isReady || isTranscribing}
          onPress={handleToggleRecording}
        >
          <Text style={styles.buttonText}>
            {isRecording ? 'Stop & Transcribe' : 'Start Recording'}
          </Text>
        </Pressable>

        {isRecording && (
          <Pressable onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel recording</Text>
          </Pressable>
        )}

        <Text style={styles.hint}>
          Speak naturally in Tagalog or Taglish. Keep test recordings under 60
          seconds.
        </Text>
      </View>

      {/* TRANSCRIPTION SECTION */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Transcription Result</Text>

        {isTranscribing && (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#222" />

            <Text style={styles.status}>
              Processing: {Math.round(transcribeProgress)}%
            </Text>
          </View>
        )}

        <Text style={styles.transcript}>
          {transcript || 'Your transcription will appear here.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 50,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
  },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
  },
  status: {
    fontSize: 13,
    color: '#777',
  },
  progress: {
    fontSize: 14,
    color: '#444',
  },
  success: {
    color: '#23834a',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 9,
    alignItems: 'center',
  },
  recordingContainer: {
    alignItems: 'center',
    padding: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    gap: 18,
  },
  recordingStatus: {
    color: '#777',
    fontSize: 14,
  },
  recordButton: {
    backgroundColor: '#222',
    paddingVertical: 17,
    paddingHorizontal: 35,
    borderRadius: 30,
  },
  stopButton: {
    backgroundColor: '#a52d2d',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelText: {
    color: '#a52d2d',
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transcript: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
});
