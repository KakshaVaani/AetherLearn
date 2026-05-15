import { StyleSheet, Text, View } from "react-native";
import { accessibilityMeta } from "@/data/accessibilityProfiles";
import { AccessibilityMode } from "@/types";
import { radii, spacing } from "@/constants/theme";

type AccessibilityBadgeProps = {
  mode: AccessibilityMode;
};

export function AccessibilityBadge({ mode }: AccessibilityBadgeProps) {
  const meta = accessibilityMeta[mode];

  return (
    <View style={[styles.badge, { backgroundColor: meta.background }]}>
      <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
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
    fontWeight: "800"
  }
});
