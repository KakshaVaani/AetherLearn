import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Subject } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

type SubjectCardProps = {
  subject: Subject;
  onPress?: () => void;
  cardStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  metaStyle?: StyleProp<TextStyle>;
};

export function SubjectCard({ subject, onPress, cardStyle, titleStyle, metaStyle }: SubjectCardProps) {
  return (
    <Card onPress={onPress} style={[styles.card, cardStyle]}>
      <View style={[styles.colorBar, { backgroundColor: subject.color }]} />
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={[styles.name, titleStyle]}>{subject.name}</Text>
          <Text style={[styles.meta, metaStyle]}>
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
