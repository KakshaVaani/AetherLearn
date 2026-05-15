import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { assignments } from "@/data/assignments";
import { colors, spacing } from "@/constants/theme";

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assignment = assignments.find((item) => item.id === id) ?? assignments[0];

  return (
    <ScreenContainer>
      <Header title={assignment.title} subtitle={assignment.classroom} showBack />

      <Card style={styles.summaryCard}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{assignment.title}</Text>
          <Badge label={assignment.status} tone={assignment.status === "Published" ? "success" : "warning"} />
        </View>
        <Text style={styles.meta}>Linked lecture: {assignment.linkedLecture}</Text>
        <Text style={styles.meta}>Due date: {assignment.dueDate}</Text>
      </Card>

      <SectionHeader title="Different versions" />
      <Card style={styles.versionCard}>
        <View style={styles.badges}>
          {assignment.versions.map((version) => (
            <AccessibilityBadge key={version} mode={version} />
          ))}
        </View>
      </Card>

      <SectionHeader title="Sample questions" />
      <Card style={styles.questionsCard}>
        {assignment.questions.map((question, index) => (
          <View key={question.id} style={styles.questionBlock}>
            <Text style={styles.question}>
              {index + 1}. {question.prompt}
            </Text>
            {question.hint ? <Text style={styles.hint}>Hint: {question.hint}</Text> : null}
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        <AppButton title="Publish Assignment" />
        <AppButton
          title="View Submissions"
          variant="outline"
          onPress={() => router.push("/(teacher)/submissions")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600"
  },
  versionCard: {
    gap: spacing.md
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  questionsCard: {
    gap: spacing.lg
  },
  questionBlock: {
    gap: spacing.xs
  },
  question: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700"
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  actions: {
    gap: spacing.md
  }
});
