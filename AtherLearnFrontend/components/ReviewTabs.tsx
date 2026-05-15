import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, radii, spacing } from "@/constants/theme";

type ReviewTabKey = "source" | "teacher" | "student" | "trust";

type ReviewTabsProps = {
  active: ReviewTabKey;
};

const tabs: { key: ReviewTabKey; label: string; route: string }[] = [
  { key: "source", label: "Source", route: "/source-understanding" },
  { key: "teacher", label: "Teacher", route: "/teacher-pack" },
  { key: "student", label: "Student", route: "/student-pack" },
  { key: "trust", label: "Trust", route: "/trust-pack" }
];

export function ReviewTabs({ active }: ReviewTabsProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = active === tab.key;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => router.push(tab.route)}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm
  },
  tabSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  text: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  textSelected: {
    color: colors.primaryDark
  }
});
