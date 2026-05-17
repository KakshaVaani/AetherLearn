import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiClientError } from "@/api/client";
import { fetchTeacherClassrooms, generateLessonFromText } from "@/api/backend";
import { useDefaultModelPreference } from "@/api/localPreferences";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { LessonSourcePreview } from "@/components/LessonSourcePreview";
import { ModelModeSelector } from "@/components/ModelModeSelector";
import { ReviewTabs } from "@/components/ReviewTabs";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { classrooms as demoClassrooms } from "@/data/classrooms";
import { ClassSubject, Classroom } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

const uploadTypes = [
  { label: "PDF", icon: "document-text-outline" },
  { label: "Slides", icon: "albums-outline" },
  { label: "Image", icon: "image-outline" },
  { label: "Handwritten note", icon: "create-outline" }
] as const;

export default function UploadLectureScreen() {
  const params = useLocalSearchParams<{ classroomId?: string }>();
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>(demoClassrooms);
  const [selectedClassroomId, setSelectedClassroomId] = useState(params.classroomId ?? demoClassrooms[0].id);
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState(
    demoClassrooms[0].classSubjects?.[0]?.id ?? ""
  );
  const [title, setTitle] = useState("Photosynthesis and Plant Nutrition");
  const [notesText, setNotesText] = useState(
    "Green plants use sunlight, water, and carbon dioxide to prepare food. The process is called photosynthesis. Plants make glucose and release oxygen."
  );
  const [message, setMessage] = useState("Using local demo classes until backend data is available.");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelPreference, setModelPreference] = useDefaultModelPreference();

  useEffect(() => {
    let mounted = true;
    fetchTeacherClassrooms()
      .then((items) => {
        if (!mounted || items.length === 0) return;
        setAvailableClassrooms(items);
        const preferred = params.classroomId && items.some((item) => item.id === params.classroomId)
          ? params.classroomId
          : items[0].id;
        setSelectedClassroomId(preferred);
        setConnected(true);
        setMessage("Connected to backend classes. Generated notes stay private until assigned.");
      })
      .catch(() => {
        if (!mounted) return;
        setConnected(false);
        setMessage("Backend unavailable. Showing local demo classes.");
      });
    return () => {
      mounted = false;
    };
  }, [params.classroomId]);

  const selectedClassroom = useMemo(
    () => availableClassrooms.find((item) => item.id === selectedClassroomId) ?? availableClassrooms[0],
    [availableClassrooms, selectedClassroomId]
  );
  const classSubjects = selectedClassroom.classSubjects?.length
    ? selectedClassroom.classSubjects
    : selectedClassroom.subjects.map((subject) => ({ id: subject, subject }));
  const selectedClassSubject = classSubjects.find((item) => item.id === selectedClassSubjectId) ?? classSubjects[0];
  const selectedSubjectName = selectedClassSubject?.subject ?? selectedClassroom.subjects[0] ?? "General";
  const canSubmit = title.trim().length > 0 && notesText.trim().length > 0 && Boolean(selectedClassroom?.id);
  const reviewParams = {
    classroomId: selectedClassroom.id,
    grade: selectedClassroom.grade ?? selectedClassroom.title,
    subject: selectedSubjectName
  };

  useEffect(() => {
    const firstSubjectId = classSubjects[0]?.id ?? "";
    if (!classSubjects.some((item) => item.id === selectedClassSubjectId)) {
      setSelectedClassSubjectId(firstSubjectId);
    }
  }, [classSubjects, selectedClassSubjectId]);

  function selectClassroom(classroom: Classroom) {
    setSelectedClassroomId(classroom.id);
    setSelectedClassSubjectId(classroom.classSubjects?.[0]?.id ?? classroom.subjects[0] ?? "");
  }

  async function analyzeLecture() {
    setLoading(true);
    setMessage("");
    try {
      const lesson = await generateLessonFromText({
        title: title.trim(),
        text: notesText.trim(),
        classroomId: selectedClassroom.id,
        classSubjectId: selectedClassSubject?.id,
        subject: selectedSubjectName,
        gradeBand: selectedClassroom.grade ?? selectedClassroom.title,
        language: "en",
        modelPreference
      });
      router.push({
        pathname: "/source-understanding",
        params: {
          lessonId: lesson.id,
          title: lesson.title,
          grade: lesson.grade,
          subject: lesson.subject,
          classroomId: lesson.classroomId ?? selectedClassroom.id
        }
      });
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Could not generate notes. Check the backend and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Header title="Create Notes" subtitle="Build a private grade-scoped lesson pack for this class." />

      <ReviewTabs active="source" params={reviewParams} />
      <LessonSourcePreview compact />

      <Card style={styles.uploadCard}>
        <View style={styles.uploadIcon}>
          <Ionicons name="cloud-upload-outline" size={34} color={colors.primary} />
        </View>
        <Text style={styles.uploadTitle}>Source Pack</Text>
        <Text style={styles.uploadText}>
          Paste classroom notes below. Your selected model will generate Source, Teacher, Student, and Trust packs as a
          private draft.
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

      <SectionHeader title="Class and subject" subtitle="Students only see this material after you assign it." />
      <Card style={styles.formCard}>
        <Text style={styles.label}>Class</Text>
        <View style={styles.selectorColumn}>
          {availableClassrooms.map((classroom) => (
            <ChoiceChip
              key={classroom.id}
              label={`${classroom.title}${classroom.grade ? ` - ${classroom.grade}` : ""}`}
              selected={selectedClassroom.id === classroom.id}
              onPress={() => selectClassroom(classroom)}
            />
          ))}
        </View>

        <Text style={styles.label}>Subject</Text>
        <View style={styles.selectorRow}>
          {classSubjects.map((subject) => {
            const selected = selectedClassSubject?.id === subject.id;
            return (
              <Pressable
                key={subject.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedClassSubjectId(subject.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {subject.subject}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.gradeLine}>Grade scope: {selectedClassroom.grade ?? selectedClassroom.title}</Text>

        <Text style={styles.label}>Lesson title</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Enter title" />

        <Text style={styles.label}>Text notes</Text>
        <TextInput
          value={notesText}
          onChangeText={setNotesText}
          style={[styles.input, styles.textArea]}
          placeholder="Paste notes for this class only"
          multiline
        />

        <ModelModeSelector
          value={modelPreference}
          onChange={setModelPreference}
          label="Generation model"
        />
      </Card>

      <SectionHeader title="Review before generation" />
      <Card style={styles.formCard}>
        <Text style={styles.label}>Lecture title</Text>
        <Text style={styles.reviewText}>{title}</Text>
        <Text style={styles.label}>Visibility</Text>
        <Text style={styles.reviewText}>Private teacher draft. Assign it to publish for this class.</Text>
      </Card>

      {message ? (
        <Text style={[styles.message, connected ? styles.successMessage : styles.warningMessage]}>{message}</Text>
      ) : null}

      <AppButton
        title="Generate Private Notes"
        leftIcon={<Ionicons name="sparkles-outline" size={20} color={colors.white} />}
        disabled={!canSubmit}
        loading={loading}
        onPress={analyzeLecture}
      />
    </ScreenContainer>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
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
  selectorColumn: {
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
  },
  gradeLine: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  reviewText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700"
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  successMessage: {
    color: colors.success
  },
  warningMessage: {
    color: colors.warning
  }
});
