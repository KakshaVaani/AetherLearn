import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { fetchStudentLessons, submitAssignment } from "@/api/backend";
import {
  studentAccessibilityVisuals,
  studentTextMetrics,
  useStudentPreferences
} from "@/api/studentPreferences";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { assignments } from "@/data/assignments";
import { Assignment } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

export default function StudentAssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [items, setItems] = useState<Assignment[]>(assignments);
  const [connected, setConnected] = useState(false);
  const assignment = items.find((item) => item.id === id) ?? assignments.find((item) => item.id === id) ?? items[0];
  const [answer, setAnswer] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Answers sync to backend when the assignment exists there.");
  const preferences = useStudentPreferences();
  const metrics = studentTextMetrics(preferences.textSize);
  const visuals = studentAccessibilityVisuals(preferences);

  useEffect(() => {
    let mounted = true;
    fetchStudentLessons()
      .then((synced) => {
        if (!mounted) return;
        if (synced.length > 0) setItems(synced);
        setConnected(true);
      })
      .catch(() => {
        if (mounted) setConnected(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function submitAnswer() {
    setSubmitting(true);
    setSyncMessage("Submitting to backend...");
    try {
      await submitAssignment(
        assignment.id,
        assignment.answerMode === "text" ? { answer } : selectedOptions
      );
      setSyncMessage("Submitted to backend.");
    } catch {
      setSyncMessage("Backend submission skipped; saved as demo attempt.");
    } finally {
      setSubmitting(false);
      router.replace("/(student)/feedback");
    }
  }

  return (
    <ScreenContainer style={visuals.screenStyle}>
      <Header title={assignment.title} subtitle={"Due " + assignment.dueDate} showBack />
      <Card style={[styles.profileCard, visuals.cardStyle]}>
        <View style={styles.headerRow}>
          <View style={styles.profileText}>
            <Text style={[styles.profileTitle, visuals.titleTextStyle]}>Your version</Text>
            <View style={styles.badgeRow}>
              <AccessibilityBadge mode={preferences.accessibilityMode} />
              <Badge label={preferences.textSize + " text"} tone="primary" />
            </View>
          </View>
          <Badge label={assignment.answerMode === "mcq" ? "MCQ" : "Text answer"} tone="secondary" />
        </View>
      </Card>
      <Text style={styles.syncText}>
        {connected ? "Assignment synced from backend." : "Showing local demo assignment."}
      </Text>

      <SectionHeader title="Questions" />
      <Card style={[styles.card, visuals.readingCardStyle]}>
        {assignment.questions.map((question, index) => (
          <View key={question.id} style={styles.questionBlock}>
            <Text style={[styles.question, visuals.bodyTextStyle, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}>
              {index + 1}. {question.prompt}
            </Text>
            {question.hint ? (
              <Text style={[styles.hint, visuals.metaTextStyle, { fontSize: metrics.metaFontSize, lineHeight: metrics.metaLineHeight }]}>
                {question.hint}
              </Text>
            ) : null}
            {assignment.answerMode === "mcq" ? (
              <View style={styles.optionsList}>
                {(question.options ?? []).map((option) => {
                  const selected = selectedOptions[question.id] === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() =>
                        setSelectedOptions((current) => ({
                          ...current,
                          [question.id]: option
                        }))
                      }
                      style={[styles.optionRow, selected && styles.optionRowSelected]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          visuals.metaTextStyle,
                          { fontSize: metrics.metaFontSize, lineHeight: metrics.metaLineHeight },
                          selected && styles.optionTextSelected
                        ]}
                      >
                        {option}
                      </Text>
                      <Text style={[styles.optionState, selected && styles.optionTextSelected]}>
                        {selected ? "Selected" : "Choose"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ))}
      </Card>

      {assignment.answerMode === "text" ? (
        <>
          <SectionHeader title="Your answer" />
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            style={[styles.input, visuals.bodyTextStyle]}
            placeholder="Type your answer here"
            multiline
          />
        </>
      ) : null}
      <Text style={styles.syncText}>{syncMessage}</Text>
      <AppButton title="Submit Answer" onPress={submitAnswer} loading={submitting} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    gap: spacing.sm
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  profileText: {
    flex: 1,
    gap: spacing.sm
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  profileTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  card: {
    gap: spacing.lg
  },
  questionBlock: {
    gap: spacing.md
  },
  question: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "800"
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  optionsList: {
    gap: spacing.sm
  },
  optionRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  optionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  optionText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800"
  },
  optionTextSelected: {
    color: colors.primaryDark
  },
  optionState: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900"
  },
  input: {
    minHeight: 140,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    padding: spacing.lg,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top"
  },
  syncText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  }
});
