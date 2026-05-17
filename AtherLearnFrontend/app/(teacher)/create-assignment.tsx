import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiClientError } from "@/api/client";
import {
  assignLessonToClass,
  fetchTeacherDashboard,
  generateAssignmentDraftFromLesson
} from "@/api/backend";
import { useDefaultModelPreference } from "@/api/localPreferences";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ModelModeSelector } from "@/components/ModelModeSelector";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { accessibilityModes } from "@/data/accessibilityProfiles";
import { classrooms as demoClassrooms } from "@/data/classrooms";
import { lessonPacks } from "@/data/lessonPacks";
import { AccessibilityMode, AssignmentAnswerMode, AssignmentQuestion, Classroom, LessonPack } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";
import { assignmentAnswerModeLabel, assignmentAnswerModeOptions } from "@/utils/assignmentModes";

type AssignmentDraft = {
  title: string;
  instructions: string;
  dueAt: string;
  answerMode: AssignmentAnswerMode;
  versions: AccessibilityMode[];
  questions: AssignmentQuestion[];
};

const genericMcqOptions = new Set([
  "Answer from the lesson notes",
  "A detail not stated in the lesson",
  "A guess outside the lesson source",
  "I need to review again"
]);

function mcqOptionsFor(question: AssignmentQuestion) {
  const options = (question.options ?? []).filter((option) => !genericMcqOptions.has(option.trim()));
  return [...options, "", "", "", ""].slice(0, 4);
}

function prepareQuestionForMode(question: AssignmentQuestion, mode: AssignmentAnswerMode): AssignmentQuestion {
  if (mode === "mcq") {
    return {
      ...question,
      options: mcqOptionsFor(question)
    };
  }
  return {
    ...question,
    options: []
  };
}

export default function CreateAssignmentScreen() {
  const params = useLocalSearchParams<{ classroomId?: string; lessonId?: string }>();
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>(demoClassrooms);
  const [availableLessons, setAvailableLessons] = useState<LessonPack[]>(lessonPacks);
  const [selectedClassroomId, setSelectedClassroomId] = useState(params.classroomId ?? demoClassrooms[0].id);
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState(
    demoClassrooms[0].classSubjects?.[0]?.id ?? ""
  );
  const [selectedLessonId, setSelectedLessonId] = useState(params.lessonId ?? lessonPacks[0].id);
  const [versions, setVersions] = useState<AccessibilityMode[]>([
    "Standard",
    "Blind / Low Vision",
    "Dyslexia Friendly",
    "Multilingual",
    "Slow Learner"
  ]);
  const [draft, setDraft] = useState<AssignmentDraft | null>(null);
  const [questionType, setQuestionType] = useState<AssignmentAnswerMode>("short_answer");
  const [assigned, setAssigned] = useState(false);
  const [assignedAssignmentId, setAssignedAssignmentId] = useState<string | null>(null);
  const [message, setMessage] = useState("Using local demo classes until backend data is available.");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelPreference, setModelPreference] = useDefaultModelPreference();
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchTeacherDashboard()
      .then((data) => {
        if (!mounted) return;
        if (data.classes.length > 0) {
          setAvailableClassrooms(data.classes);
          const preferredClassroom = params.classroomId && data.classes.some((item) => item.id === params.classroomId)
            ? params.classroomId
            : data.classes[0].id;
          setSelectedClassroomId(preferredClassroom);
        }
        if (data.lessons.length > 0) {
          setAvailableLessons(data.lessons);
          if (params.lessonId && data.lessons.some((item) => item.id === params.lessonId)) {
            setSelectedLessonId(params.lessonId);
          }
        }
        setConnected(true);
        setMessage("Connected to backend. Assignment publishes only to the selected class.");
      })
      .catch(() => {
        if (!mounted) return;
        setConnected(false);
        setMessage("Backend unavailable. Showing local demo data.");
      });
    return () => {
      mounted = false;
    };
  }, [params.classroomId, params.lessonId]);

  const selectedClassroom = useMemo(
    () => availableClassrooms.find((item) => item.id === selectedClassroomId) ?? availableClassrooms[0],
    [availableClassrooms, selectedClassroomId]
  );
  const classSubjects = selectedClassroom.classSubjects?.length
    ? selectedClassroom.classSubjects
    : selectedClassroom.subjects.map((subject) => ({ id: subject, subject }));
  const selectedClassSubject = classSubjects.find((item) => item.id === selectedClassSubjectId) ?? classSubjects[0];
  const selectedSubject = selectedClassSubject?.subject ?? selectedClassroom.subjects[0] ?? "General";
  const filteredLessons = availableLessons.filter((lesson) => {
    if (lesson.classroomId) return lesson.classroomId === selectedClassroom.id;
    const gradeMatches = !selectedClassroom.grade || lesson.grade === selectedClassroom.grade;
    const subjectMatches = lesson.subject === selectedSubject;
    return gradeMatches && subjectMatches;
  });
  const lessonsForPicker = filteredLessons.length > 0 || connected ? filteredLessons : availableLessons;
  const selectedLesson = lessonsForPicker.find((lesson) => lesson.id === selectedLessonId) ?? lessonsForPicker[0];

  useEffect(() => {
    const firstSubjectId = classSubjects[0]?.id ?? "";
    if (!classSubjects.some((item) => item.id === selectedClassSubjectId)) {
      setSelectedClassSubjectId(firstSubjectId);
    }
  }, [classSubjects, selectedClassSubjectId]);

  useEffect(() => {
    if (selectedLesson && !lessonsForPicker.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(selectedLesson.id);
    }
  }, [lessonsForPicker, selectedLesson, selectedLessonId]);

  function toggleVersion(mode: AccessibilityMode) {
    setVersions((current) =>
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode]
    );
  }

  function selectClassroom(classroom: Classroom) {
    setSelectedClassroomId(classroom.id);
    setSelectedClassSubjectId(classroom.classSubjects?.[0]?.id ?? classroom.subjects[0] ?? "");
    setDraft(null);
    setAssigned(false);
    setAssignedAssignmentId(null);
    setClassPickerOpen(false);
  }

  function selectQuestionType(mode: AssignmentAnswerMode) {
    setQuestionType(mode);
    setDraft((current) =>
      current
        ? {
            ...current,
            answerMode: mode,
            questions: current.questions.map((question) => prepareQuestionForMode(question, mode))
          }
        : current
    );
    setAssigned(false);
    setAssignedAssignmentId(null);
  }

  async function generateAssignment() {
    if (!selectedLesson) {
      setMessage("Select a lesson before generating an assignment.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const generated = await generateAssignmentDraftFromLesson({
        lessonId: selectedLesson.id,
        classroomId: selectedClassroom.id,
        preferredVersions: versions,
        questionType,
        lessonPack: selectedLesson,
        modelPreference
      });
      const generatedQuestions = generated.questions.filter((item) => item.prompt.trim().length > 0);
      const fallbackQuestions = (
        selectedLesson.studentAccessPack.practiceQuestions.length
          ? selectedLesson.studentAccessPack.practiceQuestions
          : selectedLesson.teacherPack.worksheet
      ).map((prompt, index) => ({
        id: `q${index + 1}`,
        prompt,
        hint: index === 0 ? "Use the lesson pack before answering." : undefined
      }));
      const questions = generatedQuestions.length
        ? generatedQuestions
        : (fallbackQuestions.length
            ? fallbackQuestions
            : [{ id: "q1", prompt: "Write what you understood from this lesson." }]);

      setDraft({
        title: generated.title || `${selectedLesson.title} Assignment`,
        instructions: generated.instructions || "Complete the lesson pack and answer the questions.",
        dueAt: "",
        answerMode: questionType,
        versions: generated.versions.length ? generated.versions : versions,
        questions: questions.map((question) => prepareQuestionForMode(question, questionType))
      });
      if (generated.versions.length) {
        setVersions(generated.versions);
      }
      setAssigned(false);
      setAssignedAssignmentId(null);
      setMessage("Assignment draft generated by Gemma. Review and edit before assigning.");
    } catch (error) {
      setDraft(null);
      setAssigned(false);
      setAssignedAssignmentId(null);
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Could not reach Gemma assignment generation. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(patch: Partial<AssignmentDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setAssigned(false);
    setAssignedAssignmentId(null);
  }

  function updateDraftQuestion(questionId: string, prompt: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((question) =>
              question.id === questionId ? { ...question, prompt } : question
            )
          }
        : current
    );
    setAssigned(false);
    setAssignedAssignmentId(null);
  }

  function updateDraftQuestionOption(questionId: string, optionIndex: number, value: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((question) =>
              question.id === questionId
                ? {
                    ...question,
                    options: mcqOptionsFor(question).map((option, index) =>
                      index === optionIndex ? value : option
                    )
                  }
                : question
            )
          }
        : current
    );
    setAssigned(false);
    setAssignedAssignmentId(null);
  }

  async function assignDraftToClass() {
    if (!selectedLesson || !draft) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await assignLessonToClass({
        lessonId: selectedLesson.id,
        classroomId: selectedClassroom.id,
        title: draft.title.trim() || `${selectedLesson.title} Assignment`,
        instructions: draft.instructions.trim() || undefined,
        dueAt: draft.dueAt.trim() || undefined,
        answerMode: draft.answerMode,
        versions: draft.versions,
        questions: draft.questions
          .filter((question) => question.prompt.trim().length > 0)
          .map((question) => ({
            ...question,
            prompt: question.prompt.trim(),
            options:
              draft.answerMode === "mcq"
                ? mcqOptionsFor(question).map((option) => option.trim()).filter(Boolean)
                : []
          }))
      });
      setAssignedAssignmentId(result[0]?.id ?? null);
      setAssigned(true);
      setMessage(`${draft.title || selectedLesson.title} assigned to ${selectedClassroom.title}.`);
    } catch (error) {
      setAssigned(false);
      setAssignedAssignmentId(null);
      if (error instanceof ApiClientError && error.status === 401) {
        setMessage("Session expired. Please log in again.");
        router.replace({ pathname: "/login", params: { mode: "login", role: "teacher" } });
        return;
      }
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Could not assign this lesson. Check the selected class and lesson."
      );
    } finally {
      setLoading(false);
    }
  }

  const publishableQuestions = draft?.questions.filter((question) => question.prompt.trim().length > 0) ?? [];
  const needsMcqOptions =
    draft?.answerMode === "mcq" &&
    publishableQuestions.some((question) => mcqOptionsFor(question).filter((option) => option.trim()).length < 2);

  return (
    <ScreenContainer>
      <Header title="Create Assignment" subtitle="Generate accessible versions from uploaded lectures." showBack />

      <SectionHeader title="Assignment source" />
      <Card style={styles.formCard}>
        <Text style={styles.label}>Select classroom</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setClassPickerOpen((value) => !value)}
          style={styles.dropdownButton}
        >
          <View style={styles.dropdownText}>
            <Text style={styles.dropdownTitle}>{selectedClassroom.title}</Text>
            <Text style={styles.dropdownMeta}>
              {selectedClassroom.grade ?? "Grade not set"} - {selectedClassroom.subjects.join(", ")}
            </Text>
          </View>
          <Ionicons name={classPickerOpen ? "chevron-up" : "chevron-down"} size={22} color={colors.muted} />
        </Pressable>
        {classPickerOpen ? (
          <View style={styles.dropdownMenu}>
            {availableClassrooms.map((classroom) => (
              <Pressable
                key={classroom.id}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedClassroom.id === classroom.id }}
                onPress={() => selectClassroom(classroom)}
                style={[styles.dropdownOption, selectedClassroom.id === classroom.id && styles.dropdownOptionSelected]}
              >
                <View style={styles.dropdownText}>
                  <Text style={styles.dropdownTitle}>{classroom.title}</Text>
                  <Text style={styles.dropdownMeta}>
                    {classroom.grade ?? "Grade not set"} - {classroom.subjects.join(", ")}
                  </Text>
                </View>
                {selectedClassroom.id === classroom.id ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Select subject</Text>
        <View style={styles.selectorRow}>
          {classSubjects.map((subject) => (
            <ChoiceChip
              key={subject.id}
              label={subject.subject}
              selected={selectedClassSubject?.id === subject.id}
              onPress={() => {
                setSelectedClassSubjectId(subject.id);
                setDraft(null);
                setAssigned(false);
                setAssignedAssignmentId(null);
              }}
            />
          ))}
        </View>

        <Text style={styles.gradeLine}>Grade scope: {selectedClassroom.grade ?? selectedClassroom.title}</Text>

        <Text style={styles.label}>Select lesson</Text>
        <View style={styles.selectorColumn}>
          {lessonsForPicker.map((lesson) => (
            <ChoiceChip
              key={lesson.id}
              label={`${lesson.title} - ${lesson.grade} - ${lesson.subject}`}
              selected={selectedLesson?.id === lesson.id}
              onPress={() => {
                setSelectedLessonId(lesson.id);
                setDraft(null);
                setAssigned(false);
                setAssignedAssignmentId(null);
              }}
            />
          ))}
        </View>
        {filteredLessons.length === 0 ? (
          <Text style={styles.warningText}>
            {lessonsForPicker.length === 0
              ? "No lesson match for this class yet. Create notes for this class first."
              : "No exact lesson match for this class yet. Demo lessons are shown as fallback."}
          </Text>
        ) : null}

        <Text style={styles.label}>Question type</Text>
        <View style={styles.selectorRow}>
          {assignmentAnswerModeOptions.map((option) => (
            <ChoiceChip
              key={option.value}
              label={option.label}
              selected={questionType === option.value}
              onPress={() => selectQuestionType(option.value)}
            />
          ))}
        </View>

        <ModelModeSelector
          value={modelPreference}
          onChange={setModelPreference}
          label="Draft generation model"
        />
      </Card>

      <AppButton
        title={draft ? "Regenerate Assignment" : "Generate Assignment"}
        leftIcon={<Ionicons name="sparkles-outline" size={20} color={colors.white} />}
        disabled={!selectedLesson || loading}
        loading={loading}
        onPress={generateAssignment}
      />

      {draft ? (
        <>
          <SectionHeader title="Edit assignment" subtitle="Students see this after you assign it to the class." />
          <Card style={styles.formCard}>
            <Text style={styles.label}>Assignment title</Text>
            <TextInput
              value={draft.title}
              onChangeText={(value) => updateDraft({ title: value })}
              style={styles.input}
              placeholder="Assignment title"
            />

            <Text style={styles.label}>Instructions</Text>
            <TextInput
              value={draft.instructions}
              onChangeText={(value) => updateDraft({ instructions: value })}
              style={[styles.input, styles.textArea]}
              placeholder="Instructions for students"
              multiline
            />

            <Text style={styles.label}>Due date</Text>
            <TextInput
              value={draft.dueAt}
              onChangeText={(value) => updateDraft({ dueAt: value })}
              style={styles.input}
              placeholder="Optional ISO date or teacher note"
            />

            <Text style={styles.label}>Question type</Text>
            <View style={styles.selectorRow}>
              {assignmentAnswerModeOptions.map((option) => (
                <ChoiceChip
                  key={option.value}
                  label={option.label}
                  selected={draft.answerMode === option.value}
                  onPress={() => selectQuestionType(option.value)}
                />
              ))}
            </View>

            <Text style={styles.label}>Questions</Text>
            {draft.questions.map((question, index) => (
              <View key={question.id} style={styles.questionEditor}>
                <Text style={styles.questionLabel}>Question {index + 1}</Text>
                <TextInput
                  value={question.prompt}
                  onChangeText={(value) => updateDraftQuestion(question.id, value)}
                  style={[styles.input, styles.questionInput]}
                  multiline
                />
                {draft.answerMode === "mcq" ? (
                  <View style={styles.optionEditorList}>
                    {mcqOptionsFor(question).map((option, optionIndex) => (
                      <TextInput
                        key={`${question.id}-option-${optionIndex}`}
                        value={option}
                        onChangeText={(value) => updateDraftQuestionOption(question.id, optionIndex, value)}
                        style={styles.input}
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
            {needsMcqOptions ? (
              <Text style={styles.warningText}>Add at least two options for each MCQ before assigning.</Text>
            ) : null}
          </Card>

          <SectionHeader title="Student versions" subtitle="Choose which personalized variants to publish." />
          <View style={styles.versionGrid}>
            {accessibilityModes.map((mode) => {
              const selected = versions.includes(mode);
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    toggleVersion(mode);
                    updateDraft({
                      versions: selected
                        ? versions.filter((item) => item !== mode)
                        : [...versions, mode]
                    });
                  }}
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
            title="Assign to Class"
            leftIcon={<Ionicons name="send-outline" size={20} color={colors.white} />}
            disabled={!selectedLesson || loading || publishableQuestions.length === 0 || needsMcqOptions}
            loading={loading}
            onPress={assignDraftToClass}
          />
        </>
      ) : null}

      {message ? (
        <Text style={[styles.message, connected && assigned ? styles.successText : styles.warningText]}>{message}</Text>
      ) : null}

      {assigned ? (
        <Card style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Assignment published to class</Text>
            <Badge label={`${draft?.versions.length ?? versions.length} versions`} tone="secondary" />
          </View>
          <Badge label={assignmentAnswerModeLabel(draft?.answerMode ?? questionType)} tone="primary" />
          <Text style={styles.previewMeta}>{selectedClassroom.title} - {selectedSubject}</Text>
          <Text style={styles.previewMeta}>Lesson: {selectedLesson?.title}</Text>
          {(draft?.questions ?? []).map((question, index) => (
            <Text key={question.id} style={styles.question}>
              {index + 1}. {question.prompt}
            </Text>
          ))}
          <AppButton
            title="Open Assignment Detail"
            variant="outline"
            onPress={() =>
              assignedAssignmentId
                ? router.push({ pathname: "/(teacher)/assignment/[id]", params: { id: assignedAssignmentId } })
                : router.push("/(teacher)/assignment")
            }
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
  dropdownButton: {
    minHeight: 62,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md
  },
  dropdownMenu: {
    gap: spacing.sm
  },
  dropdownOption: {
    minHeight: 58,
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
  dropdownOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  dropdownText: {
    flex: 1,
    gap: 2
  },
  dropdownTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  dropdownMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
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
  },
  questionEditor: {
    gap: spacing.sm
  },
  optionEditorList: {
    gap: spacing.sm
  },
  questionLabel: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  questionInput: {
    minHeight: 72,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  gradeLine: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  warningText: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  successText: {
    color: colors.success
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  previewMeta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  }
});
