import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  lessonPackToEditPatch,
  updateTeacherLesson
} from "@/api/backend";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { useLessonPackReview } from "@/hooks/useLessonPackReview";
import { colors, radii, spacing } from "@/constants/theme";
import { LessonPack } from "@/types";
import {
  lessonOriginRoute,
  lessonStateLabel,
  resolveLessonOrigin,
  routeForPack
} from "@/utils/lessonReview";

const tabs = ["Source", "Teacher", "Student"] as const;
type EditorTab = (typeof tabs)[number];

type LessonEditorDraft = {
  title: string;
  topicTitle: string;
  sourceTopic: string;
  detectedText: string;
  diagramElements: string;
  unclearRegions: string;
  confidenceNotes: string;
  objective: string;
  keyConcepts: string;
  teachingScript: string;
  classroomActivity: string;
  worksheet: string;
  answerKey: string;
  misconceptions: string;
  differentiatedSupport: string;
  screenReaderSummary: string;
  audioStudyScript: string;
  visualDescription: string;
  stepByStepExplanation: string;
  vocabulary: string;
  steps: string;
  practiceQuestions: string;
  selfCheckAnswers: string;
};

export default function LessonEditorScreen() {
  const params = useLocalSearchParams<{
    lessonId?: string;
    classroomId?: string;
    title?: string;
    grade?: string;
    subject?: string;
    returnTo?: "source" | "teacher" | "student" | "trust";
    origin?: "classroom" | "library";
  }>();
  const { lesson, loading, notFound } = useLessonPackReview(params.lessonId);
  const [activeTab, setActiveTab] = useState<EditorTab>("Source");
  const [draft, setDraft] = useState<LessonEditorDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!lesson) return;
    setDraft(draftFromLesson(lesson));
  }, [lesson?.id]);

  if (loading || !lesson || !draft) {
    return (
      <ScreenContainer>
        <Header
          title={notFound ? "Lesson not found" : "Loading Editor"}
          subtitle={notFound ? "This lesson is not available in the current workspace." : "Fetching editable lesson notes."}
          showBack
        />
        <Card style={styles.stateCard}>
          {notFound ? (
            <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
          <Text style={styles.stateText}>
            {notFound ? "Return to the class and open a synced lesson." : "Loading editable fields..."}
          </Text>
        </Card>
      </ScreenContainer>
    );
  }

  function updateDraft(patch: Partial<LessonEditorDraft>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  const origin = resolveLessonOrigin(params.origin, params.classroomId ?? lesson.classroomId ?? undefined);
  const originClassroomId = params.classroomId ?? lesson.classroomId ?? undefined;

  function goBackToOrigin() {
    router.replace(lessonOriginRoute(origin, originClassroomId));
  }

  async function saveChanges() {
    if (!lesson || !draft) return;
    setSaving(true);
    setMessage("");
    try {
      const editedLesson = editedLessonFromDraft(lesson, draft);
      const saved = await updateTeacherLesson(
        lesson.id,
        lessonPackToEditPatch(editedLesson),
        editedLesson
      );
      router.replace({
        pathname: routeForPack(params.returnTo ?? "teacher"),
        params: {
          lessonId: saved.id,
          classroomId: saved.classroomId ?? params.classroomId,
          title: saved.title,
          grade: saved.grade,
          subject: saved.subject,
          mode: "view",
          origin
        }
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save lesson edits.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <Header
        title="Edit Lesson Notes"
        subtitle={`${lesson.title} - saving will mark this as Needs review`}
        showBack
        onBack={goBackToOrigin}
      />

      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryTitle}>{draft.title || lesson.title}</Text>
            <Text style={styles.summaryMeta}>{lesson.grade} - {lesson.subject}</Text>
          </View>
          <Badge label={lessonStateLabel(lesson)} tone={lesson.status === "Needs Review" ? "warning" : "success"} />
        </View>
        <Text style={styles.helperText}>Saved edits stay available in the lesson, but the lesson status changes to Needs review.</Text>
      </Card>

      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const selected = activeTab === tab;
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "Source" ? (
        <>
          <SectionHeader title="Source details" />
          <Card style={styles.formCard}>
            <Field label="Lesson title" value={draft.title} onChangeText={(title) => updateDraft({ title })} />
            <Field label="Topic title" value={draft.topicTitle} onChangeText={(topicTitle) => updateDraft({ topicTitle })} />
            <Field label="Detected topic" value={draft.sourceTopic} onChangeText={(sourceTopic) => updateDraft({ sourceTopic })} />
            <Field label="Detected text" value={draft.detectedText} onChangeText={(detectedText) => updateDraft({ detectedText })} multiline />
            <Field label="Diagram elements" value={draft.diagramElements} onChangeText={(diagramElements) => updateDraft({ diagramElements })} multiline />
            <Field label="Unclear regions" value={draft.unclearRegions} onChangeText={(unclearRegions) => updateDraft({ unclearRegions })} multiline />
            <Field label="Confidence notes" value={draft.confidenceNotes} onChangeText={(confidenceNotes) => updateDraft({ confidenceNotes })} multiline />
          </Card>
        </>
      ) : null}

      {activeTab === "Teacher" ? (
        <>
          <SectionHeader title="Teacher pack" />
          <Card style={styles.formCard}>
            <Field label="Learning objective" value={draft.objective} onChangeText={(objective) => updateDraft({ objective })} multiline />
            <Field label="Board plan / key concepts" value={draft.keyConcepts} onChangeText={(keyConcepts) => updateDraft({ keyConcepts })} multiline />
            <Field label="Teaching script" value={draft.teachingScript} onChangeText={(teachingScript) => updateDraft({ teachingScript })} multiline large />
            <Field label="Low-resource activity" value={draft.classroomActivity} onChangeText={(classroomActivity) => updateDraft({ classroomActivity })} multiline />
            <Field label="Worksheet questions" value={draft.worksheet} onChangeText={(worksheet) => updateDraft({ worksheet })} multiline />
            <Field label="Answer key" value={draft.answerKey} onChangeText={(answerKey) => updateDraft({ answerKey })} multiline />
            <Field label="Misconceptions / review checklist" value={draft.misconceptions} onChangeText={(misconceptions) => updateDraft({ misconceptions })} multiline />
            <Field label="Differentiated support" value={draft.differentiatedSupport} onChangeText={(differentiatedSupport) => updateDraft({ differentiatedSupport })} multiline />
          </Card>
        </>
      ) : null}

      {activeTab === "Student" ? (
        <>
          <SectionHeader title="Student access pack" />
          <Card style={styles.formCard}>
            <Field label="Screen-reader summary" value={draft.screenReaderSummary} onChangeText={(screenReaderSummary) => updateDraft({ screenReaderSummary })} multiline large />
            <Field label="Audio script" value={draft.audioStudyScript} onChangeText={(audioStudyScript) => updateDraft({ audioStudyScript })} multiline large />
            <Field label="Visual description" value={draft.visualDescription} onChangeText={(visualDescription) => updateDraft({ visualDescription })} multiline />
            <Field label="Step-by-step explanation" value={draft.stepByStepExplanation} onChangeText={(stepByStepExplanation) => updateDraft({ stepByStepExplanation })} multiline large />
            <Field label="Vocabulary (term: meaning)" value={draft.vocabulary} onChangeText={(vocabulary) => updateDraft({ vocabulary })} multiline />
            <Field label="Revision checklist" value={draft.steps} onChangeText={(steps) => updateDraft({ steps })} multiline />
            <Field label="Practice questions" value={draft.practiceQuestions} onChangeText={(practiceQuestions) => updateDraft({ practiceQuestions })} multiline />
            <Field label="Self-check answers" value={draft.selfCheckAnswers} onChangeText={(selfCheckAnswers) => updateDraft({ selfCheckAnswers })} multiline />
          </Card>
        </>
      ) : null}

      {message ? <Text style={styles.errorText}>{message}</Text> : null}

      <View style={styles.actions}>
        <AppButton
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          style={styles.actionButton}
        />
        <AppButton
          title="Save Edits"
          loading={saving}
          leftIcon={<Ionicons name="save-outline" size={20} color={colors.white} />}
          onPress={saveChanges}
          style={styles.actionButton}
        />
      </View>
    </ScreenContainer>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  large
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  large?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.textArea, large && styles.largeArea]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

function linesToText(items: string[]) {
  return items.join("\n");
}

function textToLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function vocabularyToText(vocabulary: LessonPack["studentAccessPack"]["vocabulary"]) {
  return vocabulary.map((item) => `${item.term}: ${item.meaning}`).join("\n");
}

function textToVocabulary(value: string): LessonPack["studentAccessPack"]["vocabulary"] {
  return textToLines(value).map((line) => {
    const [term, ...meaningParts] = line.split(":");
    const cleanTerm = term.trim();
    const meaning = meaningParts.join(":").trim();
    return {
      term: cleanTerm,
      meaning: meaning || "Review in lesson context."
    };
  }).filter((item) => item.term.length > 0);
}

function draftFromLesson(lesson: LessonPack): LessonEditorDraft {
  return {
    title: lesson.title,
    topicTitle: lesson.topicTitle ?? lesson.sourceCard.topic,
    sourceTopic: lesson.sourceCard.topic,
    detectedText: linesToText(lesson.sourceCard.detectedText),
    diagramElements: linesToText(lesson.sourceCard.diagramElements),
    unclearRegions: linesToText(lesson.sourceCard.unclearRegions),
    confidenceNotes: linesToText(lesson.sourceCard.confidenceNotes),
    objective: lesson.teacherPack.objective,
    keyConcepts: linesToText(lesson.teacherPack.keyConcepts),
    teachingScript: lesson.teacherPack.teachingScript,
    classroomActivity: lesson.teacherPack.classroomActivity,
    worksheet: linesToText(lesson.teacherPack.worksheet),
    answerKey: linesToText(lesson.teacherPack.answerKey),
    misconceptions: linesToText(lesson.teacherPack.misconceptions),
    differentiatedSupport: lesson.teacherPack.differentiatedSupport,
    screenReaderSummary: lesson.studentAccessPack.screenReaderSummary,
    audioStudyScript: lesson.studentAccessPack.audioStudyScript,
    visualDescription: lesson.studentAccessPack.visualDescription,
    stepByStepExplanation: lesson.studentAccessPack.stepByStepExplanation,
    vocabulary: vocabularyToText(lesson.studentAccessPack.vocabulary),
    steps: linesToText(lesson.studentAccessPack.steps),
    practiceQuestions: linesToText(lesson.studentAccessPack.practiceQuestions),
    selfCheckAnswers: linesToText(lesson.studentAccessPack.selfCheckAnswers)
  };
}

function editedLessonFromDraft(lesson: LessonPack, draft: LessonEditorDraft): LessonPack {
  const title = draft.title.trim() || lesson.title;
  const topicTitle = draft.topicTitle.trim() || draft.sourceTopic.trim() || (lesson.topicTitle ?? title);
  const sourceTopic = draft.sourceTopic.trim() || topicTitle;

  return {
    ...lesson,
    title,
    topicTitle,
    status: "Needs Review",
    sourceCard: {
      ...lesson.sourceCard,
      topic: sourceTopic,
      detectedText: textToLines(draft.detectedText),
      diagramElements: textToLines(draft.diagramElements),
      unclearRegions: textToLines(draft.unclearRegions),
      confidenceNotes: textToLines(draft.confidenceNotes)
    },
    teacherPack: {
      ...lesson.teacherPack,
      objective: draft.objective.trim(),
      keyConcepts: textToLines(draft.keyConcepts),
      teachingScript: draft.teachingScript.trim(),
      classroomActivity: draft.classroomActivity.trim(),
      worksheet: textToLines(draft.worksheet),
      answerKey: textToLines(draft.answerKey),
      misconceptions: textToLines(draft.misconceptions),
      differentiatedSupport: draft.differentiatedSupport.trim()
    },
    studentAccessPack: {
      ...lesson.studentAccessPack,
      screenReaderSummary: draft.screenReaderSummary.trim(),
      audioStudyScript: draft.audioStudyScript.trim(),
      visualDescription: draft.visualDescription.trim(),
      stepByStepExplanation: draft.stepByStepExplanation.trim(),
      vocabulary: textToVocabulary(draft.vocabulary),
      steps: textToLines(draft.steps),
      practiceQuestions: textToLines(draft.practiceQuestions),
      selfCheckAnswers: textToLines(draft.selfCheckAnswers)
    },
    trustPack: {
      ...lesson.trustPack,
      teacherReviewStatus: "Review Required",
      accessibilityWarnings: Array.from(
        new Set([
          ...lesson.trustPack.accessibilityWarnings,
          "Edited by teacher; review before sharing."
        ])
      )
    },
    safetyFlags: {
      ...lesson.safetyFlags,
      teacherReviewRequired: true
    }
  };
}

const styles = StyleSheet.create({
  stateCard: {
    alignItems: "center",
    gap: spacing.md
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center"
  },
  summaryCard: {
    gap: spacing.md
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  summaryMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: spacing.xs
  },
  helperText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  tabRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  tab: {
    flex: 1,
    minHeight: 46,
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
  tabText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  tabTextSelected: {
    color: colors.primaryDark
  },
  formCard: {
    gap: spacing.md
  },
  field: {
    gap: spacing.xs
  },
  label: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  input: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  textArea: {
    minHeight: 104
  },
  largeArea: {
    minHeight: 150
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  },
  actionButton: {
    flex: 1
  }
});
