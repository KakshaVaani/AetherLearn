import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ProgressBar } from "@/components/ProgressBar";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { accessibilityModes } from "@/data/accessibilityProfiles";
import { classrooms } from "@/data/classrooms";
import { colors, spacing } from "@/constants/theme";

export default function ClassroomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classroom = classrooms.find((item) => item.id === id) ?? classrooms[0];

  return (
    <ScreenContainer>
      <Header title={classroom.title} subtitle={`Class code ${classroom.classCode}`} showBack />

      <Card style={styles.summaryCard}>
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
        title="Classwork actions"
        subtitle="Create and review learning material for this classroom."
      />
      <Card style={styles.actionPanel}>
        <View style={styles.primaryActions}>
          <AppButton
            title="Upload Lecture"
            leftIcon={<Ionicons name="cloud-upload-outline" size={20} color={colors.white} />}
            onPress={() => router.push("/(teacher)/upload")}
          />
          <AppButton
            title="Create Assignment"
            variant="secondary"
            leftIcon={<Ionicons name="create-outline" size={20} color={colors.white} />}
            onPress={() => router.push("/(teacher)/create-assignment")}
          />
        </View>
        <View style={styles.secondaryActions}>
          <AppButton
            title="Add Subject"
            variant="outline"
            leftIcon={<Ionicons name="add-circle-outline" size={20} color={colors.text} />}
          />
          <AppButton
            title="View Assignments"
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
        {classroom.subjects.map((subject) => (
          <Card key={subject} style={styles.subjectCard}>
            <Text style={styles.subjectName}>{subject}</Text>
            <Badge label="Ready for uploads" tone="primary" />
          </Card>
        ))}
      </View>

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
