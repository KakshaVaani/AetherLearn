import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ReviewTabs } from "@/components/ReviewTabs";
import { ScreenContainer } from "@/components/ScreenContainer";
import { featuredLessonPack } from "@/data/lessonPacks";
import { colors, radii, spacing } from "@/constants/theme";

function TrustRow({
  icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning" | "neutral";
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Badge label={value} tone={tone} />
    </View>
  );
}

export default function TrustPackScreen() {
  const trust = featuredLessonPack.trustPack;
  const warningCount = trust.accessibilityWarnings.length;

  return (
    <ScreenContainer>
      <Header title="Trust Pack" subtitle="Transparent runtime and review status." showBack />
      <ReviewTabs active="trust" />

      <Card style={styles.card}>
        <TrustRow icon="cloud-outline" label="Runtime Mode" value={trust.runtimeMode} tone="primary" />
        <TrustRow icon="hardware-chip-outline" label="Model" value={trust.model} tone="neutral" />
        <TrustRow icon="time-outline" label="Average Latency" value={trust.latency} tone="neutral" />
        <TrustRow icon="code-slash-outline" label="Schema Status" value={trust.schemaStatus} tone="success" />
        <TrustRow
          icon="person-outline"
          label="Teacher Review"
          value={trust.teacherReviewStatus}
          tone={trust.teacherReviewStatus === "Approved" ? "success" : "warning"}
        />
        <TrustRow icon="analytics-outline" label="Confidence" value={`${trust.confidence}%`} tone="success" />
      </Card>

      <Card style={styles.warningCard}>
        <View style={styles.warningHeader}>
          <Ionicons name="warning-outline" size={22} color={colors.warning} />
          <Text style={styles.warningTitle}>Accessibility warnings</Text>
          <Badge label={`${warningCount} issue`} tone={warningCount > 0 ? "warning" : "success"} />
        </View>
        {trust.accessibilityWarnings.map((warning) => (
          <Text key={warning} style={styles.warningText}>
            - {warning}
          </Text>
        ))}
      </Card>

      <Card style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.infoText}>
          Content is generated as a teacher-reviewed draft. The first build keeps exports local and clearly labels mock,
          hosted, or local runtime mode.
        </Text>
      </Card>

      <View style={styles.actions}>
        <AppButton
          title="Export"
          variant="outline"
          leftIcon={<Ionicons name="download-outline" size={20} color={colors.text} />}
          style={styles.actionButton}
        />
        <AppButton
          title="Save to Library"
          variant="success"
          leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
          onPress={() => router.push("/lessons")}
          style={styles.actionButton}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  warningCard: {
    gap: spacing.md,
    backgroundColor: colors.warningSoft
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  warningTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  warningText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.primarySoft
  },
  infoText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  },
  actionButton: {
    flex: 1
  }
});
