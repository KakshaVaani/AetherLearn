import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { saveStudentAcademicProfileRemote } from "@/api/backend";
import { saveStudentAcademicProfile } from "@/api/studentProfile";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { ScreenContainer } from "@/components/ScreenContainer";
import { subjects } from "@/data/subjects";
import { colors, radii, spacing } from "@/constants/theme";

const classes = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];

export default function StudentOnboardingScreen() {
  const [school, setSchool] = useState("");
  const [className, setClassName] = useState("Grade 8");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["Science", "Math", "English"]);
  const [saving, setSaving] = useState(false);

  function toggleSubject(subject: string) {
    setSelectedSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : [...current, subject]
    );
  }

  async function continueToDashboard() {
    const profile = {
      school: school.trim() || "AtherLearn Demo School",
      className,
      subjects: selectedSubjects,
      completed: true
    };
    saveStudentAcademicProfile(profile);
    setSaving(true);
    try {
      await saveStudentAcademicProfileRemote(profile);
    } catch {
      // Local storage keeps the demo usable even if the backend is offline.
    } finally {
      setSaving(false);
    }
    router.replace("/(student)/dashboard");
  }

  const canContinue = selectedSubjects.length > 0;

  return (
    <ScreenContainer contentStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="school-outline" size={24} color={colors.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Set up your classroom</Text>
          <Text style={styles.subtitle}>This helps AtherLearn map you to the right class and teachers.</Text>
        </View>
      </View>

      <Card style={styles.card}>
        <Text style={styles.label}>School</Text>
        <TextInput
          value={school}
          onChangeText={setSchool}
          placeholder="Enter your school name"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Class</Text>
        <View style={styles.choiceGrid}>
          {classes.map((item) => {
            const selected = className === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setClassName(item)}
                style={[styles.choice, selected && styles.choiceSelected]}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Subjects you study</Text>
        <View style={styles.subjectList}>
          {subjects.map((subject) => {
            const selected = selectedSubjects.includes(subject.name);
            return (
              <Pressable
                key={subject.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggleSubject(subject.name)}
                style={[styles.subjectRow, selected && styles.subjectRowSelected]}
              >
                <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                <Text style={styles.subjectText}>{subject.name}</Text>
                <Ionicons
                  name={selected ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={selected ? colors.primary : colors.muted}
                />
              </Pressable>
            );
          })}
        </View>
      </Card>

      <AppButton title="Continue" disabled={!canContinue} loading={saving} onPress={continueToDashboard} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  headerText: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  card: {
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  choice: {
    minHeight: 42,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    justifyContent: "center"
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  choiceText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  choiceTextSelected: {
    color: colors.primaryDark
  },
  subjectList: {
    gap: spacing.sm
  },
  subjectRow: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md
  },
  subjectRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill
  },
  subjectText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  }
});
