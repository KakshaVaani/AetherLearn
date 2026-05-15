import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { colors, spacing } from "@/constants/theme";

type StatCardProps = {
  value: string | number;
  label: string;
  accent?: string;
};

export function StatCard({ value, label, accent = colors.primary }: StatCardProps) {
  return (
    <Card style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    gap: spacing.xs
  },
  accent: {
    width: 34,
    height: 4,
    borderRadius: 999,
    marginBottom: spacing.xs
  },
  value: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600"
  }
});
