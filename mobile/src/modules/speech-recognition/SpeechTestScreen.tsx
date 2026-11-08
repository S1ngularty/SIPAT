import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AudioModule,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';

import { initWhisper, WhisperContext } from 'whisper.rn';

import { downloadWhisperModel } from './speech.model';

const TARGET_SAMPLE_RATE = 16000;

function resampleAudio(
  input: Float32Array,
  originalRate: number,
): Float32Array {
  if (originalRate === TARGET_SAMPLE_RATE) {
    return input;
  }

  const outputLength = Math.round(
    input.length * TARGET_SAMPLE_RATE / originalRate,
  );

  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const sourcePosition = i * originalRate / TARGET_SAMPLE_RATE;
    const index = Math.floor(sourcePosition);
    const fraction = sourcePosition - index;

    const current = input[index] ?? 0;
    const next = input[index + 1] ?? current;

    output[i] = current + (next - current) * fraction;
  }

  return output;
}

// Convert Float32 samples (-1.0 ~ 1.0) to Int16 PCM (-32768 ~ 32767)
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

export default function SpeechTestScreen() {
  const whisperRef = useRef<WhisperContext | null>(null);

  const chunksRef = useRef<Float32Array[]>([]);
  const recordingRef = useRef(false);
  const totalSamplesRef = useRef(0);

  const [modelLoaded, setModelLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [transcribeProgress, setTranscribeProgress] = useState(0);

  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Model not initialized');

  // Capture mono Float32 PCM at 16 kHz.
  const audio = useAudioStream({
    sampleRate: TARGET_SAMPLE_RATE,
    channels: 1,
    encoding: 'float32',

    onBuffer: ({ data }) => {
      if (!recordingRef.current) return;

      // Keep a copy because native buffers may be reused.
      const samples = new Float32Array(data.slice(0));

      chunksRef.current.push(samples);
      totalSamplesRef.current += samples.length;
    },
  });

  useEffect(() => {
    return () => {
      recordingRef.current = false;
      audio.stream.stop();

      if (whisperRef.current) {
        void whisperRef.current.release();
        whisperRef.current = null;
      }
    };
  }, []);

  // Download and initialize Whisper.
  const initializeWhisper = async () => {
    try {
      setStatus('Downloading Whisper model...');
      setDownloadProgress(0);

      const modelPath = await downloadWhisperModel((progress) => {
        setDownloadProgress(Math.round(progress * 100));
      });

      setStatus('Loading Whisper model...');

      const context = await initWhisper({
        filePath: modelPath,
        useGpu: false,
      });

      whisperRef.current = context;

      setModelLoaded(true);
      setStatus('Whisper is ready');
    } catch (error) {
      console.error('Whisper initialization error:', error);

      setStatus('Model initialization failed');

      Alert.alert(
        'Whisper Error',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  // Start microphone capture.
  const startRecording = async () => {
    try {
      if (!whisperRef.current) {
        throw new Error('Initialize Whisper first.');
      }

      const permission =
        await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        throw new Error('Microphone permission was denied.');
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      chunksRef.current = [];
      totalSamplesRef.current = 0;

      setTranscript('');
      setTranscribeProgress(0);

      recordingRef.current = true;

      await audio.stream.start();

      setIsRecording(true);
      setStatus('Recording...');
    } catch (error) {
      recordingRef.current = false;

      console.error('Recording error:', error);

      setStatus('Recording failed');

      Alert.alert(
        'Recording Error',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  // Stop recording and transcribe the captured samples.
  const stopRecording = async () => {
    try {
      recordingRef.current = false;

      const actualSampleRate = audio.stream.sampleRate;

      audio.stream.stop();

      setIsRecording(false);
      setIsProcessing(true);

      setStatus('Preparing audio...');

      if (chunksRef.current.length === 0) {
        throw new Error('No audio samples were captured.');
      }

      // Merge individual PCM buffers.
      const totalLength = totalSamplesRef.current;
      const mergedAudio = new Float32Array(totalLength);

      let offset = 0;

      for (const chunk of chunksRef.current) {
        mergedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      chunksRef.current = [];

      // Convert to Whisper's expected 16 kHz sample rate.
      const processedAudio = resampleAudio(
        mergedAudio,
        actualSampleRate,
      );

      // Silence guard: avoid hallucinated output like "(Song)".
      const maxAmplitude = processedAudio.reduce(
        (max, v) => Math.max(max, Math.abs(v)),
        0,
      );

      if (maxAmplitude < 0.001) {
        throw new Error(
          'Audio is essentially silent. Please record again and speak closer to the microphone.',
        );
      }

      // Whisper expects 16-bit PCM, not float32.
      const pcm16 = float32ToInt16(processedAudio);

      setStatus('Transcribing Tagalog speech...');

      const { promise } = whisperRef.current!.transcribeData(
        pcm16.buffer as ArrayBuffer,
        {
          language: 'tl',
          onProgress: (progress) => {
            setTranscribeProgress(progress);
          },
        },
      );

      const { result } = await promise;

      setTranscript(result);
      setStatus('Transcription completed');
    } catch (error) {
      console.error('Transcription error:', error);

      setStatus('Transcription failed');

      Alert.alert(
        'Transcription Error',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      chunksRef.current = [];
      totalSamplesRef.current = 0;
      setIsProcessing(false);
    }
  };

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

        <Text style={styles.status}>{status}</Text>

        {!modelLoaded && (
          <>
            {downloadProgress > 0 && (
              <Text style={styles.progress}>
                Download: {downloadProgress}%
              </Text>
            )}

            <Pressable
              style={styles.primaryButton}
              onPress={initializeWhisper}
              disabled={isRecording || isProcessing}
            >
              <Text style={styles.buttonText}>
                Initialize Whisper Base
              </Text>
            </Pressable>
          </>
        )}

        {modelLoaded && (
          <Text style={styles.success}>Model loaded successfully</Text>
        )}
      </View>

      {/* RECORDING SECTION */}

      <View style={styles.recordingContainer}>
        <Text style={styles.sectionTitle}>Voice Recording</Text>

        <Text style={styles.recordingStatus}>
          {isRecording ? '● Recording' : 'Ready'}
        </Text>

        <Pressable
          style={[
            styles.recordButton,
            isRecording && styles.stopButton,
          ]}
          disabled={!modelLoaded || isProcessing}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={styles.buttonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </Pressable>

        <Text style={styles.hint}>
          Speak naturally in Tagalog or Taglish.
          Keep test recordings under 60 seconds.
        </Text>
      </View>

      {/* TRANSCRIPTION SECTION */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Transcription Result</Text>

        {isProcessing && (
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