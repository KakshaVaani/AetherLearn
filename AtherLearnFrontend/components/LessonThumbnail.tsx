import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LessonPack } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

type LessonThumbnailProps = {
  lesson: LessonPack;
  size?: "small" | "medium";
};

export function LessonThumbnail({ lesson, size = "small" }: LessonThumbnailProps) {
  const isMath = lesson.subject === "Mathematics";
  const isWater = lesson.id === "water-cycle";

  return (
    <View style={[styles.thumbnail, size === "medium" && styles.thumbnailMedium]}>
      <View style={styles.iconRow}>
        <View style={styles.iconBubble}>
          <Ionicons
            name={isMath ? "calculator-outline" : isWater ? "rainy-outline" : "leaf-outline"}
            size={size === "medium" ? 24 : 20}
            color={isMath ? colors.primary : isWater ? colors.secondary : colors.success}
          />
        </View>
        <Text numberOfLines={1} style={styles.subject}>
          {lesson.subject}
        </Text>
      </View>
      <Text numberOfLines={2} style={styles.topic}>
        {lesson.sourceCard.topic}
      </Text>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.footerText}>
          {lesson.sourceCard.sourceType}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 104,
    height: 92,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.sm,
    justifyContent: "space-between",
    overflow: "hidden"
  },
  thumbnailMedium: {
    width: 118,
    height: 102
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  subject: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  topic: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs
  },
  footerText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800"
  }
});
