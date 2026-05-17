import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { publishTeacherLessonChanges } from "@/api/backend";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ReviewTabs } from "@/components/ReviewTabs";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useLessonPackReview } from "@/hooks/useLessonPackReview";
import { colors, radii, spacing } from "@/constants/theme";
import {
  lessonOriginRoute,
  lessonStateLabel,
  resolveLessonOrigin,
  resolveLessonReviewMode
} from "@/utils/lessonReview";
import { useState } from "react";

function TrustRow({
  icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning" | "neutral";
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Badge label={value} tone={tone} />
    </View>
  );
}

export default function TrustPackScreen() {
  const params = useLocalSearchParams<{
    lessonId?: string;
    classroomId?: string;
    title?: string;
    grade?: string;
    subject?: string;
    mode?: "generated" | "view";
    origin?: "classroom" | "library";
  }>();
  const [publishing, setPublishing] = useState(false);
  const { lesson, loading, notFound, source: lessonSource, replaceLesson } = useLessonPackReview(params.lessonId);

  if (loading || !lesson) {
    return (
      <ScreenContainer>
        <Header
          title={notFound ? "Lesson not found" : "Loading Trust Pack"}
          subtitle={notFound ? "This lesson is not available in the current workspace." : "Fetching the selected lesson."}
          showBack
        />
        <Card style={styles.stateCard}>
          {notFound ? (
            <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
          <Text style={styles.stateText}>
            {notFound ? "Return to the class and open a synced lesson." : "Loading topic-specific trust details..."}
          </Text>
        </Card>
      </ScreenContainer>
    );
  }

  const trust = lesson.trustPack;
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
  const warningCount = trust.accessibilityWarnings.length;

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
        title={isViewMode ? "Lesson Trust Details" : "Trust Pack"}
        subtitle={`${lesson.title} - ${lesson.grade} ${lesson.subject} - ${isViewMode ? statusLabel : "Generated draft"}`}
        showBack
        onBack={isViewMode ? goBackToOrigin : undefined}
      />
      <ReviewTabs active="trust" params={reviewParams} />

      <Card style={styles.card}>
        <TrustRow icon="cloud-outline" label="Runtime Mode" value={trust.runtimeMode} tone="primary" />
        <TrustRow icon="hardware-chip-outline" label="Model" value={trust.model} tone="neutral" />
        <TrustRow icon="time-outline" label="Average Latency" value={trust.latency} tone="neutral" />
        <TrustRow icon="code-slash-outline" label="Schema Status" value={trust.schemaStatus} tone="success" />
        <TrustRow
          icon="person-outline"
          label="Teacher Review"
          value={trust.teacherReviewStatus}
          tone={trust.teacherReviewStatus === "Approved" ? "success" : "warning"}
        />
        <TrustRow icon="analytics-outline" label="Confidence" value={`${trust.confidence}%`} tone="success" />
      </Card>

      <Card style={styles.warningCard}>
        <View style={styles.warningHeader}>
          <Ionicons name="warning-outline" size={22} color={colors.warning} />
          <Text style={styles.warningTitle}>Accessibility warnings</Text>
          <Badge label={`${warningCount} issue`} tone={warningCount > 0 ? "warning" : "success"} />
        </View>
        {trust.accessibilityWarnings.map((warning) => (
          <Text key={warning} style={styles.warningText}>
            - {warning}
          </Text>
        ))}
      </Card>

      <Card style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.infoText}>
          {isViewMode
            ? "This lesson has already been generated. Editing it will mark it as needing teacher review before sharing updates."
            : "Content is generated as a teacher-reviewed draft. The first build keeps exports local and clearly labels mock, hosted, or local runtime mode."}
        </Text>
      </Card>

      <View style={styles.actions}>
        {isViewMode ? (
          <>
            <AppButton
              title="Edit"
              variant="outline"
              leftIcon={<Ionicons name="create-outline" size={20} color={colors.text} />}
              onPress={() =>
                router.push({
                  pathname: "/(teacher)/lesson-editor",
                  params: {
                    ...reviewParams,
                    returnTo: "trust"
                  }
                })
              }
              style={styles.actionButton}
            />
            {needsPublish ? (
              <AppButton
                title="Publish Changes"
                variant="success"
                loading={publishing}
                leftIcon={<Ionicons name="cloud-upload-outline" size={20} color={colors.white} />}
                onPress={publishChanges}
                style={styles.actionButton}
              />
            ) : (
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
            )}
          </>
        ) : (
          <>
            <AppButton
              title="Export"
              variant="outline"
              leftIcon={<Ionicons name="download-outline" size={20} color={colors.text} />}
              style={styles.actionButton}
            />
            <AppButton
              title="Save to Library"
              variant="success"
              leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
              onPress={() => router.push("/(teacher)/lessons")}
              style={styles.actionButton}
            />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  warningCard: {
    gap: spacing.md,
    backgroundColor: colors.warningSoft
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  warningTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  warningText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.primarySoft
  },
  infoText: {
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
  },
  stateCard: {
    alignItems: "center",
    gap: spacing.md
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center"
  }
});
