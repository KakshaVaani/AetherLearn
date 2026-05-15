import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchTeacherDashboard } from "@/api/backend";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { LessonThumbnail } from "@/components/LessonThumbnail";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { lessonPacks } from "@/data/lessonPacks";
import { LessonPack, LessonStatus } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

function statusTone(status: LessonStatus) {
  if (status === "Approved" || status === "Exported") return "success" as const;
  if (status === "Needs Review") return "warning" as const;
  return "neutral" as const;
}

function RecentLesson({ lesson }: { lesson: LessonPack }) {
  return (
    <Card onPress={() => router.push("/source-understanding")} style={styles.lessonCard}>
      <LessonThumbnail lesson={lesson} />
      <View style={styles.lessonText}>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <Text style={styles.lessonMeta}>
          {lesson.grade} - {lesson.subject} - {lesson.language}
        </Text>
        <Text style={styles.lessonMeta}>Learner need: {lesson.learnerNeed}</Text>
        <Text numberOfLines={2} style={styles.lessonMeta}>
          Output: {lesson.outputType}
        </Text>
        <View style={styles.lessonBadges}>
          <Badge label={lesson.runtimeMode} tone="primary" />
          <Badge label={lesson.status} tone={statusTone(lesson.status)} />
        </View>
      </View>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.quickAction}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [lessons, setLessons] = useState<LessonPack[]>(lessonPacks);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchTeacherDashboard()
      .then((data) => {
        if (!mounted) return;
        if (data.lessons.length > 0) setLessons(data.lessons);
        setConnected(true);
      })
      .catch(() => {
        if (mounted) setConnected(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.brandMark}>
          <Ionicons name="accessibility-outline" size={26} color={colors.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.brandName}>AtherLearn</Text>
          <Text style={styles.subtitle}>Good morning, Teacher</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <Card style={styles.statusCard}>
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>Classroom access layer</Text>
          <Text style={styles.statusBody}>Capture one lesson source and create accessible packs for every learner.</Text>
        </View>
        <Badge label={connected ? "Backend connected" : "Offline demo data"} tone={connected ? "success" : "warning"} />
      </Card>

      <AppButton
        title="Capture Lesson"
        leftIcon={<Ionicons name="camera-outline" size={20} color={colors.white} />}
        onPress={() => router.push("/create")}
      />

      <View style={styles.quickGrid}>
        <QuickAction icon="image-outline" label="Upload Image" onPress={() => router.push("/create")} />
        <QuickAction icon="volume-high-outline" label="Student Audio" onPress={() => router.push("/student-pack")} />
        <QuickAction icon="folder-outline" label="Saved Lessons" onPress={() => router.push("/lessons")} />
      </View>

      <SectionHeader title="Recent lessons" />
      {lessons.slice(0, 2).map((lesson) => (
        <RecentLesson key={lesson.id} lesson={lesson} />
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  headerText: {
    flex: 1,
    gap: 2
  },
  brandName: {
    color: colors.primary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800"
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
  statusCard: {
    gap: spacing.md
  },
  statusText: {
    gap: spacing.xs
  },
  statusTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  statusBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  quickGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  quickAction: {
    flex: 1,
    minHeight: 94,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.sm
  },
  quickActionText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md
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
  lessonBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  }
});
