import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Lecture } from "@/types";
import { colors, spacing } from "@/constants/theme";

type LessonCardProps = {
  lesson: Lecture;
  onPress?: () => void;
  cardStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  metaStyle?: StyleProp<TextStyle>;
};

export function LessonCard({ lesson, onPress, cardStyle, titleStyle, metaStyle }: LessonCardProps) {
  return (
    <Card onPress={onPress} style={[styles.card, cardStyle]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.subject}>{lesson.subject}</Text>
          <Text style={[styles.title, titleStyle]}>{lesson.title}</Text>
        </View>
        <Badge label={lesson.badge} tone={lesson.badge === "Saved offline" ? "success" : "primary"} />
      </View>
      <Text style={[styles.source, metaStyle]}>{lesson.source}</Text>
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
    gap: spacing.md
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs
  },
  subject: {
    color: colors.primary,
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
  source: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  }
});
