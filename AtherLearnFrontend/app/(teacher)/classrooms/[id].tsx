import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchTeacherDashboard } from "@/api/backend";
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
import { assignments } from "@/data/assignments";
import { classrooms } from "@/data/classrooms";
import { lessonPacks } from "@/data/lessonPacks";
import { Assignment, Classroom, LessonPack, LessonStatus } from "@/types";
import { colors, spacing } from "@/constants/theme";

function statusTone(status: LessonStatus) {
  if (status === "Approved" || status === "Exported") return "success" as const;
  if (status === "Needs Review") return "warning" as const;
  return "neutral" as const;
}

export default function ClassroomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>(classrooms);
  const [availableLessons, setAvailableLessons] = useState<LessonPack[]>(lessonPacks);
  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>(assignments);
  const [connected, setConnected] = useState(false);
  const classroom = availableClassrooms.find((item) => item.id === id) ?? availableClassrooms[0];
  const classLessons = availableLessons.filter((lesson) => {
    if (lesson.classroomId) return lesson.classroomId === classroom.id;
    const gradeMatches = !classroom.grade || lesson.grade === classroom.grade;
    return gradeMatches && classroom.subjects.includes(lesson.subject);
  });
  const classAssignments = availableAssignments.filter(
    (assignment) => assignment.classroom === classroom.id || assignment.classroom === classroom.title
  );

  useEffect(() => {
    let mounted = true;
    fetchTeacherDashboard()
      .then((data) => {
        if (!mounted) return;
        if (data.classes.length > 0) setAvailableClassrooms(data.classes);
        if (data.lessons.length > 0) setAvailableLessons(data.lessons);
        if (data.assignments.length > 0) setAvailableAssignments(data.assignments);
        setConnected(true);
      })
      .catch(() => {
        if (mounted) setConnected(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScreenContainer>
      <Header title={classroom.title} subtitle={`Class code ${classroom.classCode}`} showBack />

      <Card style={styles.summaryCard}>
        <View style={styles.badges}>
          <Badge label={classroom.grade ?? "Grade not set"} tone="primary" />
          <Badge label={connected ? "Backend synced" : "Local demo"} tone={connected ? "success" : "warning"} />
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
                  subject: lesson.subject
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
          const percent = Math.round((count / classroom.students) * 100);

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
