import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { accessibilityModes } from "@/data/accessibilityProfiles";
import { currentStudent } from "@/data/users";
import { AccessibilityMode } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

const languages = ["English", "Hindi", "Spanish", "French", "Arabic", "Chinese", "Tamil"];
const textSizes = ["Regular", "Large", "Extra Large"];

export default function StudentProfileSetupScreen() {
  const [mode, setMode] = useState<AccessibilityMode>(currentStudent.accessibilityMode ?? "Standard");
  const [language, setLanguage] = useState(currentStudent.preferredLanguage ?? "English");
  const [textSize, setTextSize] = useState("Large");
  const [audioSupport, setAudioSupport] = useState(true);

  return (
    <ScreenContainer>
      <Header title="Student Settings" subtitle="Tune your learning experience." showBack showSettings={false} />

      <SectionHeader title="Learning mode" />
      <View style={styles.modeList}>
        {accessibilityModes.map((item) => {
          const selected = mode === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setMode(item)}
              style={[styles.modeCard, selected && styles.modeCardSelected]}
            >
              <AccessibilityBadge mode={item} />
              <Text style={[styles.check, selected && styles.checkSelected]}>{selected ? "Selected" : "Choose"}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === "Multilingual" ? (
        <>
          <SectionHeader title="Target language" subtitle="Gemma 4 will generate multilingual support in this language." />
          <Card style={styles.selectorCard}>
            {languages.map((item) => (
              <ChoiceRow
                key={item}
                label={item}
                selected={language === item}
                onPress={() => setLanguage(item)}
              />
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Text size" />
      <Card style={styles.selectorCard}>
        {textSizes.map((item) => (
          <ChoiceRow
            key={item}
            label={item}
            selected={textSize === item}
            onPress={() => setTextSize(item)}
          />
        ))}
      </Card>

      <Card style={styles.switchCard}>
        <View style={styles.switchText}>
          <Text style={styles.switchTitle}>Audio support</Text>
          <Text style={styles.switchSubtitle}>Show audio-first lesson controls where available.</Text>
        </View>
        <Switch
          value={audioSupport}
          onValueChange={setAudioSupport}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={audioSupport ? colors.primary : colors.muted}
        />
      </Card>

      <AppButton title="Save" onPress={() => router.push("/(student)/dashboard")} />
    </ScreenContainer>
  );
}

type ChoiceRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ChoiceRow({ label, selected, onPress }: ChoiceRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choiceRow, selected && styles.choiceRowSelected]}
    >
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
      <Text style={[styles.choiceCheck, selected && styles.choiceLabelSelected]}>
        {selected ? "On" : "Off"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeList: {
    gap: spacing.md
  },
  modeCard: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  check: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  checkSelected: {
    color: colors.primaryDark
  },
  selectorCard: {
    gap: spacing.sm
  },
  choiceRow: {
    minHeight: 48,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background
  },
  choiceRowSelected: {
    backgroundColor: colors.primarySoft
  },
  choiceLabel: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800"
  },
  choiceLabelSelected: {
    color: colors.primaryDark
  },
  choiceCheck: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  switchText: {
    flex: 1,
    gap: spacing.xs
  },
  switchTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  switchSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  }
});
