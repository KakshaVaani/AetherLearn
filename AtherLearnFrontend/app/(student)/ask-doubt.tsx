import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
  const [subject, setSubject] = useState(lectures[0].subject);
  const [openSelector, setOpenSelector] = useState<"subject" | "lesson" | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [modelPreference, setModelPreference] = useDefaultModelPreference();
  const subjectOptions = useMemo(
    () => Array.from(new Set(lectures.map((lecture) => lecture.subject))).sort(),
    []
  );
  const lessonOptions = useMemo(
    () => lectures.filter((lecture) => lecture.subject === subject),
    [subject]
  );
  const selectedLecture = useMemo(
    () => lessonOptions.find((lecture) => lecture.id === lessonId) ?? lessonOptions[0] ?? lectures[0],
    [lessonId, lessonOptions]
  );

  useEffect(() => {
    if (!lessonOptions.some((lecture) => lecture.id === lessonId)) {
      setLessonId(lessonOptions[0]?.id ?? lectures[0].id);
    }
  }, [lessonId, lessonOptions]);

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
        <View style={styles.selectorGrid}>
          <DropdownField
            label="Subject"
            value={subject}
            open={openSelector === "subject"}
            onToggle={() => setOpenSelector((current) => current === "subject" ? null : "subject")}
          >
            {subjectOptions.map((item) => (
              <DropdownOption
                key={item}
                label={item}
                selected={subject === item}
                onPress={() => {
                  setSubject(item);
                  setLessonId(lectures.find((lecture) => lecture.subject === item)?.id ?? lectures[0].id);
                  setOpenSelector(null);
                }}
              />
            ))}
          </DropdownField>

          <DropdownField
            label="Context"
            value={selectedLecture.title}
            open={openSelector === "lesson"}
            onToggle={() => setOpenSelector((current) => current === "lesson" ? null : "lesson")}
          >
            {lessonOptions.map((lecture) => (
              <DropdownOption
                key={lecture.id}
                label={lecture.title}
                selected={lessonId === lecture.id}
                onPress={() => {
                  setLessonId(lecture.id);
                  setOpenSelector(null);
                }}
              />
            ))}
          </DropdownField>
        </View>
        <View style={styles.contextSummary}>
          <Ionicons name="book-outline" size={18} color={colors.primary} />
          <Text style={[styles.contextTitle, visuals.titleTextStyle]}>{selectedLecture.title}</Text>
        </View>
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

function DropdownField({
  label,
  value,
  open,
  onToggle,
  children
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.dropdownWrap}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={[styles.dropdownButton, open && styles.dropdownButtonOpen]}
      >
        <Text numberOfLines={1} style={styles.dropdownValue}>{value}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
      </Pressable>
      {open ? <View style={styles.dropdownMenu}>{children}</View> : null}
    </View>
  );
}

function DropdownOption({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.dropdownOption, selected && styles.dropdownOptionSelected]}
    >
      <Text numberOfLines={2} style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextSelected]}>
        {label}
      </Text>
      {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
    </Pressable>
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
  selectorGrid: {
    gap: spacing.md
  },
  dropdownWrap: {
    position: "relative",
    gap: spacing.xs,
    zIndex: 2
  },
  dropdownLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  dropdownButton: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  dropdownButtonOpen: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  dropdownValue: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  dropdownMenu: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden"
  },
  dropdownOption: {
    minHeight: 46,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  dropdownOptionSelected: {
    backgroundColor: colors.primarySoft
  },
  dropdownOptionText: {
    flex: 1,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  dropdownOptionTextSelected: {
    color: colors.primaryDark,
    fontWeight: "900"
  },
  contextSummary: {
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md
  },
  contextTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
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
