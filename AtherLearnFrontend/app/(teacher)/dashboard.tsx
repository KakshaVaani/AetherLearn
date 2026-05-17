import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchTeacherDashboard } from "@/api/backend";
import { getSession } from "@/api/session";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ClassroomCard } from "@/components/ClassroomCard";
import { Header } from "@/components/Header";
import { ManualSyncPanel } from "@/components/ManualSyncPanel";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { classrooms } from "@/data/classrooms";
import { featuredLecture } from "@/data/lectures";
import { Classroom, LessonPack, Assignment } from "@/types";
import { colors, spacing } from "@/constants/theme";

export default function TeacherDashboardScreen() {
  const [dashboardClasses, setDashboardClasses] = useState<Classroom[]>(classrooms);
  const [dashboardLessons, setDashboardLessons] = useState<LessonPack[]>([]);
  const [dashboardAssignments, setDashboardAssignments] = useState<Assignment[]>([]);
  const [connected, setConnected] = useState(false);
  const session = getSession();
  const firstName = session?.name?.trim().split(/\s+/)[0] || "Teacher";

  useEffect(() => {
    let mounted = true;
    fetchTeacherDashboard()
      .then((data) => {
        if (!mounted) return;
        if (data.classes.length > 0) setDashboardClasses(data.classes);
        setDashboardLessons(data.lessons);
        setDashboardAssignments(data.assignments);
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
      <Header title={`Good morning, ${firstName}`} subtitle="Your classroom access layer is ready." />

      <View style={styles.statGrid}>
        <StatCard value={String(dashboardClasses.length)} label="Classrooms" accent={colors.primary} />
        <StatCard
          value={String(new Set(dashboardClasses.flatMap((item) => item.subjects)).size)}
          label="Subjects"
          accent={colors.secondary}
        />
        <StatCard value={String(dashboardLessons.length || 12)} label="Lectures Uploaded" accent={colors.success} />
        <StatCard value={String(dashboardAssignments.length || 24)} label="Assignments" accent={colors.warning} />
      </View>

      <View style={styles.actions}>
        <AppButton
          title="Upload Lecture"
          leftIcon={<Ionicons name="cloud-upload-outline" size={20} color={colors.white} />}
          onPress={() => router.push("/(teacher)/upload")}
        />
        <AppButton
          title="Create Assignment"
          variant="outline"
          leftIcon={<Ionicons name="create-outline" size={20} color={colors.text} />}
          onPress={() => router.push("/(teacher)/create-assignment")}
        />
      </View>

      <ManualSyncPanel role="teacher" />

      <SectionHeader title="Recent classrooms" subtitle="Jump back into active classroom spaces." />
      {dashboardClasses.slice(0, 2).map((classroom) => (
        <ClassroomCard
          key={classroom.id}
          classroom={classroom}
          onPress={() =>
            router.push({ pathname: "/(teacher)/classrooms/[id]", params: { id: classroom.id } })
          }
        />
      ))}

      <SectionHeader title="Recent AI activity" />
      <Card style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <View style={styles.activityIcon}>
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.activityText}>
            <Text style={styles.activityTitle}>{featuredLecture.title}</Text>
            <Text style={styles.activitySubtitle}>{featuredLecture.status}</Text>
          </View>
        </View>
        <View style={styles.badges}>
          <Badge label={connected ? "Backend synced" : "Local demo"} tone={connected ? "success" : "warning"} />
          <Badge label="5 learner versions" tone="secondary" />
          <Badge label="Teacher review needed" tone="warning" />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  actions: {
    gap: spacing.md
  },
  activityCard: {
    gap: spacing.md
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  activityText: {
    flex: 1,
    gap: 2
  },
  activityTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  activitySubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
