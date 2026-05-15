import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchStudentLesson } from "@/api/backend";
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
import { lectures } from "@/data/lectures";
import { AccessibilityMode, Lecture } from "@/types";
import { colors, spacing } from "@/constants/theme";

export default function StudentLessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fallbackLesson = lectures.find((item) => item.id === id) ?? lectures[0];
  const [lesson, setLesson] = useState<Lecture>(fallbackLesson);
  const [connected, setConnected] = useState(false);
  const preferences = useStudentPreferences();
  const metrics = studentTextMetrics(preferences.textSize);
  const visuals = studentAccessibilityVisuals(preferences);
  const personalizedNotes = getPersonalizedNotes(lesson, preferences.accessibilityMode);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    fetchStudentLesson(id)
      .then((data) => {
        if (!mounted) return;
        setLesson(data.lesson);
        setConnected(true);
      })
      .catch(() => {
        if (mounted) setConnected(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <ScreenContainer style={visuals.screenStyle}>
      <Header title={lesson.title} subtitle={lesson.subject} showBack />

      <Card style={[styles.heroCard, visuals.readingCardStyle]}>
        <View style={styles.badgeRow}>
          <AccessibilityBadge mode={preferences.accessibilityMode} />
          <Badge label={preferences.textSize + " text"} tone="primary" />
          {preferences.accessibilityMode === "Multilingual" ? (
            <Badge label={preferences.language} tone="secondary" />
          ) : null}
        </View>
        <Text style={[styles.notes, visuals.bodyTextStyle, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}>
          {personalizedNotes}
        </Text>
        <Badge label={connected ? "Backend lesson" : "Saved offline"} tone="success" />
      </Card>

      <SectionHeader title="Key points" />
      <Card style={[styles.card, visuals.readingCardStyle]}>
        {["Plants make food using sunlight.", "Water enters through roots.", "Leaves release oxygen."].map(
          (point, index) => (
            <Text
              key={point}
              style={[styles.point, visuals.bodyTextStyle, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}
            >
              {index + 1}. {point}
            </Text>
          )
        )}
      </Card>

      <SectionHeader title="Diagram description" />
      <Card style={[styles.card, visuals.readingCardStyle]}>
        <Text style={[styles.body, visuals.bodyTextStyle, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}>
          {lesson.diagramDescription}
        </Text>
      </Card>

      {preferences.audioSupport ? (
        <Card
          style={styles.audioCard}
          onPress={() =>
            router.push({ pathname: "/(student)/audio/[id]", params: { id: lesson.id } })
          }
        >
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color={colors.white} />
          </View>
          <View style={styles.audioText}>
            <Text style={styles.audioTitle}>Audio explanation</Text>
            <Text style={styles.audioSubtitle}>Listen to a slower, classroom-friendly version.</Text>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Practice questions" />
      <Card style={[styles.card, visuals.readingCardStyle]}>
        {lesson.practiceQuestions.map((question, index) => (
          <Text
            key={question}
            style={[styles.point, visuals.bodyTextStyle, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}
          >
            {index + 1}. {question}
          </Text>
        ))}
      </Card>

      <View style={styles.actions}>
        <AppButton
          title="Ask Gemma"
          variant="outline"
          leftIcon={<Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />}
        />
        <AppButton
          title="Open Assignment"
          onPress={() =>
            router.push({ pathname: "/(student)/assignment/[id]", params: { id: assignments[0].id } })
          }
        />
      </View>
    </ScreenContainer>
  );
}

function getPersonalizedNotes(lesson: Lecture, mode: AccessibilityMode) {
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

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  notes: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 30,
    fontWeight: "700"
  },
  card: {
    gap: spacing.md
  },
  point: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "700"
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25
  },
  audioCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primary
  },
  playButton: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  audioText: {
    flex: 1,
    gap: spacing.xs
  },
  audioTitle: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  audioSubtitle: {
    color: "#DBEAFE",
    fontSize: 14,
    lineHeight: 20
  },
  actions: {
    gap: spacing.md
  }
});
