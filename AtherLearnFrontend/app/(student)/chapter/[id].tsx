import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStudentCopy } from "@/api/studentCopy";
import { studentAccessibilityVisuals, useStudentPreferences } from "@/api/studentPreferences";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { assignments } from "@/data/assignments";
import { lectures } from "@/data/lectures";
import { chapterById } from "@/data/subjectChapters";
import { subjects } from "@/data/subjects";
import { Lecture } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

export default function StudentChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chapter = chapterById(id ?? "") ?? chapterById("science-plants");
  const preferences = useStudentPreferences();
  const copy = useStudentCopy();
  const visuals = studentAccessibilityVisuals(preferences);
  const parentSubject = subjects.find((subject) => subject.name === chapter?.subject);
  const chapterLectures = (chapter?.lectureIds ?? [])
    .map((lectureId) => lectures.find((lecture) => lecture.id === lectureId))
    .filter((lecture): lecture is Lecture => Boolean(lecture));

  return (
    <ScreenContainer style={visuals.screenStyle}>
      <Header
        title={chapter?.title ?? "Chapter"}
        subtitle={chapter?.subject ?? copy.chapters}
        showBack
        onBack={() =>
          router.replace({
            pathname: "/(student)/subject/[id]",
            params: { id: parentSubject?.id ?? "science" }
          })
        }
      />

      <Card style={[styles.heroCard, visuals.cardStyle]}>
        <View style={styles.heroIcon}>
          <Ionicons name="albums-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, visuals.titleTextStyle]}>{chapter?.title}</Text>
          <Text style={[styles.heroSubtitle, visuals.metaTextStyle]}>{chapter?.description}</Text>
        </View>
      </Card>

      <View style={styles.sectionIntro}>
        <Text style={[styles.sectionTitle, visuals.titleTextStyle]}>Topics</Text>
        <Text style={[styles.heroSubtitle, visuals.metaTextStyle]}>
          Open a topic to view teacher uploaded PDF notes, AI notes, and linked work.
        </Text>
      </View>

      {chapterLectures.length === 0 ? (
        <EmptyState title="No topics yet" message={copy.nothingInChapter} />
      ) : null}

      {chapterLectures.map((lecture) => (
        <TopicCard key={lecture.id} lecture={lecture} />
      ))}
    </ScreenContainer>
  );
}

function TopicCard({ lecture }: { lecture: Lecture }) {
  const preferences = useStudentPreferences();
  const visuals = studentAccessibilityVisuals(preferences);
  const linkedAssignments = assignments.filter((assignment) => assignment.linkedLecture === lecture.title);

  return (
    <Card
      onPress={() =>
        router.push({
          pathname: "/(student)/topic/[id]",
          params: { id: lecture.id }
        })
      }
      style={[styles.topicCard, visuals.cardStyle]}
    >
      <View style={styles.topicIcon}>
        <Ionicons name="document-text-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.topicText}>
        <Text style={[styles.topicEyebrow, visuals.metaTextStyle]}>Topic</Text>
        <Text style={[styles.topicTitle, visuals.titleTextStyle]}>{lecture.title}</Text>
        <Text style={[styles.topicMeta, visuals.metaTextStyle]}>{lecture.teacherPdf.fileName}</Text>
        <View style={styles.badgeRow}>
          <Badge label="Teacher PDF notes" tone="primary" />
          <Badge label={`${linkedAssignments.length} assignments`} tone="secondary" />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Card>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  heroText: {
    flex: 1,
    gap: spacing.xs
  },
  heroTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900"
  },
  heroSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
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
  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  topicText: {
    flex: 1,
    gap: spacing.xs
  },
  topicEyebrow: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  topicTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  topicMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
