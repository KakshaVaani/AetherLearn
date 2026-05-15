import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { assignments } from "@/data/assignments";
import { classrooms } from "@/data/classrooms";
import { lectures } from "@/data/lectures";
import { subjects } from "@/data/subjects";
import { currentStudent } from "@/data/users";
import { Assignment, Lecture } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

type FeedFilter = "All" | "Notes" | "Assignments";
type FeedItem =
  | { id: string; type: "note"; postedAt: string; lecture: Lecture }
  | { id: string; type: "assignment"; postedAt: string; assignment: Assignment };

const filters: FeedFilter[] = ["All", "Notes", "Assignments"];

export default function StudentSubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subject = subjects.find((item) => item.id === id) ?? subjects[0];
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("All");
  const [generatedLectureIds, setGeneratedLectureIds] = useState<string[]>([]);

  const feedItems = useMemo(() => {
    const noteItems: FeedItem[] = lectures
      .filter((lecture) => lecture.subject === subject.name)
      .map((lecture) => ({
        id: "note-" + lecture.id,
        type: "note",
        postedAt: lecture.postedAt,
        lecture
      }));
    const assignmentItems: FeedItem[] = assignments
      .filter((assignment) => assignment.subject === subject.name)
      .map((assignment) => ({
        id: "assignment-" + assignment.id,
        type: "assignment",
        postedAt: assignment.postedAt,
        assignment
      }));

    return [...noteItems, ...assignmentItems].sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    );
  }, [subject.name]);

  const filteredItems = feedItems.filter((item) => {
    if (activeFilter === "Notes") {
      return item.type === "note";
    }
    if (activeFilter === "Assignments") {
      return item.type === "assignment";
    }
    return true;
  });

  function generateNotes(lectureId: string) {
    // Later: request student-specific notes from FastAPI/Gemma 4 and cache them locally with SQLite.
    setGeneratedLectureIds((current) =>
      current.includes(lectureId) ? current : [...current, lectureId]
    );
  }

  return (
    <ScreenContainer>
      <Header title={subject.name} subtitle={classrooms[0].title + " classroom stream"} showBack />

      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={[styles.subjectMark, { backgroundColor: subject.color }]}>
            <Ionicons name="library-outline" size={24} color={colors.white} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{subject.name}</Text>
            <Text style={styles.heroSubtitle}>
              Latest teacher PDFs and assignments appear first. Filter when you want a focused view.
            </Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <Badge label={subject.badge ?? "Local mode ready"} tone="success" />
          <AccessibilityBadge mode={currentStudent.accessibilityMode ?? "Standard"} />
        </View>
      </Card>

      <View style={styles.filterRow}>
        {filters.map((filter) => {
          const selected = activeFilter === filter;
          return (
            <Pressable
              key={filter}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter}</Text>
            </Pressable>
          );
        })}
      </View>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="Nothing posted yet"
          message="Teacher notes and assignments for this subject will appear here."
        />
      ) : null}

      {filteredItems.map((item) =>
        item.type === "note" ? (
          <NotePost
            key={item.id}
            lecture={item.lecture}
            generated={generatedLectureIds.includes(item.lecture.id)}
            onGenerate={() => generateNotes(item.lecture.id)}
          />
        ) : (
          <AssignmentPost key={item.id} assignment={item.assignment} />
        )
      )}
    </ScreenContainer>
  );
}

type NotePostProps = {
  lecture: Lecture;
  generated: boolean;
  onGenerate: () => void;
};

function NotePost({ lecture, generated, onGenerate }: NotePostProps) {
  const mode = currentStudent.accessibilityMode ?? "Standard";
  const aiNotes = getPersonalizedNotes(lecture);

  return (
    <Card style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postIcon}>
          <Ionicons name="document-text-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.postText}>
          <Text style={styles.postEyebrow}>Teacher uploaded PDF notes</Text>
          <Text style={styles.postTitle}>{lecture.title}</Text>
          <Text style={styles.postMeta}>Posted {formatDate(lecture.postedAt)}</Text>
        </View>
      </View>

      <View style={styles.pdfBox}>
        <Ionicons name="document-attach-outline" size={22} color={colors.danger} />
        <View style={styles.pdfText}>
          <Text style={styles.pdfName}>{lecture.teacherPdf.fileName}</Text>
          <Text style={styles.postMeta}>
            {lecture.teacherPdf.pageCount} pages - uploaded {lecture.teacherPdf.uploadedAt}
          </Text>
        </View>
      </View>

      <View style={styles.noteSection}>
        <Text style={styles.sectionLabel}>Teacher notes</Text>
        <Text style={styles.noteBody}>{lecture.teacherNotes}</Text>
      </View>

      {generated ? (
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <AccessibilityBadge mode={mode} />
            <Badge label="AI notes ready" tone="success" />
          </View>
          <Text style={styles.sectionLabel}>Your AI notes</Text>
          <Text style={styles.noteBody}>{aiNotes}</Text>
        </View>
      ) : (
        <AppButton
          title="Generate AI Notes"
          variant="outline"
          leftIcon={<Ionicons name="sparkles-outline" size={20} color={colors.text} />}
          onPress={onGenerate}
        />
      )}

      <View style={styles.postActions}>
        <AppButton
          title="Open Lesson"
          variant="ghost"
          fullWidth={false}
          leftIcon={<Ionicons name="book-outline" size={18} color={colors.primary} />}
          onPress={() => router.push({ pathname: "/(student)/lesson/[id]", params: { id: lecture.id } })}
        />
        <AppButton
          title="Audio"
          variant="ghost"
          fullWidth={false}
          leftIcon={<Ionicons name="play-circle-outline" size={18} color={colors.primary} />}
          onPress={() => router.push({ pathname: "/(student)/audio/[id]", params: { id: lecture.id } })}
        />
      </View>
    </Card>
  );
}

type AssignmentPostProps = {
  assignment: Assignment;
};

function AssignmentPost({ assignment }: AssignmentPostProps) {
  const modeTone = assignment.answerMode === "mcq" ? "secondary" : "primary";

  return (
    <Card style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={[styles.postIcon, styles.assignmentIcon]}>
          <Ionicons name="clipboard-outline" size={22} color={colors.secondary} />
        </View>
        <View style={styles.postText}>
          <Text style={[styles.postEyebrow, styles.assignmentEyebrow]}>Teacher posted assignment</Text>
          <Text style={styles.postTitle}>{assignment.title}</Text>
          <Text style={styles.postMeta}>Posted {formatDate(assignment.postedAt)}</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <Badge label={assignment.answerMode === "mcq" ? "MCQ" : "Text answer"} tone={modeTone} />
        <Badge label={assignment.status} tone={assignment.status === "Published" ? "success" : "warning"} />
      </View>
      <Text style={styles.noteBody}>Linked lecture: {assignment.linkedLecture}</Text>
      <Text style={styles.dueText}>Due {assignment.dueDate}</Text>
      <AppButton
        title="Open Assignment"
        onPress={() => router.push({ pathname: "/(student)/assignment/[id]", params: { id: assignment.id } })}
      />
    </Card>
  );
}

function getPersonalizedNotes(lecture: Lecture) {
  const mode = currentStudent.accessibilityMode ?? "Standard";

  switch (mode) {
    case "Blind / Low Vision":
      return lecture.outputs.blindLowVision;
    case "Dyslexia Friendly":
      return lecture.outputs.dyslexiaFriendly;
    case "Multilingual":
      return lecture.outputs.multilingual;
    case "Slow Learner":
      return lecture.outputs.slowLearner;
    case "Standard":
    default:
      return lecture.outputs.standard;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  subjectMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  heroText: {
    flex: 1,
    gap: spacing.xs
  },
  heroTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900"
  },
  heroSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  filterChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  filterChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  filterText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  filterTextSelected: {
    color: colors.primaryDark
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
  dueText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
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
  postActions: {
    flexDirection: "row",
    gap: spacing.sm
  }
});
