import { StyleSheet, Text, View } from "react-native";
import { accessibilityMeta } from "@/data/accessibilityProfiles";
import { AccessibilityMode } from "@/types";
import { radii, spacing } from "@/constants/theme";
import { normalizeAccessibilityMode } from "@/utils/accessibilityModes";

type AccessibilityBadgeProps = {
  mode: AccessibilityMode | string | null | undefined;
};

export function AccessibilityBadge({ mode }: AccessibilityBadgeProps) {
  const normalizedMode = normalizeAccessibilityMode(mode) ?? "Standard";
  const meta = accessibilityMeta[normalizedMode];

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
