import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@/constants/theme";

type LessonSourcePreviewProps = {
  compact?: boolean;
};

export function LessonSourcePreview({ compact = false }: LessonSourcePreviewProps) {
  return (
    <View style={[styles.board, compact && styles.boardCompact]}>
      <View style={styles.boardHeader}>
        <Text style={styles.boardTitle}>Photosynthesis</Text>
        <View style={styles.boardBadge}>
          <Text style={styles.boardBadgeText}>Demo source</Text>
        </View>
      </View>
      <View style={styles.diagramRow}>
        <View style={styles.sunBlock}>
          <Ionicons name="sunny-outline" size={compact ? 24 : 30} color={colors.warning} />
          <Text style={styles.diagramLabel}>Sunlight</Text>
        </View>
        <View style={styles.plantBlock}>
          <Ionicons name="leaf-outline" size={compact ? 46 : 62} color={colors.success} />
          <Text style={styles.diagramLabel}>Plant</Text>
        </View>
        <View style={styles.equationBlock}>
          <Text style={styles.equation}>6CO2 + 6H2O</Text>
          <Text style={styles.equation}>-&gt;</Text>
          <Text style={styles.equation}>C6H12O6 + 6O2</Text>
        </View>
      </View>
      <View style={styles.noteRow}>
        <Text style={styles.note}>CO2 enters leaves</Text>
        <Text style={styles.note}>H2O enters roots</Text>
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
  sunBlock: {
    alignItems: "center",
    gap: spacing.xs
  },
  plantBlock: {
    alignItems: "center",
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
