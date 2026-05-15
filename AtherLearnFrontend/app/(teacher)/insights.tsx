import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ProgressBar } from "@/components/ProgressBar";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { colors, spacing } from "@/constants/theme";

const weakConcepts = [
  { label: "Role of sunlight", value: 64, color: colors.warning },
  { label: "Carbon dioxide intake", value: 52, color: colors.secondary },
  { label: "Glucose as plant food", value: 48, color: colors.primary }
];

const supportStudents = ["Meera", "Neha", "Rafiq"];

export default function TeacherInsightsScreen() {
  return (
    <ScreenContainer>
      <Header title="Insights" subtitle="Simple analytics for an inclusive classroom." />

      <View style={styles.statGrid}>
        <StatCard value="78%" label="Average score" accent={colors.primary} />
        <StatCard value="3" label="Need support" accent={colors.warning} />
      </View>

      <SectionHeader title="Common weak concepts" subtitle="Mock chart-like progress bars." />
      <Card style={styles.card}>
        {weakConcepts.map((concept) => (
          <View key={concept.label} style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{concept.label}</Text>
              <Text style={styles.progressValue}>{concept.value}%</Text>
            </View>
            <ProgressBar value={concept.value} color={concept.color} />
          </View>
        ))}
      </Card>

      <SectionHeader title="Students needing help" />
      <Card style={styles.card}>
        <View style={styles.badges}>
          {supportStudents.map((student) => (
            <Badge key={student} label={student} tone="warning" />
          ))}
        </View>
      </Card>

      <SectionHeader title="Accessibility impact" />
      <Card style={styles.impactCard}>
        <Text style={styles.impactTitle}>Personalized versions improved completion by 18%.</Text>
        <Text style={styles.impactBody}>
          Dyslexia-friendly and audio-first learners showed the strongest assignment completion lift in
          this mock dataset.
        </Text>
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Accessible version usage</Text>
            <Text style={styles.progressValue}>86%</Text>
          </View>
          <ProgressBar value={86} color={colors.success} />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  card: {
    gap: spacing.lg
  },
  progressBlock: {
    gap: spacing.sm
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  progressLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800"
  },
  progressValue: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  impactCard: {
    gap: spacing.md
  },
  impactTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  impactBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23
  }
});
