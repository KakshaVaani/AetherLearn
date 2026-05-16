import { StyleSheet, Text, View } from "react-native";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Classroom } from "@/types";
import { colors, spacing } from "@/constants/theme";

type ClassroomCardProps = {
  classroom: Classroom;
  onPress?: () => void;
};

export function ClassroomCard({ classroom, onPress }: ClassroomCardProps) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{classroom.title}</Text>
          <Text style={styles.code}>Class code {classroom.classCode}</Text>
        </View>
        <Badge label={`${classroom.accessibilityProfiles} profiles`} tone="secondary" />
      </View>
      <View style={styles.metaRow}>
        {classroom.grade ? (
          <>
            <Text style={styles.meta}>{classroom.grade}</Text>
            <Text style={styles.dot}>.</Text>
          </>
        ) : null}
        <Text style={styles.meta}>{classroom.students} students</Text>
        <Text style={styles.dot}>.</Text>
        <Text style={styles.meta}>{classroom.subjects.join(", ")}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  code: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700"
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  dot: {
    color: colors.border,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900"
  }
});
