import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { featuredLessonPack } from "@/data/lessonPacks";
import { LessonOutputType, RuntimeMode } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

type SettingKey = "grade" | "subject" | "language" | "learnerNeed" | "outputType" | "runtimeMode";

const settingLabels: Record<SettingKey, string> = {
  grade: "Grade",
  subject: "Subject",
  language: "Language",
  learnerNeed: "Learner Need",
  outputType: "Output Type",
  runtimeMode: "Runtime Mode"
};

const settingOptions: Record<SettingKey, string[]> = {
  grade: ["Grade 6", "Grade 7", "Grade 8"],
  subject: ["Science", "Mathematics", "Social Science"],
  language: ["English", "Hindi", "Marathi"],
  learnerNeed: ["Low Vision", "Dyslexia Friendly", "Multilingual", "Struggling Reader"],
  outputType: [
    "Teacher + Student + Trust Packs",
    "Teacher Pack",
    "Student Access Pack",
    "Audio Explanation",
    "Quiz / Worksheet"
  ],
  runtimeMode: ["Hosted Gemma", "Local Ollama", "Demo Fixture"]
};

export default function LessonSettingsScreen() {
  const [openSetting, setOpenSetting] = useState<SettingKey | null>(null);
  const [grade, setGrade] = useState(featuredLessonPack.grade);
  const [subject, setSubject] = useState(featuredLessonPack.subject);
  const [language, setLanguage] = useState(featuredLessonPack.language);
  const [learnerNeed, setLearnerNeed] = useState(featuredLessonPack.learnerNeed);
  const [outputType, setOutputType] = useState<LessonOutputType>(featuredLessonPack.outputType);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>(featuredLessonPack.runtimeMode);

  function selectedValue(key: SettingKey) {
    if (key === "grade") return grade;
    if (key === "subject") return subject;
    if (key === "language") return language;
    if (key === "learnerNeed") return learnerNeed;
    if (key === "outputType") return outputType;
    return runtimeMode;
  }

  function setSelectedValue(key: SettingKey, value: string) {
    if (key === "grade") setGrade(value);
    if (key === "subject") setSubject(value);
    if (key === "language") setLanguage(value);
    if (key === "learnerNeed") setLearnerNeed(value);
    if (key === "outputType") setOutputType(value as LessonOutputType);
    if (key === "runtimeMode") setRuntimeMode(value as RuntimeMode);
    setOpenSetting(null);
  }

  return (
    <ScreenContainer>
      <Header title="Lesson Settings" subtitle="Tune the output for accessibility and classroom context." showBack />

      <SectionHeader title="Generation details" />
      <Card style={styles.formCard}>
        {(Object.keys(settingLabels) as SettingKey[]).map((key) => {
          const selected = selectedValue(key);
          const expanded = openSetting === key;

          return (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{settingLabels[key]}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setOpenSetting((current) => (current === key ? null : key))}
                style={[styles.valueBox, expanded && styles.valueBoxActive]}
              >
                <Text style={styles.value}>{selected}</Text>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
              </Pressable>
              {expanded ? (
                <View style={styles.optionPanel}>
                  {settingOptions[key].map((option) => (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      onPress={() => setSelectedValue(key, option)}
                      style={[styles.optionRow, option === selected && styles.optionRowSelected]}
                    >
                      <Text style={[styles.optionText, option === selected && styles.optionTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      <Card style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.infoText}>
          Settings help tailor content for low vision, dyslexia support, multilingual learning, and teacher review.
        </Text>
      </Card>

      <AppButton
        title="Analyze Source"
        leftIcon={<Ionicons name="sparkles-outline" size={20} color={colors.white} />}
        onPress={() => router.push("/source-understanding")}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: spacing.md
  },
  row: {
    gap: spacing.sm
  },
  label: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  valueBox: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md
  },
  valueBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  value: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700"
  },
  optionPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.xs,
    gap: spacing.xs
  },
  optionRow: {
    minHeight: 38,
    borderRadius: radii.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  optionRowSelected: {
    backgroundColor: colors.primarySoft
  },
  optionText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  optionTextSelected: {
    color: colors.primaryDark
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
  }
});
