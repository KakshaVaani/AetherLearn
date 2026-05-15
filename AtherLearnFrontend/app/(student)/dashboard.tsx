import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchStudentDashboard } from "@/api/backend";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AssignmentCard } from "@/components/AssignmentCard";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { LessonCard } from "@/components/LessonCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { SubjectCard } from "@/components/SubjectCard";
import { assignments } from "@/data/assignments";
import { classrooms } from "@/data/classrooms";
import { featuredLecture } from "@/data/lectures";
import { subjects } from "@/data/subjects";
import { currentStudent } from "@/data/users";
import { Assignment, Classroom } from "@/types";
import { colors, spacing } from "@/constants/theme";

export default function StudentDashboardScreen() {
  const [syncedClasses, setSyncedClasses] = useState<Classroom[]>(classrooms);
  const [syncedAssignments, setSyncedAssignments] = useState<Assignment[]>(assignments);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchStudentDashboard()
      .then((data) => {
        if (!mounted) return;
        if (data.classes.length > 0) setSyncedClasses(data.classes);
        if (data.assignments.length > 0) setSyncedAssignments(data.assignments);
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
      <Header title="Hi Aarav" subtitle="Your personalized learning space is synced." />

      <Card style={styles.profileCard}>
        <View style={styles.profileIcon}>
          <Ionicons name="text-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileTitle}>Learning profile</Text>
          <AccessibilityBadge mode={currentStudent.accessibilityMode ?? "Standard"} />
        </View>
      </Card>

      <SectionHeader title="Enrolled classrooms" />
      <Card style={styles.enrolledCard}>
        <Text style={styles.classroomTitle}>{syncedClasses[0]?.title ?? classrooms[0].title}</Text>
        <Text style={styles.classroomMeta}>{(syncedClasses[0]?.subjects ?? classrooms[0].subjects).join(", ")}</Text>
        <Badge label={connected ? "Backend synced" : "Local mode ready"} tone="success" />
      </Card>

      <SectionHeader title="Subjects" />
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          onPress={() => router.push({ pathname: "/(student)/subject/[id]", params: { id: subject.id } })}
        />
      ))}

      <SectionHeader title="Continue learning" />
      <LessonCard
        lesson={featuredLecture}
        onPress={() =>
          router.push({ pathname: "/(student)/lesson/[id]", params: { id: featuredLecture.id } })
        }
      />

      <SectionHeader title="Pending assignments" />
      <AssignmentCard
        assignment={syncedAssignments[0] ?? assignments[0]}
        onPress={() =>
          router.push({ pathname: "/(student)/assignment/[id]", params: { id: (syncedAssignments[0] ?? assignments[0]).id } })
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  profileIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  profileText: {
    flex: 1,
    gap: spacing.sm
  },
  profileTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  enrolledCard: {
    gap: spacing.sm
  },
  classroomTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  classroomMeta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  }
});
