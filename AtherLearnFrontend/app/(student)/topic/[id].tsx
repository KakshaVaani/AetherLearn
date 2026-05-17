import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  generateStudentNote,
  GeneratedStudentNote,
  getGeneratedStudentNote
} from "@/api/generatedNotes";
import { useDefaultModelPreference } from "@/api/localPreferences";
import {
  downloadPdf,
  generatedNotesPdf,
  openPdf,
  uploadedSourcePdf
} from "@/api/pdfDocuments";
import { useStudentCopy } from "@/api/studentCopy";
import {
  studentAccessibilityVisuals,
  studentTextMetrics,
  useStudentPreferences
} from "@/api/studentPreferences";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ModelModeSelector } from "@/components/ModelModeSelector";
import { ScreenContainer } from "@/components/ScreenContainer";
import { assignments } from "@/data/assignments";
import { lectures } from "@/data/lectures";
import { chapterForLecture } from "@/data/subjectChapters";
import { Assignment, Lecture } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

export default function StudentTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lecture = lectures.find((item) => item.id === id) ?? lectures[0];
  const preferences = useStudentPreferences();
  const visuals = studentAccessibilityVisuals(preferences);
  const copy = useStudentCopy();
  const parentChapter = chapterForLecture(lecture.id);
  const linkedAssignments = assignments.filter((assignment) => assignment.linkedLecture === lecture.title);

  return (
    <ScreenContainer style={visuals.screenStyle}>
      <Header
        title={lecture.title}
        subtitle={lecture.subject + " topic"}
        showBack
        onBack={() =>
          router.replace({
            pathname: "/(student)/chapter/[id]",
            params: { id: parentChapter?.id ?? "science-plants" }
          })
        }
      />
      <TopicNotes lecture={lecture} />

      {linkedAssignments.length > 0 ? (
        <View style={styles.assignmentBlock}>
          <Text style={[styles.sectionTitle, visuals.titleTextStyle]}>{copy.assignments}</Text>
          {linkedAssignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function TopicNotes({ lecture }: { lecture: Lecture }) {
  const preferences = useStudentPreferences();
  const visuals = studentAccessibilityVisuals(preferences);
  const metrics = studentTextMetrics(preferences.textSize);
  const copy = useStudentCopy();
  const [generatedNote, setGeneratedNote] = useState<GeneratedStudentNote | null>(() =>
    getGeneratedStudentNote(lecture.id, preferences)
  );
  const [generating, setGenerating] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [modelPreference, setModelPreference] = useDefaultModelPreference();

  useEffect(() => {
    setGeneratedNote(getGeneratedStudentNote(lecture.id, preferences));
  }, [
    lecture.id,
    preferences.accessibilityMode,
    preferences.language,
    preferences.textSize,
    preferences.audioSupport
  ]);

  async function handleGenerate() {
    setGenerating(true);
    setNoteError("");
    try {
      const next = await generateStudentNote(lecture, preferences, { modelPreference });
      setGeneratedNote(next);
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Could not generate notes with the selected model."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function openUploadedPdf() {
    await openPdf(uploadedSourcePdf(lecture));
  }

  async function downloadUploadedPdf() {
    await downloadPdf(uploadedSourcePdf(lecture));
  }

  async function openNotesPdf() {
    if (!generatedNote) return;
    await openPdf(generatedNotesPdf(lecture.title, generatedNote.text));
  }

  async function downloadNotesPdf() {
    if (!generatedNote) return;
    await downloadPdf(generatedNotesPdf(lecture.title, generatedNote.text));
  }

  return (
    <Card style={[styles.postCard, visuals.readingCardStyle]}>
      <View style={styles.postHeader}>
        <View style={styles.postIcon}>
          <Ionicons name="document-text-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.postText}>
          <Text style={[styles.postEyebrow, visuals.metaTextStyle]}>{copy.teacherUploaded}</Text>
          <Text style={[styles.postTitle, { fontSize: metrics.titleFontSize, lineHeight: metrics.titleLineHeight }]}>
            {lecture.title}
          </Text>
          <Text style={[styles.postMeta, { fontSize: metrics.metaFontSize, lineHeight: metrics.metaLineHeight }]}>
            Posted {formatDate(lecture.postedAt)}
          </Text>
        </View>
      </View>

      <View style={[styles.pdfBox, visuals.cardStyle]}>
        <Ionicons name="document-attach-outline" size={22} color={colors.danger} />
        <View style={styles.pdfText}>
          <Text style={[styles.pdfName, visuals.titleTextStyle]}>{lecture.teacherPdf.fileName}</Text>
          <Text style={[styles.postMeta, { fontSize: metrics.metaFontSize, lineHeight: metrics.metaLineHeight }]}>
            {lecture.teacherPdf.pageCount} pages - uploaded {lecture.teacherPdf.uploadedAt}
          </Text>
        </View>
        <View style={styles.pdfActions}>
          <Pressable accessibilityRole="button" onPress={openUploadedPdf} style={styles.iconAction}>
            <Ionicons name="open-outline" size={18} color={colors.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={downloadUploadedPdf} style={styles.iconAction}>
            <Ionicons name="download-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.noteSection}>
        <Text style={[styles.sectionLabel, visuals.titleTextStyle]}>{copy.teacherNotes}</Text>
        <Text style={[styles.noteBody, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}>
          {lecture.teacherNotes}
        </Text>
      </View>

      <ModelModeSelector
        value={modelPreference}
        onChange={setModelPreference}
        label="Notes model"
        compact
      />

      {noteError ? <Text style={styles.errorText}>{noteError}</Text> : null}

      {generatedNote ? (
        <View style={[styles.aiSection, visuals.cardStyle]}>
          <View style={styles.aiHeader}>
            <AccessibilityBadge mode={preferences.accessibilityMode} />
            <Badge label={`AI notes v${generatedNote.version}`} tone="success" />
            {preferences.accessibilityMode === "Multilingual" ? (
              <Badge label={preferences.language} tone="secondary" />
            ) : null}
          </View>
          <Text style={[styles.sectionLabel, visuals.titleTextStyle]}>{copy.yourAiNotes}</Text>
          <Text style={[styles.noteBody, { fontSize: metrics.bodyFontSize, lineHeight: metrics.bodyLineHeight }]}>
            {generatedNote.text}
          </Text>
          <Text style={[styles.generatedMeta, visuals.metaTextStyle]}>
            Generated {formatDateTime(generatedNote.generatedAt)}
          </Text>
          <View style={styles.notesActions}>
            <AppButton
              title={copy.openPdf}
              variant="outline"
              fullWidth={false}
              leftIcon={<Ionicons name="open-outline" size={18} color={colors.text} />}
              onPress={openNotesPdf}
              style={styles.compactAction}
            />
            <AppButton
              title={copy.downloadPdf}
              variant="outline"
              fullWidth={false}
              leftIcon={<Ionicons name="download-outline" size={18} color={colors.text} />}
              onPress={downloadNotesPdf}
              style={styles.compactAction}
            />
          </View>
          <AppButton
            title={copy.regenerateNotes}
            variant="outline"
            loading={generating}
            leftIcon={<Ionicons name="refresh-outline" size={20} color={colors.text} />}
            onPress={handleGenerate}
          />
        </View>
      ) : (
        <AppButton
          title={copy.generateNotes}
          variant="outline"
          loading={generating}
          leftIcon={<Ionicons name="sparkles-outline" size={20} color={colors.text} />}
          onPress={handleGenerate}
        />
      )}

      <View style={styles.postActions}>
        <AppButton
          title={copy.openLesson}
          variant="ghost"
          fullWidth={false}
          leftIcon={<Ionicons name="book-outline" size={18} color={colors.primary} />}
          onPress={() => router.push({ pathname: "/(student)/lesson/[id]", params: { id: lecture.id } })}
        />
        {preferences.audioSupport ? (
          <AppButton
            title={copy.audio}
            variant="ghost"
            fullWidth={false}
            leftIcon={<Ionicons name="play-circle-outline" size={18} color={colors.primary} />}
            onPress={() => router.push({ pathname: "/(student)/audio/[id]", params: { id: lecture.id } })}
          />
        ) : null}
      </View>
    </Card>
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const copy = useStudentCopy();
  const modeTone = assignment.answerMode === "mcq" ? "secondary" : "primary";

  return (
    <Card style={styles.assignmentCard}>
      <View style={styles.postHeader}>
        <View style={[styles.postIcon, styles.assignmentIcon]}>
          <Ionicons name="clipboard-outline" size={22} color={colors.secondary} />
        </View>
        <View style={styles.postText}>
          <Text style={[styles.postEyebrow, styles.assignmentEyebrow]}>{copy.teacherAssignment}</Text>
          <Text style={styles.postTitle}>{assignment.title}</Text>
          <Text style={styles.postMeta}>Due {assignment.dueDate}</Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        <Badge label={assignment.answerMode === "mcq" ? "MCQ" : "Text answer"} tone={modeTone} />
        <Badge label={assignment.status} tone={assignment.status === "Published" ? "success" : "warning"} />
      </View>
      <AppButton
        title={copy.openAssignment}
        onPress={() => router.push({ pathname: "/(student)/assignment/[id]", params: { id: assignment.id } })}
      />
    </Card>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}

const styles = StyleSheet.create({
  assignmentBlock: {
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  postCard: {
    gap: spacing.lg
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  postIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  assignmentIcon: {
    backgroundColor: colors.secondarySoft
  },
  postText: {
    flex: 1,
    gap: spacing.xs
  },
  postEyebrow: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900"
  },
  assignmentEyebrow: {
    color: colors.secondary
  },
  postTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  postMeta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  pdfBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md
  },
  pdfText: {
    flex: 1,
    gap: 2
  },
  pdfActions: {
    flexDirection: "row",
    gap: spacing.xs
  },
  iconAction: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  pdfName: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  noteSection: {
    gap: spacing.sm
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  noteBody: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "600"
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700"
  },
  aiSection: {
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.background,
    padding: spacing.lg
  },
  aiHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  generatedMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  },
  notesActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  compactAction: {
    flex: 1,
    minWidth: 132,
    paddingHorizontal: spacing.sm
  },
  postActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  assignmentCard: {
    gap: spacing.md
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
