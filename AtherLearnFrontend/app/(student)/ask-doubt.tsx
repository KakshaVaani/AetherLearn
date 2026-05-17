import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { askStudentDoubt } from "@/api/backend";
import { useDefaultModelPreference } from "@/api/localPreferences";
import { useStudentCopy } from "@/api/studentCopy";
import {
  studentAccessibilityVisuals,
  studentTextMetrics,
  useStudentPreferences
} from "@/api/studentPreferences";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ModelModeSelector } from "@/components/ModelModeSelector";
import { ScreenContainer } from "@/components/ScreenContainer";
import { lectures } from "@/data/lectures";
import { colors, radii, spacing } from "@/constants/theme";

export default function AskDoubtScreen() {
  const preferences = useStudentPreferences();
  const copy = useStudentCopy();
  const visuals = studentAccessibilityVisuals(preferences);
  const metrics = studentTextMetrics(preferences.textSize);
  const [lessonId, setLessonId] = useState(lectures[0].id);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [modelPreference, setModelPreference] = useDefaultModelPreference();
  const selectedLecture = useMemo(
    () => lectures.find((lecture) => lecture.id === lessonId) ?? lectures[0],
    [lessonId]
  );

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        setSpeaking(false);
      };
    }, [])
  );

  async function submitQuestion() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    setFollowUp("");
    setError("");
    try {
      const response = await askStudentDoubt({
        lecture: selectedLecture,
        question: question.trim(),
        studentProfile: {
          accessibilityMode: preferences.accessibilityMode,
          language: preferences.language,
          textSize: preferences.textSize,
          audioSupport: preferences.audioSupport
        },
        modelPreference
      });
      setAnswer(response.answer || response.simpleAnswer || "I could not generate an answer.");
      setFollowUp(response.followUpSuggestion ?? response.follow_up_suggestion ?? "");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "I could not reach Gemma 4 right now. Please check the selected model and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleSpeech() {
    if (!answer) return;
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(readableText(answer), {
      language: languageCode(preferences.language),
      rate: preferences.accessibilityMode === "Slow Learner" ? 0.8 : 1,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false)
    });
  }

  return (
    <ScreenContainer style={visuals.screenStyle}>
      <Header title={copy.askTitle} subtitle={copy.askSubtitle} showSettings={false} />

      <Card style={[styles.card, visuals.cardStyle]}>
        <Text style={[styles.label, visuals.titleTextStyle]}>Lesson context</Text>
        <View style={styles.lessonList}>
          {lectures.map((lecture) => {
            const selected = lessonId === lecture.id;
            return (
              <Pressable
                key={lecture.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setLessonId(lecture.id)}
                style={[styles.lessonChip, selected && styles.lessonChipSelected]}
              >
                <Text style={[styles.lessonChipText, selected && styles.lessonChipTextSelected]}>
                  {lecture.subject}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.contextTitle, visuals.titleTextStyle]}>{selectedLecture.title}</Text>
      </Card>

      <Card style={[styles.card, visuals.cardStyle]}>
        <Text style={[styles.label, visuals.titleTextStyle]}>Your doubt</Text>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={copy.askPlaceholder}
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, visuals.bodyTextStyle]}
        />
        <ModelModeSelector
          value={modelPreference}
          onChange={setModelPreference}
          label="Answer model"
          compact
        />
        <AppButton
          title={copy.askButton}
          loading={loading}
          disabled={!question.trim()}
          leftIcon={<Ionicons name="sparkles-outline" size={20} color={colors.white} />}
          onPress={submitQuestion}
        />
      </Card>

      {answer ? (
        <Card style={[styles.answerCard, visuals.readingCardStyle]}>
          <View style={styles.answerHeader}>
            <Pressable accessibilityRole="button" onPress={toggleSpeech} style={styles.listenButton}>
              <Ionicons name={speaking ? "stop" : "volume-high-outline"} size={18} color={colors.primary} />
              <Text style={styles.listenText}>{speaking ? copy.stop : copy.listen}</Text>
            </Pressable>
          </View>
          <FormattedAnswer text={answer} bodyFontSize={metrics.bodyFontSize} bodyLineHeight={metrics.bodyLineHeight} />
          {followUp ? (
            <View style={styles.followUpBox}>
              <Text style={styles.simpleLabel}>Next step</Text>
              <Text style={[styles.answerText, visuals.bodyTextStyle, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}>
                {followUp}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {error ? (
        <Card style={[styles.errorCard, visuals.cardStyle]}>
          <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

function FormattedAnswer({
  text,
  bodyFontSize,
  bodyLineHeight
}: {
  text: string;
  bodyFontSize: number;
  bodyLineHeight: number;
}) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <View style={styles.formattedAnswer}>
      {lines.map((line, index) => {
        if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
          return (
            <Text key={`${line}-${index}`} style={styles.answerHeading}>
              {line.replace(/^#{1,3}\s*/, "")}
            </Text>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <View key={`${line}-${index}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>-</Text>
              <Text style={[styles.answerText, { fontSize: bodyFontSize, lineHeight: bodyLineHeight }]}>
                {cleanMarkdown(line.slice(2))}
              </Text>
            </View>
          );
        }
        return (
          <Text key={`${line}-${index}`} style={[styles.answerText, { fontSize: bodyFontSize, lineHeight: bodyLineHeight }]}>
            {cleanMarkdown(line)}
          </Text>
        );
      })}
    </View>
  );
}

function cleanMarkdown(value: string) {
  return value.replace(/\*\*/g, "").replace(/`/g, "");
}

function readableText(value: string) {
  return cleanMarkdown(value)
    .replace(/^#{1,3}\s*/gm, "")
    .replace(/^[-*]\s*/gm, "")
    .replace(/\n{2,}/g, ". ");
}

function languageCode(language: string) {
  const normalized = language.toLowerCase();
  if (normalized.includes("hindi")) return "hi-IN";
  if (normalized.includes("spanish")) return "es-ES";
  if (normalized.includes("french")) return "fr-FR";
  if (normalized.includes("arabic")) return "ar-SA";
  if (normalized.includes("chinese")) return "zh-CN";
  if (normalized.includes("tamil")) return "ta-IN";
  return "en-US";
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  lessonList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  lessonChip: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    justifyContent: "center"
  },
  lessonChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  lessonChipText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  lessonChipTextSelected: {
    color: colors.primaryDark
  },
  contextTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  input: {
    minHeight: 128,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    padding: spacing.md,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top"
  },
  answerCard: {
    gap: spacing.md
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.md
  },
  listenButton: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card
  },
  listenText: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  answerText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "700"
  },
  formattedAnswer: {
    gap: spacing.sm
  },
  answerHeading: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
    marginTop: spacing.xs
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  bulletDot: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "900"
  },
  followUpBox: {
    borderRadius: radii.lg,
    backgroundColor: colors.secondarySoft,
    padding: spacing.md,
    gap: spacing.xs
  },
  simpleLabel: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderColor: "#FECACA"
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  }
});
