import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/constants/theme";

type BadgeTone = "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";

type BadgeProps = {
  label: ReactNode;
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, { background: string; color: string }> = {
  primary: { background: colors.primarySoft, color: colors.primaryDark },
  secondary: { background: colors.secondarySoft, color: colors.secondary },
  success: { background: colors.successSoft, color: colors.success },
  warning: { background: colors.warningSoft, color: "#92400E" },
  danger: { background: colors.dangerSoft, color: colors.danger },
  neutral: { background: colors.surface, color: colors.muted }
};

export function Badge({ label, tone = "neutral" }: BadgeProps) {
  const visual = toneStyles[tone];

  return (
    <View style={[styles.badge, { backgroundColor: visual.background }]}>
      <Text style={[styles.text, { color: visual.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  }
});
