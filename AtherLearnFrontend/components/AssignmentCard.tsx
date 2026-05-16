import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Assignment } from "@/types";
import { colors, spacing } from "@/constants/theme";
import { assignmentAnswerModeLabel } from "@/utils/assignmentModes";

type AssignmentCardProps = {
  assignment: Assignment;
  onPress?: () => void;
  cardStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  metaStyle?: StyleProp<TextStyle>;
};

export function AssignmentCard({ assignment, onPress, cardStyle, titleStyle, metaStyle }: AssignmentCardProps) {
  return (
    <Card onPress={onPress} style={[styles.card, cardStyle]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.subject}>{assignment.subject}</Text>
          <Text style={[styles.title, titleStyle]}>{assignment.title}</Text>
        </View>
        <View style={styles.badges}>
          <Badge label={assignmentAnswerModeLabel(assignment.answerMode)} tone="secondary" />
          <Badge label={assignment.status} tone={assignment.status === "Published" ? "success" : "warning"} />
        </View>
      </View>
      <Text style={[styles.meta, metaStyle]}>{assignment.linkedLecture}</Text>
      <Text style={[styles.due, metaStyle]}>Due {assignment.dueDate}</Text>
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
  badges: {
    alignItems: "flex-end",
    gap: spacing.xs
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
