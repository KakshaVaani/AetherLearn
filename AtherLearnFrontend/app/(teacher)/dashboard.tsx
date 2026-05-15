import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ClassroomCard } from "@/components/ClassroomCard";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { classrooms } from "@/data/classrooms";
import { featuredLecture } from "@/data/lectures";
import { colors, spacing } from "@/constants/theme";

export default function TeacherDashboardScreen() {
  return (
    <ScreenContainer>
      <Header title="Good morning, Ms. Sharma" subtitle="Your classroom access layer is ready." />

      <View style={styles.statGrid}>
        <StatCard value="3" label="Classrooms" accent={colors.primary} />
        <StatCard value="5" label="Subjects" accent={colors.secondary} />
        <StatCard value="12" label="Lectures Uploaded" accent={colors.success} />
        <StatCard value="24" label="Pending Submissions" accent={colors.warning} />
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

      <SectionHeader title="Recent classrooms" subtitle="Jump back into active classroom spaces." />
      {classrooms.slice(0, 2).map((classroom) => (
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
