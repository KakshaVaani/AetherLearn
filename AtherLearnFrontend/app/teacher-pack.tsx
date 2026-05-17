import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
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
  lessonStateTone,
  resolveLessonOrigin,
  resolveLessonReviewMode
} from "@/utils/lessonReview";

const tabs = ["Objective", "Script", "Activity", "Worksheet", "Answers"] as const;
type TeacherTab = (typeof tabs)[number];

export default function TeacherPackScreen() {
  const params = useLocalSearchParams<{
    lessonId?: string;
    classroomId?: string;
    title?: string;
    grade?: string;
    subject?: string;
    mode?: "generated" | "view";
    origin?: "classroom" | "library";
  }>();
  const [activeTab, setActiveTab] = useState<TeacherTab>("Objective");
  const [revision, setRevision] = useState(1);
  const [regenerating, setRegenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { lesson, loading, notFound, source: lessonSource, replaceLesson } = useLessonPackReview(params.lessonId);

  if (loading || !lesson) {
    return (
      <ScreenContainer>
        <Header
          title={notFound ? "Lesson not found" : "Loading Teacher Pack"}
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
            {notFound ? "Return to the class and open a synced lesson." : "Loading topic-specific teacher notes..."}
          </Text>
        </Card>
      </ScreenContainer>
    );
  }

  const pack = lesson.teacherPack;
  const learnerSupport = learnerSupportItems(pack.differentiatedSupport);
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
  const revisionSuffix = revision > 1
    ? `\n\nRevision ${revision}: Refined for clearer classroom delivery and easier review.`
    : "";

  async function regeneratePack() {
    setRegenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setRevision((current) => current + 1);
    } finally {
      setRegenerating(false);
    }
  }

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
        title={isViewMode ? "Teacher Notes" : "Teacher Pack"}
        subtitle={`${lesson.title} - ${lesson.grade} ${lesson.subject} - ${isViewMode ? statusLabel : "Generated draft"}`}
        showBack
        onBack={isViewMode ? goBackToOrigin : undefined}
      />
      <ReviewTabs active="teacher" params={reviewParams} />

      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const selected = activeTab === tab;

          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "Objective" ? (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flag-outline" size={22} color={colors.danger} />
            <Text style={styles.cardTitle}>Learning objective</Text>
          </View>
          <Text style={styles.body}>{pack.objective + revisionSuffix}</Text>
        </Card>
      ) : null}

      {activeTab === "Script" ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Teaching script</Text>
            <Text style={styles.body}>{pack.teachingScript + revisionSuffix}</Text>
          </Card>
          {pack.keyConcepts.length ? (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="list-outline" size={22} color={colors.primary} />
                <Text style={styles.cardTitle}>Board plan</Text>
              </View>
              {pack.keyConcepts.map((item) => (
                <Text key={item} style={styles.point}>
                  - {item}
                </Text>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      {activeTab === "Activity" ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Classroom activity</Text>
          <Text style={styles.body}>{pack.classroomActivity + revisionSuffix}</Text>
          <Badge label="Low resource" tone="success" />
        </Card>
      ) : null}

      {activeTab === "Worksheet" ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Worksheet questions</Text>
          {pack.worksheet.map((question, index) => (
            <Text key={question} style={styles.point}>
              {index + 1}. {question}
            </Text>
          ))}
        </Card>
      ) : null}

      {activeTab === "Answers" ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Answer key</Text>
          {pack.answerKey.map((answer, index) => (
            <Text key={answer} style={styles.point}>
              {index + 1}. {answer}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card style={styles.supportCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Learner support</Text>
          {isViewMode ? <Badge label={statusLabel} tone={lessonStateTone(lesson)} /> : revision > 1 ? <Badge label={`Revision ${revision}`} tone="primary" /> : null}
        </View>
        <View style={styles.supportList}>
          {learnerSupport.map((item) => (
            <View key={item.label} style={styles.supportItem}>
              <Text style={styles.supportLabel}>{item.label}</Text>
              <Text style={styles.supportText}>{item.text}</Text>
            </View>
          ))}
        </View>
        {revision > 1 ? <Text style={styles.supportNote}>{revisionSuffix.trim()}</Text> : null}
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
                returnTo: "teacher"
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
        ) : isViewMode ? (
          <AppButton
            title="Assignment"
            variant="outline"
            leftIcon={<Ionicons name="clipboard-outline" size={20} color={colors.text} />}
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
            title="Regenerate"
            variant="outline"
            loading={regenerating}
            leftIcon={<Ionicons name="refresh-outline" size={20} color={colors.text} />}
            onPress={regeneratePack}
            style={styles.actionButton}
          />
        )}
        <AppButton
          title="Student Pack"
          variant="success"
          leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
          onPress={() => router.push({ pathname: "/student-pack", params: reviewParams })}
          style={styles.actionButton}
        />
      </View>
    </ScreenContainer>
  );
}

function learnerSupportItems(raw: string) {
  const labels = ["Support", "Core", "Challenge"] as const;
  const cleaned = cleanSupportText(raw);
  const matches = [...cleaned.matchAll(/\b(Support|Core|Challenge)\s*(?:\([^)]*\))?\s*:/gi)];
  const byLabel = new Map<string, string>();

  matches.forEach((match, index) => {
    const next = matches[index + 1];
    const label = titleCaseLabel(match[1]);
    const start = match.index ?? 0;
    const end = next?.index ?? cleaned.length;
    byLabel.set(label, stripSupportLabel(cleaned.slice(start, end), label));
  });

  const fallbackLines = cleaned
    .split(/\n+/)
    .map((line) => stripSupportLabel(line.trim()))
    .filter(Boolean);

  return labels.map((label, index) => ({
    label,
    text: byLabel.get(label) || fallbackLines[index] || fallbackSupportText(label)
  }));
}

function titleCaseLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "support") return "Support";
  if (normalized === "core") return "Core";
  return "Challenge";
}

function cleanSupportText(raw: string) {
  return raw
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\$/g, "")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/_\{?([^}\s]+)\}?/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\s+o\s+/g, " to ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function stripSupportLabel(raw: string, label?: string) {
  const labels = label ? label : "Support|Core|Challenge";
  return cleanSupportText(raw)
    .replace(new RegExp(`^(?:${labels})\\s*(?:\\([^)]*\\))?\\s*:\\s*`, "i"), "")
    .trim();
}

function fallbackSupportText(label: "Support" | "Core" | "Challenge") {
  if (label === "Support") return "Use simpler language, read key terms aloud, and let students answer with a labelled example.";
  if (label === "Core") return "Ask students to explain the main idea using lesson vocabulary and one accurate example.";
  return "Ask students to connect the idea to a new example and explain why it applies.";
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tab: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  tabSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  tabText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  tabTextSelected: {
    color: colors.primaryDark
  },
  card: {
    gap: spacing.md
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600"
  },
  point: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  supportCard: {
    gap: spacing.md,
    backgroundColor: colors.surface
  },
  supportList: {
    gap: spacing.sm
  },
  supportItem: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    padding: spacing.md
  },
  supportLabel: {
    color: colors.primaryDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  supportText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600"
  },
  supportNote: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: spacing.sm
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
