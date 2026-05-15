import { StyleSheet, Text, View } from "react-native";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { submissions } from "@/data/submissions";
import { colors, spacing } from "@/constants/theme";

export default function SubmissionsScreen() {
  return (
    <ScreenContainer>
      <Header title="Submissions" subtitle="Review student work and AI feedback status." showBack />
      <SectionHeader title="Photosynthesis Quick Check" subtitle="Grade 8 - Section A" />

      {submissions.map((submission) => (
        <Card key={submission.id} style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.studentName}>{submission.studentName}</Text>
              <AccessibilityBadge mode={submission.accessibilityProfile} />
            </View>
            <Badge
              label={submission.status}
              tone={submission.status === "Graded" ? "success" : "warning"}
            />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>Score: {submission.score ?? "Pending"}</Text>
            <Text style={styles.meta}>AI feedback: {submission.aiFeedbackStatus}</Text>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  titleBlock: {
    flex: 1,
    gap: spacing.sm
  },
  studentName: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  metaRow: {
    gap: spacing.xs
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600"
  }
});
