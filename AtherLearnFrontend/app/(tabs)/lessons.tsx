import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiClientError } from "@/api/client";
import { deleteTeacherLesson, fetchTeacherDashboard } from "@/api/backend";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { LessonThumbnail } from "@/components/LessonThumbnail";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { lessonPacks } from "@/data/lessonPacks";
import { Classroom, LessonPack, LessonStatus } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

type FilterKey = "classroom" | "grade" | "subject" | "status";
type LessonDataSource = "backend" | "local" | "demo";

const filterLabels: Record<FilterKey, string> = {
  classroom: "Class",
  grade: "Grade",
  subject: "Subject",
  status: "Status"
};

function statusTone(status: LessonStatus) {
  if (status === "Approved" || status === "Exported") return "success" as const;
  if (status === "Needs Review") return "warning" as const;
  return "neutral" as const;
}

function gradeFilterValue(grade: string) {
  const number = grade.match(/\d+/);
  if (number) return number[0];
  const cleaned = grade.replace(/grade|class/gi, "").trim();
  return cleaned || grade.trim();
}

function fallbackClassroomLabel(classroomId?: string | null) {
  if (!classroomId) return "Unassigned";
  const canonical = classroomId.match(/^class-(\d+)([a-z])$/i);
  if (canonical) return `Class ${canonical[1]}${canonical[2].toUpperCase()}`;
  return classroomId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function LessonsScreen() {
  const [lessons, setLessons] = useState<LessonPack[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [dataSource, setDataSource] = useState<LessonDataSource>("demo");
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "warning">("success");
  const [search, setSearch] = useState("");
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState("All");
  const [selectedGrade, setSelectedGrade] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<LessonStatus | "All">("All");

  const classroomNameById = useMemo(() => {
    const names = new Map<string, string>();
    classrooms.forEach((classroom) => {
      names.set(classroom.id, classroom.title);
    });
    lessons.forEach((lesson) => {
      if (lesson.classroomId && !names.has(lesson.classroomId)) {
        names.set(lesson.classroomId, fallbackClassroomLabel(lesson.classroomId));
      }
    });
    return names;
  }, [classrooms, lessons]);

  const classroomLabel = useCallback(
    (classroomId?: string | null) => {
      if (!classroomId) return "Unassigned";
      return classroomNameById.get(classroomId) ?? fallbackClassroomLabel(classroomId);
    },
    [classroomNameById]
  );

  const filterOptions = useMemo(
    () => ({
      classroom: [
        "All",
        ...Array.from(new Set(lessons.map((lesson) => lesson.classroomId).filter((id): id is string => Boolean(id))))
          .sort((a, b) => classroomLabel(a).localeCompare(classroomLabel(b)))
      ],
      grade: ["All", ...Array.from(new Set(lessons.map((lesson) => gradeFilterValue(lesson.grade))))],
      subject: ["All", ...Array.from(new Set(lessons.map((lesson) => lesson.subject)))],
      status: ["All", "Draft", "Needs Review", "Approved", "Exported"] as Array<LessonStatus | "All">
    }),
    [classroomLabel, lessons]
  );

  const visibleLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        const lessonClassroom = classroomLabel(lesson.classroomId);
        const matchesSearch = `${lesson.title} ${lesson.subject} ${lesson.grade} ${lesson.learnerNeed} ${lessonClassroom}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesClassroom = selectedClassroom === "All" || lesson.classroomId === selectedClassroom;
        const matchesGrade = selectedGrade === "All" || gradeFilterValue(lesson.grade) === selectedGrade;
        const matchesSubject = selectedSubject === "All" || lesson.subject === selectedSubject;
        const matchesStatus = selectedStatus === "All" || lesson.status === selectedStatus;

        return matchesSearch && matchesClassroom && matchesGrade && matchesSubject && matchesStatus;
      }),
    [classroomLabel, lessons, search, selectedClassroom, selectedGrade, selectedSubject, selectedStatus]
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTeacherDashboard()
      .then((dashboard) => {
        if (!mounted) return;
        setLessons(dashboard.lessons.length > 0 ? dashboard.lessons : lessonPacks);
        setClassrooms(dashboard.classes);
        setConnected(dashboard.source === "backend");
        setDataSource(dashboard.source);
      })
      .catch(() => {
        if (!mounted) return;
        setConnected(false);
        setDataSource("demo");
        setLessons(lessonPacks);
        setClassrooms([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function selectedValue(key: FilterKey) {
    if (key === "classroom") return selectedClassroom;
    if (key === "grade") return selectedGrade;
    if (key === "subject") return selectedSubject;
    return selectedStatus;
  }

  function setSelectedValue(key: FilterKey, value: string) {
    if (key === "classroom") setSelectedClassroom(value);
    if (key === "grade") setSelectedGrade(value);
    if (key === "subject") setSelectedSubject(value);
    if (key === "status") setSelectedStatus(value as LessonStatus | "All");
    setOpenFilter(null);
  }

  function displayValue(key: FilterKey, value: string) {
    if (key === "classroom") return value === "All" ? "All" : classroomLabel(value);
    return value;
  }

  async function confirmDeleteLesson(title: string) {
    const maybeWindow = globalThis as typeof globalThis & { confirm?: (message: string) => boolean };
    if (typeof maybeWindow.confirm === "function") {
      return maybeWindow.confirm(`Delete "${title}"? This action cannot be undone.`);
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Delete lesson?",
        `Delete "${title}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Delete", style: "destructive", onPress: () => resolve(true) }
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  }

  async function handleDeleteLesson(lesson: LessonPack) {
    if (deletingLessonId) return;
    const confirmed = await confirmDeleteLesson(lesson.title);
    if (!confirmed) return;

    setDeletingLessonId(lesson.id);
    setMessage("");
    try {
      if (connected) {
        await deleteTeacherLesson(lesson.id);
      }
      setLessons((current) => current.filter((item) => item.id !== lesson.id));
      setMessageTone("success");
      setMessage(
        connected
          ? `Deleted "${lesson.title}".`
          : `Deleted "${lesson.title}" from local demo data.`
      );
    } catch (error) {
      setMessageTone("warning");
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Could not delete this lesson. Please try again."
      );
    } finally {
      setDeletingLessonId(null);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Lesson Library</Text>
          <Text style={styles.subtitle}>
            {connected
              ? "Synced backend lesson packs"
              : dataSource === "local"
                ? "Saved local lesson packs"
                : "Demo fallback lesson packs"}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filter lessons" style={styles.iconButton}>
          <Ionicons name="filter-outline" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search lessons..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        {(Object.keys(filterLabels) as FilterKey[]).map((key) => {
          const selected = selectedValue(key);

          return (
            <View key={key} style={styles.filterControl}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: openFilter === key }}
                onPress={() => setOpenFilter((current) => (current === key ? null : key))}
                style={[styles.filterChip, selected !== "All" && styles.filterChipActive]}
              >
                <Text style={styles.filterText}>
                  {filterLabels[key]}: {displayValue(key, selected)}
                </Text>
                <Ionicons name={openFilter === key ? "chevron-up" : "chevron-down"} size={14} color={colors.muted} />
              </Pressable>
              {openFilter === key ? (
                <View style={styles.optionPanel}>
                  {filterOptions[key].map((option) => (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      onPress={() => setSelectedValue(key, option)}
                      style={[styles.optionRow, option === selected && styles.optionRowSelected]}
                    >
                      <Text style={[styles.optionText, option === selected && styles.optionTextSelected]}>
                        {displayValue(key, option)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {message ? (
        <Text style={[styles.message, messageTone === "success" ? styles.successText : styles.warningText]}>
          {message}
        </Text>
      ) : null}

      <SectionHeader
        title="Lessons"
        subtitle={loading ? "Loading synced lessons..." : `${visibleLessons.length} of ${lessons.length} visible`}
      />
      {loading ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading lesson library...</Text>
          <Text style={styles.emptyBody}>Fetching the backend lessons for all demo classes.</Text>
        </Card>
      ) : null}
      {!loading && visibleLessons.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No lessons match these filters</Text>
          <Text style={styles.emptyBody}>Clear the class, grade, subject, or status filters to see the full library.</Text>
        </Card>
      ) : null}
      {!loading && visibleLessons.map((lesson) => (
        <Card
          key={lesson.id}
          onPress={() =>
            router.push({
              pathname: "/source-understanding",
              params: {
                lessonId: lesson.id,
                classroomId: lesson.classroomId ?? undefined,
                title: lesson.title,
                grade: lesson.grade,
                subject: lesson.subject,
                mode: "view",
                origin: "library"
              }
            })
          }
          style={styles.lessonCard}
        >
          <LessonThumbnail lesson={lesson} size="medium" />
          <View style={styles.lessonText}>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            <Text style={styles.lessonMeta}>
              {classroomLabel(lesson.classroomId)} - {lesson.grade} - {lesson.subject} - {lesson.language}
            </Text>
            <Text style={styles.lessonMeta}>Learner need: {lesson.learnerNeed}</Text>
            <Text numberOfLines={2} style={styles.lessonMeta}>
              Output: {lesson.outputType}
            </Text>
            <View style={styles.badges}>
              <Badge label={lesson.runtimeMode} tone="primary" />
              <Badge label={lesson.status} tone={statusTone(lesson.status)} />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${lesson.title}`}
            disabled={deletingLessonId === lesson.id}
            onPress={(event) => {
              event.stopPropagation();
              void handleDeleteLesson(lesson);
            }}
            style={styles.deleteButton}
          >
            <Ionicons
              name={deletingLessonId === lesson.id ? "hourglass-outline" : "trash-outline"}
              size={18}
              color={deletingLessonId === lesson.id ? colors.muted : colors.danger}
            />
          </Pressable>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  searchBox: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  filterControl: {
    position: "relative",
    zIndex: 2
  },
  filterChip: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  filterText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  optionPanel: {
    width: 190,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.xs,
    gap: spacing.xs,
    marginTop: spacing.xs,
    ...{
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3
    }
  },
  optionRow: {
    minHeight: 36,
    borderRadius: radii.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  optionRowSelected: {
    backgroundColor: colors.primarySoft
  },
  optionText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  optionTextSelected: {
    color: colors.primaryDark
  },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  lessonText: {
    flex: 1,
    gap: spacing.xs
  },
  lessonTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  lessonMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16
  },
  emptyCard: {
    gap: spacing.xs,
    padding: spacing.md
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  successText: {
    color: colors.success
  },
  warningText: {
    color: colors.warning
  }
});
