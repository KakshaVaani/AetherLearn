import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { assignments } from "@/data/assignments";
import { accessibilityModes } from "@/data/accessibilityProfiles";
import { classrooms } from "@/data/classrooms";
import { lectures } from "@/data/lectures";
import { subjects } from "@/data/subjects";
import { AccessibilityMode } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

export default function CreateAssignmentScreen() {
  const [selectedClassroom, setSelectedClassroom] = useState(classrooms[0].title);
  const [selectedSubject, setSelectedSubject] = useState("Science");
  const [selectedLecture, setSelectedLecture] = useState(lectures[0].title);
  const [prompt, setPrompt] = useState("Create 5 questions on photosynthesis.");
  const [versions, setVersions] = useState<AccessibilityMode[]>([
    "Standard",
    "Blind / Low Vision",
    "Dyslexia Friendly",
    "Multilingual",
    "Slow Learner"
  ]);
  const [generated, setGenerated] = useState(false);

  function toggleVersion(mode: AccessibilityMode) {
    setVersions((current) =>
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode]
    );
  }

  function generateAssignment() {
    // Later: send selected classroom, subject, lectures, prompt, and version targets to FastAPI.
    setGenerated(true);
  }

  return (
    <ScreenContainer>
      <Header title="Create Assignment" subtitle="Generate accessible versions from uploaded lectures." showBack />

      <SectionHeader title="Assignment source" />
      <Card style={styles.formCard}>
        <Text style={styles.label}>Select classroom</Text>
        <View style={styles.selectorColumn}>
          {classrooms.map((classroom) => (
            <ChoiceChip
              key={classroom.id}
              label={classroom.title}
              selected={selectedClassroom === classroom.title}
              onPress={() => setSelectedClassroom(classroom.title)}
            />
          ))}
        </View>

        <Text style={styles.label}>Select subject</Text>
        <View style={styles.selectorRow}>
          {subjects.slice(0, 3).map((subject) => (
            <ChoiceChip
              key={subject.id}
              label={subject.name}
              selected={selectedSubject === subject.name}
              onPress={() => setSelectedSubject(subject.name)}
            />
          ))}
        </View>

        <Text style={styles.label}>Select lectures</Text>
        <View style={styles.selectorColumn}>
          {lectures.map((lecture) => (
            <ChoiceChip
              key={lecture.id}
              label={lecture.title}
              selected={selectedLecture === lecture.title}
              onPress={() => setSelectedLecture(lecture.title)}
            />
          ))}
        </View>

        <Text style={styles.label}>Prompt</Text>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          style={[styles.input, styles.textArea]}
          placeholder="Create 5 questions on photosynthesis."
          multiline
        />
      </Card>

      <SectionHeader title="Student versions" subtitle="Choose which personalized variants to generate." />
      <View style={styles.versionGrid}>
        {accessibilityModes.map((mode) => {
          const selected = versions.includes(mode);
          return (
            <Pressable
              key={mode}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleVersion(mode)}
              style={[styles.versionCard, selected && styles.versionCardSelected]}
            >
              <AccessibilityBadge mode={mode} />
              <Ionicons
                name={selected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={selected ? colors.primary : colors.muted}
              />
            </Pressable>
          );
        })}
      </View>

      <AppButton
        title="Generate Assignment"
        leftIcon={<Ionicons name="sparkles-outline" size={20} color={colors.white} />}
        onPress={generateAssignment}
      />

      {generated ? (
        <Card style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Generated assignment preview</Text>
            <Badge label={`${versions.length} versions`} tone="secondary" />
          </View>
          {assignments[0].questions.map((question, index) => (
            <Text key={question.id} style={styles.question}>
              {index + 1}. {question.prompt}
            </Text>
          ))}
          <AppButton
            title="Open Assignment Detail"
            variant="outline"
            onPress={() => router.push("/(teacher)/assignment/photosynthesis-quiz")}
          />
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ChoiceChip({ label, selected, onPress }: ChoiceChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  selectorColumn: {
    gap: spacing.sm
  },
  chip: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  chipText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  chipTextSelected: {
    color: colors.primaryDark
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    lineHeight: 22
  },
  textArea: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  versionGrid: {
    gap: spacing.md
  },
  versionCard: {
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
  versionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  previewCard: {
    gap: spacing.md
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  previewTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  question: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600"
  }
});
