import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ReviewTabs } from "@/components/ReviewTabs";
import { ScreenContainer } from "@/components/ScreenContainer";
import { featuredLessonPack } from "@/data/lessonPacks";
import { colors, radii, spacing } from "@/constants/theme";

const tabs = ["Objective", "Script", "Activity", "Worksheet", "Answers"] as const;
type TeacherTab = (typeof tabs)[number];

export default function TeacherPackScreen() {
  const [activeTab, setActiveTab] = useState<TeacherTab>("Objective");
  const pack = featuredLessonPack.teacherPack;

  return (
    <ScreenContainer>
      <Header title="Teacher Pack" subtitle={featuredLessonPack.title} showBack />
      <ReviewTabs active="teacher" />

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

      {activeTab === "Objective" ? (
        <>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flag-outline" size={22} color={colors.danger} />
              <Text style={styles.cardTitle}>Learning objective</Text>
            </View>
            <Text style={styles.body}>{pack.objective}</Text>
          </Card>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkmark-done-outline" size={22} color={colors.success} />
              <Text style={styles.cardTitle}>Success criteria</Text>
            </View>
            {pack.keyConcepts.map((item) => (
              <Text key={item} style={styles.point}>
                - {item}
              </Text>
            ))}
          </Card>
        </>
      ) : null}

      {activeTab === "Script" ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Teaching script</Text>
          <Text style={styles.body}>{pack.teachingScript}</Text>
        </Card>
      ) : null}

      {activeTab === "Activity" ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Classroom activity</Text>
          <Text style={styles.body}>{pack.classroomActivity}</Text>
          <Badge label="Low resource" tone="success" />
        </Card>
      ) : null}

      {activeTab === "Worksheet" ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Worksheet questions</Text>
          {pack.worksheet.map((question, index) => (
            <Text key={question} style={styles.point}>
              {index + 1}. {question}
            </Text>
          ))}
        </Card>
      ) : null}

      {activeTab === "Answers" ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Answer key</Text>
          {pack.answerKey.map((answer, index) => (
            <Text key={answer} style={styles.point}>
              {index + 1}. {answer}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card style={styles.supportCard}>
        <Text style={styles.cardTitle}>Differentiated support</Text>
        <Text style={styles.body}>{pack.differentiatedSupport}</Text>
      </Card>

      <View style={styles.actions}>
        <AppButton
          title="Edit"
          variant="outline"
          leftIcon={<Ionicons name="create-outline" size={20} color={colors.text} />}
          style={styles.actionButton}
        />
        <AppButton
          title="Regenerate"
          variant="outline"
          leftIcon={<Ionicons name="refresh-outline" size={20} color={colors.text} />}
          style={styles.actionButton}
        />
        <AppButton
          title="Student Pack"
          variant="success"
          leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
          onPress={() => router.push("/student-pack")}
          style={styles.actionButton}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tab: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  tabSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  tabText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  tabTextSelected: {
    color: colors.primaryDark
  },
  card: {
    gap: spacing.md
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600"
  },
  point: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700"
  },
  supportCard: {
    gap: spacing.md,
    backgroundColor: colors.surface
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: spacing.sm
  }
});
