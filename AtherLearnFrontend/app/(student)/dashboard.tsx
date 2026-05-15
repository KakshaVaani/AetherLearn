import { useEffect, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchStudentDashboard } from "@/api/backend";
import { getSession } from "@/api/session";
import { studentAccessibilityVisuals, useStudentPreferences } from "@/api/studentPreferences";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ScreenContainer } from "@/components/ScreenContainer";
import { assignments } from "@/data/assignments";
import { classrooms } from "@/data/classrooms";
import { featuredLecture } from "@/data/lectures";
import { subjects } from "@/data/subjects";
import { Assignment, Classroom, Subject } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

export default function StudentDashboardScreen() {
  const [syncedClasses, setSyncedClasses] = useState<Classroom[]>(classrooms);
  const [syncedAssignments, setSyncedAssignments] = useState<Assignment[]>(assignments);
  const [connected, setConnected] = useState(false);
  const session = getSession();
  const firstName = session?.name?.trim().split(/\s+/)[0] || "Learner";
  const preferences = useStudentPreferences();
  const visuals = studentAccessibilityVisuals(preferences);

  useEffect(() => {
    let mounted = true;
    fetchStudentDashboard()
      .then((data) => {
        if (!mounted) return;
        if (data.classes.length > 0) setSyncedClasses(data.classes);
        if (data.assignments.length > 0) setSyncedAssignments(data.assignments);
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
    <ScreenContainer style={visuals.screenStyle} contentStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, visuals.metaTextStyle]}>Student workspace</Text>
          <Text style={[styles.greeting, visuals.titleTextStyle]}>Hi {firstName}</Text>
          <Text style={[styles.headerSubtitle, visuals.metaTextStyle]}>
            Lessons, practice, and feedback in one place.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => router.push("/(student)/profile")}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.metricsRow}>
        <MetricTile
          icon="book-outline"
          label="Lessons"
          value={String(subjects.reduce((total, subject) => total + subject.lessons, 0))}
          tint={colors.primary}
          cardStyle={visuals.cardStyle}
          titleStyle={visuals.titleTextStyle}
          metaStyle={visuals.metaTextStyle}
        />
        <MetricTile
          icon="clipboard-outline"
          label="Due"
          value={String(syncedAssignments.length)}
          tint={colors.warning}
          cardStyle={visuals.cardStyle}
          titleStyle={visuals.titleTextStyle}
          metaStyle={visuals.metaTextStyle}
        />
        <MetricTile
          icon={connected ? "cloud-done-outline" : "phone-portrait-outline"}
          label={connected ? "Synced" : "Local"}
          value={connected ? "On" : "Ready"}
          tint={connected ? colors.success : colors.secondary}
          cardStyle={visuals.cardStyle}
          titleStyle={visuals.titleTextStyle}
          metaStyle={visuals.metaTextStyle}
        />
      </View>

      <Card style={[styles.classroomCard, visuals.cardStyle]}>
        <View style={styles.classroomHeader}>
          <View style={styles.classIcon}>
            <Ionicons name="school-outline" size={22} color={colors.white} />
          </View>
          <View style={styles.classroomText}>
            <Text style={[styles.classroomTitle, visuals.titleTextStyle]}>
              {syncedClasses[0]?.title ?? classrooms[0].title}
            </Text>
            <Text style={[styles.classroomMeta, visuals.metaTextStyle]}>
              Code {(syncedClasses[0] ?? classrooms[0]).classCode}
            </Text>
          </View>
          <Badge label={connected ? "Synced" : "Local"} tone={connected ? "success" : "secondary"} />
        </View>
        <View style={styles.subjectPills}>
          {(syncedClasses[0]?.subjects ?? classrooms[0].subjects).map((subject) => (
            <View key={subject} style={styles.subjectPill}>
              <Text style={styles.subjectPillText}>{subject}</Text>
            </View>
          ))}
        </View>
      </Card>

      <DashboardSection
        title="Subjects"
        action="View all"
        onAction={() => router.push("/(student)/subjects")}
        titleStyle={visuals.titleTextStyle}
      />
      <View style={styles.subjectList}>
        {subjects.map((subject) => (
          <SubjectRow
            key={subject.id}
            subject={subject}
            cardStyle={visuals.cardStyle}
            titleStyle={visuals.titleTextStyle}
            metaStyle={visuals.metaTextStyle}
            onPress={() => router.push({ pathname: "/(student)/subject/[id]", params: { id: subject.id } })}
          />
        ))}
      </View>

      <DashboardSection title="Continue Learning" titleStyle={visuals.titleTextStyle} />
      <Card
        onPress={() => router.push({ pathname: "/(student)/lesson/[id]", params: { id: featuredLecture.id } })}
        style={[styles.learningCard, visuals.cardStyle]}
      >
        <View style={styles.learningTop}>
          <Badge label={featuredLecture.subject} tone="primary" />
          <Text style={[styles.learningMeta, visuals.metaTextStyle]}>Updated May 13</Text>
        </View>
        <Text style={[styles.learningTitle, visuals.titleTextStyle]}>{featuredLecture.title}</Text>
        <Text style={[styles.learningBody, visuals.metaTextStyle]} numberOfLines={2}>
          {featuredLecture.outputs.standard}
        </Text>
        <View style={styles.learningFooter}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </View>
      </Card>

      <DashboardSection title="Pending Assignment" titleStyle={visuals.titleTextStyle} />
      <AssignmentPreview
        assignment={syncedAssignments[0] ?? assignments[0]}
        cardStyle={visuals.cardStyle}
        titleStyle={visuals.titleTextStyle}
        metaStyle={visuals.metaTextStyle}
        onPress={() =>
          router.push({ pathname: "/(student)/assignment/[id]", params: { id: (syncedAssignments[0] ?? assignments[0]).id } })
        }
      />
    </ScreenContainer>
  );
}

type SharedVisualProps = {
  cardStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  metaStyle?: StyleProp<TextStyle>;
};

function MetricTile({
  icon,
  label,
  value,
  tint,
  cardStyle,
  titleStyle,
  metaStyle
}: SharedVisualProps & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <View style={[styles.metricTile, cardStyle]}>
      <View style={[styles.metricIcon, { backgroundColor: tint + "1A" }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[styles.metricValue, titleStyle]}>{value}</Text>
      <Text style={[styles.metricLabel, metaStyle]}>{label}</Text>
    </View>
  );
}

function DashboardSection({
  title,
  action,
  onAction,
  titleStyle
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  titleStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, titleStyle]}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SubjectRow({ subject, onPress, cardStyle, titleStyle, metaStyle }: SharedVisualProps & {
  subject: Subject;
  onPress: () => void;
}) {
  const total = Math.max(subject.lessons + subject.pendingAssignments, 1);
  const progress = Math.max(18, Math.round((subject.lessons / total) * 100));

  return (
    <Card onPress={onPress} style={[styles.subjectRow, cardStyle]}>
      <View style={[styles.subjectMark, { backgroundColor: subject.color }]} />
      <View style={styles.subjectMain}>
        <View style={styles.subjectHeader}>
          <Text style={[styles.subjectName, titleStyle]}>{subject.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
        <Text style={[styles.subjectMeta, metaStyle]}>
          {subject.lessons} lessons - {subject.pendingAssignments} pending
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.subjectProgressFill, { width: `${progress}%`, backgroundColor: subject.color }]} />
        </View>
      </View>
    </Card>
  );
}

function AssignmentPreview({
  assignment,
  onPress,
  cardStyle,
  titleStyle,
  metaStyle
}: SharedVisualProps & {
  assignment: Assignment;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={[styles.assignmentCard, cardStyle]}>
      <View style={styles.assignmentIcon}>
        <Ionicons name="document-text-outline" size={22} color={colors.secondary} />
      </View>
      <View style={styles.assignmentText}>
        <Text style={[styles.assignmentSubject, metaStyle]}>{assignment.subject}</Text>
        <Text style={[styles.assignmentTitle, titleStyle]}>{assignment.title}</Text>
        <Text style={[styles.assignmentMeta, metaStyle]}>Due {assignment.dueDate}</Text>
      </View>
      <Ionicons name="arrow-forward-circle" size={28} color={colors.primary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.xs
  },
  headerCopy: {
    flex: 1,
    gap: 3
  },
  eyebrow: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  greeting: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900"
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metricTile: {
    flex: 1,
    minHeight: 94,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.xs
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center"
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  classroomCard: {
    gap: spacing.md
  },
  classroomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  classIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  classroomText: {
    flex: 1,
    gap: 2
  },
  classroomTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  classroomMeta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  subjectPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  subjectPill: {
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  subjectPillText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  subjectList: {
    gap: spacing.sm
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md
  },
  subjectMark: {
    width: 8,
    alignSelf: "stretch",
    borderRadius: radii.pill
  },
  subjectMain: {
    flex: 1,
    gap: spacing.sm
  },
  subjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  subjectName: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  subjectMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  progressTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  subjectProgressFill: {
    height: "100%",
    borderRadius: radii.pill
  },
  learningCard: {
    gap: spacing.md
  },
  learningTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  learningMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  learningTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900"
  },
  learningBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21
  },
  learningFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  progressFill: {
    width: "64%",
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.primary
  },
  assignmentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  assignmentIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  assignmentText: {
    flex: 1,
    gap: 2
  },
  assignmentSubject: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900"
  },
  assignmentTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  assignmentMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  }
});
