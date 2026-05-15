import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Subject } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

type SubjectCardProps = {
  subject: Subject;
  onPress?: () => void;
};

export function SubjectCard({ subject, onPress }: SubjectCardProps) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: subject.color }]} />
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={styles.name}>{subject.name}</Text>
          <Text style={styles.meta}>
            {subject.lessons} lessons · {subject.pendingAssignments} pending
          </Text>
        </View>
        {subject.badge ? <Badge label={subject.badge} tone="primary" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    overflow: "hidden"
  },
  colorBar: {
    height: 5,
    borderRadius: radii.pill,
    width: 72
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  main: {
    flex: 1,
    gap: spacing.xs
  },
  name: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  }
});
