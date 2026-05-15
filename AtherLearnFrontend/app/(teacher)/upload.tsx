import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { subjects } from "@/data/subjects";
import { colors, radii, spacing } from "@/constants/theme";

const uploadTypes = [
  { label: "PDF", icon: "document-text-outline" },
  { label: "Slides", icon: "albums-outline" },
  { label: "Image", icon: "image-outline" },
  { label: "Handwritten note", icon: "create-outline" }
] as const;

export default function UploadLectureScreen() {
  const [selectedSubject, setSelectedSubject] = useState("Science");
  const [title, setTitle] = useState("Photosynthesis and Plant Nutrition");
  const [description, setDescription] = useState(
    "Biology slide with a plant diagram for Grade 8 learners."
  );

  function analyzeLecture() {
    // Later: send the selected file, subject, title, and description to the FastAPI upload endpoint.
    router.push("/(teacher)/lecture-result");
  }

  return (
    <ScreenContainer>
      <Header title="Upload Lecture" subtitle="Mock upload flow for classroom materials." />

      <Card style={styles.uploadCard}>
        <View style={styles.uploadIcon}>
          <Ionicons name="cloud-upload-outline" size={34} color={colors.primary} />
        </View>
        <Text style={styles.uploadTitle}>Drop in classroom material</Text>
        <Text style={styles.uploadText}>
          PDF, slides, diagrams, worksheets, textbook pages, or handwritten notes.
        </Text>
        <View style={styles.uploadTypes}>
          {uploadTypes.map((item) => (
            <View key={item.label} style={styles.uploadType}>
              <Ionicons name={item.icon} size={18} color={colors.primary} />
              <Text style={styles.uploadTypeText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title="Lecture details" />
      <Card style={styles.formCard}>
        <Text style={styles.label}>Subject</Text>
        <View style={styles.selectorRow}>
          {subjects.slice(0, 3).map((subject) => {
            const selected = selectedSubject === subject.name;
            return (
              <Pressable
                key={subject.id}
                accessibilityRole="button"
                onPress={() => setSelectedSubject(subject.name)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {subject.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Lecture title</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Enter title" />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
          placeholder="Short context for Gemma 4"
          multiline
        />
      </Card>

      <AppButton
        title="Analyze with Gemma 4"
        leftIcon={<Ionicons name="sparkles-outline" size={20} color={colors.white} />}
        onPress={analyzeLecture}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  uploadCard: {
    alignItems: "center",
    gap: spacing.md
  },
  uploadIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  uploadTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    textAlign: "center"
  },
  uploadText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  uploadTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm
  },
  uploadType: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  uploadTypeText: {
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  formCard: {
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  chip: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card
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
  }
});
