import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, radii, spacing } from "@/constants/theme";

type ReviewTabKey = "source" | "teacher" | "student" | "trust";
type ReviewRoute = "/source-understanding" | "/teacher-pack" | "/student-pack" | "/trust-pack";
type ReviewParams = {
  lessonId?: string;
  classroomId?: string;
  title?: string;
  grade?: string;
  subject?: string;
  mode?: "generated" | "view";
  origin?: "classroom" | "library";
};

type ReviewTabsProps = {
  active: ReviewTabKey;
  params?: ReviewParams;
  onBeforeNavigate?: () => void;
};

const tabs: { key: ReviewTabKey; label: string; route: ReviewRoute }[] = [
  { key: "source", label: "Source Pack", route: "/source-understanding" },
  { key: "teacher", label: "Teacher Pack", route: "/teacher-pack" },
  { key: "student", label: "Student Pack", route: "/student-pack" },
  { key: "trust", label: "Trust Pack", route: "/trust-pack" }
];

export function ReviewTabs({ active, params, onBeforeNavigate }: ReviewTabsProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = active === tab.key;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              onBeforeNavigate?.();
              router.push({ pathname: tab.route, params });
            }}
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
    minHeight: 48,
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
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  textSelected: {
    color: colors.primaryDark
  }
});
