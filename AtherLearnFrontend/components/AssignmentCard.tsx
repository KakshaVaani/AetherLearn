import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Assignment } from "@/types";
import { colors, spacing } from "@/constants/theme";

type AssignmentCardProps = {
  assignment: Assignment;
  onPress?: () => void;
};

export function AssignmentCard({ assignment, onPress }: AssignmentCardProps) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.subject}>{assignment.subject}</Text>
          <Text style={styles.title}>{assignment.title}</Text>
        </View>
        <Badge label={assignment.status} tone={assignment.status === "Published" ? "success" : "warning"} />
      </View>
      <Text style={styles.meta}>{assignment.linkedLecture}</Text>
      <Text style={styles.due}>Due {assignment.dueDate}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  titleBlock: {
    flex: 1,
    gap: 2
  },
  subject: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  title: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  due: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  }
});
