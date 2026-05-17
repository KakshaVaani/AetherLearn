import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiClientError } from "@/api/client";
import {
  deleteTeacherAssignment,
  deleteTeacherLesson,
  fetchTeacherDashboard,
  type TeacherDashboardData
} from "@/api/backend";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AppButton } from "@/components/AppButton";
import { AssignmentCard } from "@/components/AssignmentCard";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { LessonThumbnail } from "@/components/LessonThumbnail";
import { ProgressBar } from "@/components/ProgressBar";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { accessibilityModes } from "@/data/accessibilityProfiles";
import { Assignment, Classroom, LessonPack, LessonStatus } from "@/types";
import { colors, spacing } from "@/constants/theme";

function statusTone(status: LessonStatus) {
  if (status === "Approved" || status === "Exported") return "success" as const;
  if (status === "Needs Review") return "warning" as const;
  return "neutral" as const;
}

function sourceLabel(source: TeacherDashboardData["source"]) {
  if (source === "backend") return "Backend synced";
  if (source === "local") return "Offline cache";
  return "Local demo";
}

function assignmentMatchesClass(assignment: Assignment, classroom: Classroom) {
  const assignedClass = assignment.classroom.trim().toLowerCase();
  const title = classroom.title.trim().toLowerCase();
  const code = classroom.classCode.trim().toLowerCase();
  return assignedClass === classroom.id.toLowerCase() || assignedClass === title || assignedClass === code;
}

async function confirmDelete(kind: "notes" | "assignment", title: string) {
  const label = kind === "notes" ? "notes" : "assignment";
  const maybeWindow = globalThis as typeof globalThis & { confirm?: (message: string) => boolean };
  if (typeof maybeWindow.confirm === "function") {
    return maybeWindow.confirm(`Delete ${label} "${title}"? This action cannot be undone.`);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      `Delete ${label}?`,
      `Delete "${title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Delete", style: "destructive", onPress: () => resolve(true) }
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

function deleteErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError ? error.message : fallback;
}

function returnToClasses() {
  router.replace("/(teacher)/classrooms");
}

export default function ClassroomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>([]);
  const [availableLessons, setAvailableLessons] = useState<LessonPack[]>([]);
  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);
  const [dataSource, setDataSource] = useState<TeacherDashboardData["source"]>("demo");
  const [loading, setLoading] = useState(true);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "warning">("success");
  const classroom = availableClassrooms.find((item) => item.id === id) ?? null;
  const classLessons = classroom
    ? availableLessons.filter((lesson) => {
        if (lesson.classroomId) return lesson.classroomId === classroom.id;
        const gradeMatches = !classroom.grade || lesson.grade === classroom.grade;
        return gradeMatches && classroom.subjects.includes(lesson.subject);
      })
    : [];
  const classAssignments = classroom
    ? availableAssignments.filter((assignment) => assignmentMatchesClass(assignment, classroom))
    : [];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTeacherDashboard()
      .then((data) => {
        if (!mounted) return;
        setAvailableClassrooms(data.classes);
        setAvailableLessons(data.lessons);
        setAvailableAssignments(data.assignments);
        setDataSource(data.source);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setDataSource("demo");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleDeleteLesson(lesson: LessonPack) {
    if (deletingLessonId || deletingAssignmentId) return;
    const confirmed = await confirmDelete("notes", lesson.title);
    if (!confirmed) return;

    setDeletingLessonId(lesson.id);
    setMessage("");
    try {
      await deleteTeacherLesson(lesson.id, dataSource);
      setAvailableLessons((current) => current.filter((item) => item.id !== lesson.id));
      setMessageTone("success");
      setMessage(`Deleted notes "${lesson.title}".`);
    } catch (error) {
      setMessageTone("warning");
      setMessage(deleteErrorMessage(error, "Could not delete these notes. Please try again."));
    } finally {
      setDeletingLessonId(null);
    }
  }

  async function handleDeleteAssignment(assignment: Assignment) {
    if (deletingLessonId || deletingAssignmentId) return;
    const confirmed = await confirmDelete("assignment", assignment.title);
    if (!confirmed) return;

    setDeletingAssignmentId(assignment.id);
    setMessage("");
    try {
      await deleteTeacherAssignment(assignment.id, dataSource);
      setAvailableAssignments((current) => current.filter((item) => item.id !== assignment.id));
      setMessageTone("success");
      setMessage(`Deleted assignment "${assignment.title}".`);
    } catch (error) {
      setMessageTone("warning");
      setMessage(deleteErrorMessage(error, "Could not delete this assignment. Please try again."));
    } finally {
      setDeletingAssignmentId(null);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <Header
          title="Loading class"
          subtitle="Fetching backend notes and assignments..."
          showBack
          onBack={returnToClasses}
        />
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.emptyText}>Loading the selected class workspace.</Text>
        </Card>
      </ScreenContainer>
    );
  }

  if (!classroom) {
    return (
      <ScreenContainer>
        <Header
          title="Class not found"
          subtitle="This classroom is not available in the current workspace."
          showBack
          onBack={returnToClasses}
        />
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No matching classroom</Text>
          <Text style={styles.emptyText}>Return to Classes and open one of the synced demo classrooms.</Text>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header
        title={classroom.title}
        subtitle={`Class code ${classroom.classCode}`}
        showBack
        onBack={returnToClasses}
      />

      <Card style={styles.summaryCard}>
        <View style={styles.badges}>
          <Badge label={classroom.grade ?? "Grade not set"} tone="primary" />
          <Badge label={sourceLabel(dataSource)} tone={dataSource === "backend" ? "success" : "warning"} />
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{classroom.students}</Text>
            <Text style={styles.metricLabel}>Students</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{classroom.subjects.length}</Text>
            <Text style={styles.metricLabel}>Subjects</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{classroom.accessibilityProfiles}</Text>
            <Text style={styles.metricLabel}>Access profiles</Text>
          </View>
        </View>
      </Card>

      <SectionHeader
        title="Class workspace"
        subtitle="Create notes and assignments scoped to this grade class."
      />
      <Card style={styles.actionPanel}>
        <View style={styles.primaryActions}>
          <AppButton
            title="Create Notes"
            leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.white} />}
            onPress={() =>
              router.push({ pathname: "/(teacher)/upload", params: { classroomId: classroom.id } })
            }
          />
          <AppButton
            title="Create Assignment"
            variant="secondary"
            leftIcon={<Ionicons name="create-outline" size={20} color={colors.white} />}
            onPress={() =>
              router.push({ pathname: "/(teacher)/create-assignment", params: { classroomId: classroom.id } })
            }
          />
        </View>
        <View style={styles.secondaryActions}>
          <AppButton
            title="Capture Lesson"
            variant="outline"
            leftIcon={<Ionicons name="camera-outline" size={20} color={colors.text} />}
            onPress={() =>
              router.push({ pathname: "/(teacher)/upload", params: { classroomId: classroom.id } })
            }
          />
          <AppButton
            title="View All Assignments"
            variant="outline"
            leftIcon={<Ionicons name="clipboard-outline" size={20} color={colors.text} />}
            onPress={() => router.push("/(teacher)/assignment")}
          />
          <AppButton
            title="View Submissions"
            variant="outline"
            leftIcon={<Ionicons name="file-tray-full-outline" size={20} color={colors.text} />}
            onPress={() => router.push("/(teacher)/submissions")}
          />
        </View>
      </Card>

      {message ? (
        <Text style={[styles.message, messageTone === "success" ? styles.successText : styles.warningText]}>
          {message}
        </Text>
      ) : null}

      <SectionHeader title="Subjects" />
      <View style={styles.subjectGrid}>
        {(classroom.classSubjects?.length ? classroom.classSubjects : classroom.subjects.map((subject) => ({ id: subject, subject }))).map((subject) => (
          <Card key={subject.id} style={styles.subjectCard}>
            <Text style={styles.subjectName}>{subject.subject}</Text>
            <Badge label="Ready for uploads" tone="primary" />
          </Card>
        ))}
      </View>

      <SectionHeader title="Notes and lessons" subtitle="Material created for this class." />
      {classLessons.length > 0 ? (
        classLessons.map((lesson) => (
          <Card
            key={lesson.id}
            onPress={() =>
              router.push({
                pathname: "/source-understanding",
                params: {
                  lessonId: lesson.id,
                  classroomId: lesson.classroomId ?? classroom.id,
                  title: lesson.title,
                  grade: lesson.grade,
                  subject: lesson.subject,
                  mode: "view",
                  origin: "classroom"
                }
              })
            }
            style={styles.lessonCard}
          >
            <LessonThumbnail lesson={lesson} size="medium" />
            <View style={styles.lessonText}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonMeta}>
                {lesson.grade} - {lesson.subject} - {lesson.language}
              </Text>
              <Text numberOfLines={2} style={styles.lessonMeta}>
                {lesson.studentAccessPack.screenReaderSummary || lesson.teacherPack.objective}
              </Text>
              <View style={styles.badges}>
                <Badge label={lesson.status} tone={statusTone(lesson.status)} />
                <Badge label={lesson.runtimeMode} tone="primary" />
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete notes ${lesson.title}`}
              disabled={deletingLessonId === lesson.id || Boolean(deletingAssignmentId)}
              onPress={(event) => {
                event.stopPropagation();
                void handleDeleteLesson(lesson);
              }}
              style={styles.deleteButton}
            >
              <Ionicons
                name={deletingLessonId === lesson.id ? "hourglass-outline" : "trash-outline"}
                size={18}
                color={deletingLessonId === lesson.id ? colors.muted : colors.danger}
              />
            </Pressable>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No notes for this class yet</Text>
          <Text style={styles.emptyText}>Create notes or capture a lesson to start this class workspace.</Text>
        </Card>
      )}

      <SectionHeader title="Assignments" subtitle="Work assigned to this class." />
      {classAssignments.length > 0 ? (
        classAssignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            onPress={() =>
              router.push({ pathname: "/(teacher)/assignment/[id]", params: { id: assignment.id } })
            }
            rightAction={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete assignment ${assignment.title}`}
                disabled={deletingAssignmentId === assignment.id || Boolean(deletingLessonId)}
                onPress={(event) => {
                  event.stopPropagation();
                  void handleDeleteAssignment(assignment);
                }}
                style={styles.deleteButton}
              >
                <Ionicons
                  name={deletingAssignmentId === assignment.id ? "hourglass-outline" : "trash-outline"}
                  size={18}
                  color={deletingAssignmentId === assignment.id ? colors.muted : colors.danger}
                />
              </Pressable>
            }
          />
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No assignments yet</Text>
          <Text style={styles.emptyText}>Create an assignment when the class is ready to receive the lesson.</Text>
        </Card>
      )}

      <SectionHeader title="Accessibility breakdown" subtitle="Mock profile distribution for this class." />
      <Card style={styles.breakdownCard}>
        {accessibilityModes.map((mode) => {
          const count = classroom.accessibilityBreakdown[mode];
          const percent = classroom.students > 0 ? Math.round((count / classroom.students) * 100) : 0;

          return (
            <View key={mode} style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <AccessibilityBadge mode={mode} />
                <Text style={styles.count}>{count}</Text>
              </View>
              <ProgressBar value={percent} color={mode === "Standard" ? colors.primary : colors.secondary} />
            </View>
          );
        })}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.md
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  metric: {
    flex: 1,
    gap: spacing.xs
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  },
  actionPanel: {
    gap: spacing.lg
  },
  primaryActions: {
    gap: spacing.md
  },
  secondaryActions: {
    gap: spacing.md
  },
  subjectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  subjectCard: {
    minWidth: "47%",
    flex: 1,
    gap: spacing.md
  },
  subjectName: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md
  },
  lessonText: {
    flex: 1,
    gap: spacing.xs
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft
  },
  lessonTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  lessonMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  emptyCard: {
    gap: spacing.xs
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  loadingCard: {
    alignItems: "center",
    gap: spacing.md
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  successText: {
    color: colors.success
  },
  warningText: {
    color: colors.danger
  },
  breakdownCard: {
    gap: spacing.lg
  },
  breakdownItem: {
    gap: spacing.sm
  },
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  count: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  }
});
