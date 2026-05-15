import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import {
  studentAccessibilityVisuals,
  studentTextMetrics,
  useStudentPreferences
} from "@/api/studentPreferences";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { lectures } from "@/data/lectures";
import { AccessibilityMode, Lecture } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

const speeds = ["0.75x", "1x", "1.25x"];
type PlaybackState = "idle" | "playing" | "finished" | "error";

export default function AudioLessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = lectures.find((item) => item.id === id) ?? lectures[0];
  const preferences = useStudentPreferences();
  const metrics = studentTextMetrics(preferences.textSize);
  const visuals = studentAccessibilityVisuals(preferences);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [message, setMessage] = useState("Ready to play the lesson transcript.");
  const [speed, setSpeed] = useState(preferences.accessibilityMode === "Slow Learner" ? "0.75x" : "1x");
  const transcript = getTranscript(lesson, preferences.accessibilityMode);
  const playing = playbackState === "playing";

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (!preferences.audioSupport) {
      Speech.stop();
      setPlaybackState("idle");
      setMessage("Audio is turned off in Student Settings.");
    }
  }, [preferences.audioSupport]);

  function playTranscript() {
    if (!preferences.audioSupport) return;
    Speech.stop();
    setPlaybackState("playing");
    setMessage("Playing audio explanation...");
    Speech.speak(transcript, {
      language: languageCode(preferences.language),
      rate: speechRate(speed),
      pitch: 1,
      onDone: () => {
        setPlaybackState("finished");
        setMessage("Audio complete.");
      },
      onStopped: () => {
        setPlaybackState("idle");
        setMessage("Audio stopped.");
      },
      onError: () => {
        setPlaybackState("error");
        setMessage("Audio could not play on this device. You can still read the transcript below.");
      }
    });
  }

  function stopTranscript() {
    Speech.stop();
    setPlaybackState("idle");
    setMessage("Audio stopped.");
  }

  function togglePlayback() {
    if (playing) {
      stopTranscript();
      return;
    }
    playTranscript();
  }

  function changeSpeed(nextSpeed: string) {
    setSpeed(nextSpeed);
    if (playing) {
      Speech.stop();
      setPlaybackState("idle");
      setMessage("Speed changed. Press play to restart audio.");
    }
  }

  return (
    <ScreenContainer style={visuals.screenStyle}>
      <Header title="Audio Lesson" subtitle={lesson.title} showBack />

      <Card style={[styles.playerCard, visuals.cardStyle, !preferences.audioSupport && styles.disabledCard]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause audio lesson" : "Play audio lesson"}
          disabled={!preferences.audioSupport}
          onPress={togglePlayback}
          style={[styles.playButton, playing && styles.stopButton]}
        >
          <Ionicons name={playing ? "stop" : "play"} size={48} color={colors.white} />
        </Pressable>
        <Text style={[styles.lessonTitle, visuals.titleTextStyle]}>{lesson.title}</Text>
        <Text style={[styles.playerMessage, visuals.metaTextStyle]}>{message}</Text>
        <View style={styles.badgeRow}>
          <AccessibilityBadge mode={preferences.accessibilityMode} />
          <Badge label={preferences.audioSupport ? "Audio enabled" : "Audio disabled in settings"} tone={preferences.audioSupport ? "success" : "warning"} />
        </View>
      </Card>

      <SectionHeader title="Speed" />
      <View style={styles.speedRow}>
        {speeds.map((item) => {
          const selected = speed === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => changeSpeed(item)}
              style={[styles.speedChip, selected && styles.speedChipSelected]}
            >
              <Text style={[styles.speedText, selected && styles.speedTextSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Transcript" />
      <Card style={[styles.card, visuals.readingCardStyle]}>
        <Text style={[styles.body, visuals.bodyTextStyle, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}>
          {transcript}
        </Text>
      </Card>

      <SectionHeader title="Diagram described in words" />
      <Card style={[styles.card, visuals.readingCardStyle]}>
        <Text style={[styles.body, visuals.bodyTextStyle, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}>
          {lesson.diagramDescription}
        </Text>
      </Card>
    </ScreenContainer>
  );
}

function getTranscript(lesson: Lecture, mode: AccessibilityMode) {
  switch (mode) {
    case "Blind / Low Vision":
      return lesson.outputs.blindLowVision;
    case "Dyslexia Friendly":
      return lesson.outputs.dyslexiaFriendly;
    case "Multilingual":
      return lesson.outputs.multilingual;
    case "Slow Learner":
      return lesson.outputs.slowLearner;
    case "Standard":
    default:
      return lesson.outputs.standard;
  }
}

function speechRate(speed: string) {
  if (speed === "0.75x") return 0.75;
  if (speed === "1.25x") return 1.25;
  return 1;
}

function languageCode(language: string) {
  const normalized = language.toLowerCase();
  if (normalized.includes("hindi")) return "hi-IN";
  if (normalized.includes("spanish")) return "es-ES";
  if (normalized.includes("french")) return "fr-FR";
  if (normalized.includes("arabic")) return "ar";
  if (normalized.includes("chinese")) return "zh-CN";
  if (normalized.includes("tamil")) return "ta-IN";
  return "en-US";
}

const styles = StyleSheet.create({
  playerCard: {
    alignItems: "center",
    gap: spacing.md
  },
  disabledCard: {
    opacity: 0.72
  },
  playButton: {
    width: 112,
    height: 112,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  stopButton: {
    backgroundColor: colors.danger
  },
  lessonTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center"
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm
  },
  playerMessage: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center"
  },
  speedRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  speedChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  speedChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  speedText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800"
  },
  speedTextSelected: {
    color: colors.primaryDark
  },
  card: {
    gap: spacing.md
  },
  body: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: "600"
  }
});
