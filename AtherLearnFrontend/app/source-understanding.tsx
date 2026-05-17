import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { publishTeacherLessonChanges } from "@/api/backend";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { LessonSourcePreview } from "@/components/LessonSourcePreview";
import { ReviewTabs } from "@/components/ReviewTabs";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { useLessonPackReview } from "@/hooks/useLessonPackReview";
import { colors, radii, spacing } from "@/constants/theme";
import {
  lessonOriginRoute,
  lessonStateLabel,
  lessonStateTone,
  resolveLessonOrigin,
  resolveLessonReviewMode
} from "@/utils/lessonReview";

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(/\r?\n|[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function Chip({ label, tone = "neutral" }: { label: string; tone?: "primary" | "success" | "neutral" }) {
  const stylesByTone = {
    primary: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
    success: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
    neutral: { backgroundColor: colors.card, borderColor: colors.border }
  };

  return (
    <View style={[styles.chip, stylesByTone[tone]]}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export default function SourceUnderstandingScreen() {
  const params = useLocalSearchParams<{
    lessonId?: string;
    classroomId?: string;
    title?: string;
    grade?: string;
    subject?: string;
    mode?: "generated" | "view";
    origin?: "classroom" | "library";
  }>();
  const { lesson, loading, connected, notFound, source: lessonSource, replaceLesson } = useLessonPackReview(params.lessonId);
  const [publishing, setPublishing] = useState(false);

  if (loading || !lesson) {
    return (
      <ScreenContainer>
        <Header
          title={notFound ? "Lesson not found" : "Loading Source Pack"}
          subtitle={notFound ? "This lesson is not available in the current workspace." : "Fetching the selected lesson."}
          showBack
        />
        <Card style={styles.stateCard}>
          {notFound ? (
            <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
          <Text style={styles.emptyState}>
            {notFound ? "Return to the class and open a synced lesson." : "Loading topic-specific notes..."}
          </Text>
        </Card>
      </ScreenContainer>
    );
  }

  const source = {
    topic: lesson.sourceCard?.topic ?? lesson.title,
    confidence: typeof lesson.sourceCard?.confidence === "number" ? lesson.sourceCard.confidence : 0,
    detectedText: toStringList(lesson.sourceCard?.detectedText),
    diagramElements: toStringList(lesson.sourceCard?.diagramElements),
    unclearRegions: toStringList(lesson.sourceCard?.unclearRegions)
  };
  const reviewParams = {
    lessonId: params.lessonId ?? lesson.id,
    classroomId: params.classroomId ?? lesson.classroomId ?? undefined,
    title: params.title ?? lesson.title,
    grade: params.grade ?? lesson.grade,
    subject: params.subject ?? lesson.subject,
    mode: resolveLessonReviewMode(params.mode, params.lessonId),
    origin: resolveLessonOrigin(params.origin, params.classroomId ?? lesson.classroomId ?? undefined)
  };
  const isViewMode = reviewParams.mode === "view";
  const statusLabel = lessonStateLabel(lesson);
  const needsPublish = isViewMode && lesson.status === "Needs Review";

  function goBackToOrigin() {
    router.replace(lessonOriginRoute(reviewParams.origin, reviewParams.classroomId));
  }

  async function publishChanges() {
    if (!lesson) return;
    setPublishing(true);
    try {
      const saved = await publishTeacherLessonChanges(lesson.id, lesson);
      replaceLesson(saved, lessonSource);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <ScreenContainer>
      <Header
        title={isViewMode ? "Lesson Notes" : "Source Pack"}
        subtitle={lesson.title}
        showBack
        onBack={isViewMode ? goBackToOrigin : undefined}
      />
      <ReviewTabs active="source" params={reviewParams} />

      <LessonSourcePreview lesson={lesson} compact />

      <Card style={styles.topicCard}>
        <View style={styles.topicHeader}>
          <View>
            <Text style={styles.label}>Detected Topic</Text>
            <Text style={styles.topic}>{source.topic}</Text>
            <Text style={styles.meta}>
              {lesson.grade} - {lesson.subject} - {isViewMode ? statusLabel : connected ? "Backend draft" : "Demo preview"}
            </Text>
          </View>
          <Badge label={isViewMode ? statusLabel : `${source.confidence}% confidence`} tone={isViewMode ? lessonStateTone(lesson) : "success"} />
        </View>
      </Card>

      <SectionHeader title="Detected text" />
      <View style={styles.chipGrid}>
        {source.detectedText.length ? source.detectedText.map((text) => (
          <Chip key={text} label={text} tone="success" />
        )) : <Text style={styles.emptyState}>No text was detected yet.</Text>}
      </View>

      <SectionHeader title="Detected diagram elements" />
      <View style={styles.chipGrid}>
        {source.diagramElements.length ? source.diagramElements.map((element) => (
          <Chip key={element} label={element} tone="primary" />
        )) : <Text style={styles.emptyState}>No diagram elements were detected yet.</Text>}
      </View>

      <Card style={styles.warningCard}>
        <Ionicons name="warning-outline" size={22} color={colors.warning} />
        <Text style={styles.warningText}>{source.unclearRegions[0] ?? "No unclear regions were flagged."}</Text>
      </Card>

      <View style={styles.actions}>
        <AppButton
          title="Edit"
          variant="outline"
          leftIcon={<Ionicons name="create-outline" size={20} color={colors.text} />}
          onPress={() =>
            router.push({
              pathname: "/(teacher)/lesson-editor",
              params: {
                ...reviewParams,
                returnTo: "source"
              }
            })
          }
          style={styles.actionButton}
        />
        {needsPublish ? (
          <AppButton
            title="Publish Changes"
            loading={publishing}
            leftIcon={<Ionicons name="cloud-upload-outline" size={20} color={colors.white} />}
            onPress={publishChanges}
            style={styles.actionButton}
          />
        ) : isViewMode ? (
          <AppButton
            title="Create Assignment"
            leftIcon={<Ionicons name="clipboard-outline" size={20} color={colors.white} />}
            onPress={() =>
              router.push({
                pathname: "/(teacher)/create-assignment",
                params: {
                  lessonId: lesson.id,
                  classroomId: lesson.classroomId ?? params.classroomId
                }
              })
            }
            style={styles.actionButton}
          />
        ) : (
          <AppButton
            title="Confirm"
            leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
            onPress={() => router.push({ pathname: "/teacher-pack", params: reviewParams })}
            style={styles.actionButton}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topicCard: {
    gap: spacing.md
  },
  topicHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  topic: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: spacing.xs
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  emptyState: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  stateCard: {
    alignItems: "center",
    gap: spacing.md
  },
  chip: {
    minHeight: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.warningSoft
  },
  warningText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  },
  actionButton: {
    flex: 1
  }
});
