import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LessonPack } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

type LessonSourcePreviewProps = {
  compact?: boolean;
  lesson?: LessonPack | null;
  topic?: string;
  subject?: string;
  sourceType?: string;
  detectedText?: string[];
  diagramElements?: string[];
  equations?: string[];
};

function sourceIcon(subject: string): keyof typeof Ionicons.glyphMap {
  const normalized = subject.toLowerCase();
  if (normalized.includes("math")) return "calculator-outline";
  if (normalized.includes("science")) return "flask-outline";
  if (normalized.includes("english")) return "book-outline";
  if (normalized.includes("social")) return "earth-outline";
  return "document-text-outline";
}

function compactList(items: string[], fallback: string) {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  return cleaned.length ? cleaned.slice(0, 4) : [fallback];
}

export function LessonSourcePreview({
  compact = false,
  lesson,
  topic,
  subject,
  sourceType,
  detectedText,
  diagramElements,
  equations
}: LessonSourcePreviewProps) {
  const previewTopic = topic ?? lesson?.sourceCard.topic ?? lesson?.topicTitle ?? lesson?.title ?? "Classroom source";
  const previewSubject = subject ?? lesson?.subject ?? "Lesson";
  const previewSourceType = sourceType ?? lesson?.sourceCard.sourceType ?? "Teacher notes";
  const previewDetectedText = detectedText ?? lesson?.sourceCard.detectedText ?? [];
  const previewDiagramElements = diagramElements ?? lesson?.sourceCard.diagramElements ?? [];
  const previewEquations = equations ?? lesson?.sourceCard.equations ?? [];
  const previewNotes = compactList(
    [...previewEquations, ...previewDetectedText, ...previewDiagramElements],
    "Ready for teacher review"
  );
  const mainDetail = previewEquations[0] ?? previewDetectedText[0] ?? previewDiagramElements[0] ?? previewTopic;

  return (
    <View style={[styles.board, compact && styles.boardCompact]}>
      <View style={styles.boardHeader}>
        <Text style={styles.boardTitle}>{previewTopic}</Text>
        <View style={styles.boardBadge}>
          <Text style={styles.boardBadgeText}>{previewSourceType}</Text>
        </View>
      </View>
      <View style={styles.diagramRow}>
        <View style={styles.previewBlock}>
          <Ionicons name={sourceIcon(previewSubject)} size={compact ? 26 : 34} color={colors.primary} />
          <Text style={styles.diagramLabel}>{previewSubject}</Text>
        </View>
        <View style={styles.previewBlock}>
          <Ionicons name="scan-outline" size={compact ? 34 : 48} color={colors.success} />
          <Text style={styles.diagramLabel}>Source</Text>
        </View>
        <View style={styles.equationBlock}>
          <Text numberOfLines={compact ? 2 : 3} style={styles.equation}>
            {mainDetail}
          </Text>
        </View>
      </View>
      <View style={styles.noteRow}>
        {previewNotes.map((note, index) => (
          <Text key={`${note}-${index}`} numberOfLines={1} style={styles.note}>
            {note}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    minHeight: 210,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: spacing.lg,
    gap: spacing.lg
  },
  boardCompact: {
    minHeight: 120,
    padding: spacing.md,
    gap: spacing.md
  },
  boardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  boardTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  boardBadge: {
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  boardBadgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800"
  },
  diagramRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  previewBlock: {
    alignItems: "center",
    minWidth: 64,
    gap: spacing.xs
  },
  equationBlock: {
    flex: 1,
    alignItems: "center",
    gap: 2
  },
  diagramLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  },
  equation: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    textAlign: "center"
  },
  noteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  note: {
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  }
});
