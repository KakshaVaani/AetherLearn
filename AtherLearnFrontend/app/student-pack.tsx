import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ReviewTabs } from "@/components/ReviewTabs";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useLessonPackReview } from "@/hooks/useLessonPackReview";
import { speakWithDeviceTts, stopDeviceTts, TtsStatus } from "@/utils/tts";
import { colors, radii, spacing } from "@/constants/theme";

const sections = [
  "Summary",
  "Visual Description",
  "Key Vocabulary",
  "Step-by-Step Explanation",
  "Practice Questions"
] as const;

type StudentSection = (typeof sections)[number];

export default function StudentPackScreen() {
  const params = useLocalSearchParams<{
    lessonId?: string;
    classroomId?: string;
    title?: string;
    grade?: string;
    subject?: string;
  }>();
  const [playbackState, setPlaybackState] = useState<TtsStatus>("ready");
  const [audioMessage, setAudioMessage] = useState("Ready to play device TTS.");
  const [openSection, setOpenSection] = useState<StudentSection>("Summary");
  const { lesson } = useLessonPackReview(params.lessonId);
  const pack = lesson.studentAccessPack;
  const transcript = pack.audioStudyScript.trim() || pack.screenReaderSummary.trim();
  const canPlayAudio = transcript.length > 0;
  const playing = playbackState === "playing" || playbackState === "loading_voices";
  const reviewParams = {
    lessonId: params.lessonId ?? lesson.id,
    classroomId: params.classroomId ?? lesson.classroomId ?? undefined,
    title: params.title ?? lesson.title,
    grade: params.grade ?? lesson.grade,
    subject: params.subject ?? lesson.subject
  };

  function sectionBody(section: StudentSection) {
    if (section === "Summary") return pack.screenReaderSummary;
    if (section === "Visual Description") return pack.visualDescription;
    if (section === "Key Vocabulary") {
      return pack.vocabulary.map((item) => `${item.term}: ${item.meaning}`).join("\n");
    }
    if (section === "Step-by-Step Explanation") {
      return pack.stepByStepExplanation || pack.screenReaderSummary;
    }
    return pack.practiceQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n");
  }

  useEffect(() => {
    return () => {
      stopDeviceTts();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopDeviceTts();
        setPlaybackState("stopped");
        setAudioMessage("Audio stopped.");
      };
    }, [])
  );

  useEffect(() => {
    stopDeviceTts();
    setPlaybackState("ready");
    setAudioMessage("Ready to play device TTS.");
  }, [lesson.id]);

  function stopAudio(message = "Audio stopped.") {
    stopDeviceTts();
    setPlaybackState("stopped");
    setAudioMessage(message);
  }

  function updateAudioStatus(status: TtsStatus) {
    setPlaybackState(status);
    setAudioMessage(audioStatusMessage(status));
  }

  function playAudio() {
    if (!canPlayAudio) {
      setPlaybackState("error");
      setAudioMessage("No audio text is available for this pack.");
      return;
    }
    void speakWithDeviceTts(transcript, {
      language: languageCode(lesson.language),
      rate: 0.82,
      pitch: 1,
      onStatus: updateAudioStatus,
      onError: (message) => {
        setPlaybackState("error");
        setAudioMessage(message);
      }
    });
  }

  function toggleAudio() {
    if (playing) {
      stopAudio();
      return;
    }
    playAudio();
  }

  return (
    <ScreenContainer>
      <Header title="Student Access Pack" subtitle={`${lesson.title} - ${lesson.grade} ${lesson.subject}`} showBack />
      <ReviewTabs active="student" params={reviewParams} onBeforeNavigate={() => stopAudio()} />

      <Card style={styles.playerCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "Stop audio explanation" : "Play audio explanation"}
          disabled={!canPlayAudio}
          onPress={toggleAudio}
          style={[styles.playButton, playing && styles.stopButton, !canPlayAudio && styles.disabledPlayButton]}
        >
          <Ionicons name={playing ? "stop" : "play"} size={36} color={colors.white} />
        </Pressable>
        <View style={styles.playerText}>
          <Text style={styles.playerTitle}>Audio explanation</Text>
          <Text style={styles.playerMeta}>{canPlayAudio ? audioMessage : "No audio text available."}</Text>
        </View>
      </Card>

      {sections.map((section) => {
        const selected = openSection === section;

        return (
          <Card key={section} style={styles.sectionCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: selected }}
              onPress={() => setOpenSection(section)}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>{section}</Text>
              </View>
              <Ionicons name={selected ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
            </Pressable>
            {selected ? <Text style={styles.sectionBody}>{sectionBody(section)}</Text> : null}
          </Card>
        );
      })}

      <View style={styles.actions}>
        <AppButton
          title="Ask Question"
          variant="outline"
          leftIcon={<Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />}
          style={styles.actionButton}
        />
        <AppButton
          title="Trust Pack"
          leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.white} />}
          onPress={() => {
            stopAudio();
            router.push({ pathname: "/trust-pack", params: reviewParams });
          }}
          style={styles.actionButton}
        />
      </View>
    </ScreenContainer>
  );
}

function audioStatusMessage(status: TtsStatus) {
  if (status === "loading_voices") return "Loading device voices...";
  if (status === "playing") return "Playing audio explanation...";
  if (status === "stopped") return "Audio stopped.";
  if (status === "finished") return "Audio complete.";
  if (status === "error") return "Audio could not play on this device.";
  return "Ready to play device TTS.";
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primarySoft
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  stopButton: {
    backgroundColor: colors.danger
  },
  disabledPlayButton: {
    opacity: 0.5
  },
  playerText: {
    flex: 1,
    gap: spacing.xs
  },
  playerTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  playerMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700"
  },
  sectionCard: {
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  sectionTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  sectionBody: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "600"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  },
  actionButton: {
    flex: 1
  }
});
