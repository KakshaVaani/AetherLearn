import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchStudentAssignedLectures } from "@/api/backend";
import { useStudentCopy } from "@/api/studentCopy";
import { studentAccessibilityVisuals, useStudentPreferences } from "@/api/studentPreferences";
import { AccessibilityBadge } from "@/components/AccessibilityBadge";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { classrooms } from "@/data/classrooms";
import { chaptersForSubject, SubjectChapter } from "@/data/subjectChapters";
import { subjects } from "@/data/subjects";
import { Lecture } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

export default function StudentSubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subject = subjects.find((item) => item.id === id) ?? subjects[0];
  const preferences = useStudentPreferences();
  const copy = useStudentCopy();
  const visuals = studentAccessibilityVisuals(preferences);
  const chapters = chaptersForSubject(subject.name);
  const [backendLectures, setBackendLectures] = useState<Lecture[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchStudentAssignedLectures()
      .then((items) => {
        if (mounted) setBackendLectures(items);
      })
      .catch(() => {
        if (mounted) setBackendLectures([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScreenContainer style={visuals.screenStyle}>
      <Header title={subject.name} subtitle={classrooms[0].title + " " + copy.classroomStream} showBack />

      <Card style={[styles.heroCard, visuals.cardStyle]}>
        <View style={styles.heroHeader}>
          <View style={[styles.subjectMark, { backgroundColor: subject.color }]}>
            <Ionicons name="library-outline" size={24} color={colors.white} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, visuals.titleTextStyle]}>{subject.name}</Text>
            <Text style={[styles.heroSubtitle, visuals.metaTextStyle]}>
              Select a chapter first, then open a topic to view teacher PDF notes and AI notes.
            </Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <Badge label={`${chapters.length} ${copy.chapters}`} tone="primary" />
          <AccessibilityBadge mode={preferences.accessibilityMode} />
          <Badge label={preferences.textSize + " text"} tone="primary" />
        </View>
      </Card>

      <View style={styles.sectionIntro}>
        <Text style={[styles.sectionTitle, visuals.titleTextStyle]}>{copy.chapters}</Text>
        <Text style={[styles.heroSubtitle, visuals.metaTextStyle]}>
          Science - Chapters - Topics - Notes
        </Text>
      </View>

      {chapters.length === 0 ? (
        <EmptyState title="Nothing posted yet" message={copy.nothingInChapter} />
      ) : null}

      {chapters.map((chapter) => (
        <ChapterCard key={chapter.id} chapter={chapter} backendLectures={backendLectures} />
      ))}
    </ScreenContainer>
  );
}

function ChapterCard({ chapter, backendLectures }: { chapter: SubjectChapter; backendLectures: Lecture[] }) {
  const preferences = useStudentPreferences();
  const visuals = studentAccessibilityVisuals(preferences);
  const syncedTopicCount = backendLectures.filter((lecture) => lecture.chapterId === chapter.id).length;
  const topicCount = Math.max(chapter.lectureIds.length, syncedTopicCount);
  const assignmentCount = chapter.assignmentIds.length;

  return (
    <Card
      onPress={() => router.push({ pathname: "/(student)/chapter/[id]", params: { id: chapter.id } })}
      style={[styles.chapterCard, visuals.cardStyle]}
    >
      <View style={styles.chapterBadge}>
        <Ionicons name="albums-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.chapterText}>
        <Text style={[styles.chapterTitle, visuals.titleTextStyle]}>{chapter.title}</Text>
        <Text style={[styles.chapterDescription, visuals.metaTextStyle]}>{chapter.description}</Text>
        <View style={styles.badgeRow}>
          <Badge label={`${topicCount} topics`} tone="primary" />
          <Badge label={`${assignmentCount} assignments`} tone="secondary" />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Card>
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
  sectionIntro: {
    gap: spacing.xs
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  chapterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  chapterBadge: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  chapterText: {
    flex: 1,
    gap: spacing.sm
  },
  chapterTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  chapterDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  }
});
