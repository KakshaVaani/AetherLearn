import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { featuredLecture } from "@/data/lectures";
import { colors, radii, spacing } from "@/constants/theme";

const outputTabs = [
  { key: "standard", label: "Standard Notes" },
  { key: "blindLowVision", label: "Blind / Low Vision Notes" },
  { key: "dyslexiaFriendly", label: "Dyslexia-Friendly Notes" },
  { key: "multilingual", label: "Multilingual Notes" },
  { key: "slowLearner", label: "Slow Learner Notes" }
] as const;

type OutputKey = (typeof outputTabs)[number]["key"];

export default function LectureAnalysisResultScreen() {
  const [activeTab, setActiveTab] = useState<OutputKey>("standard");
  const active = outputTabs.find((tab) => tab.key === activeTab) ?? outputTabs[0];

  return (
    <ScreenContainer>
      <Header title="Lecture Result" subtitle="Gemma 4 generated accessible learning drafts." showBack />

      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.sparkleIcon}>
            <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.title}>{featuredLecture.title}</Text>
            <Text style={styles.source}>{featuredLecture.sourceType}</Text>
          </View>
        </View>
        <Badge label={featuredLecture.status} tone="success" />
      </Card>

      <SectionHeader title="Generated notes" subtitle="Review each personalized version before sharing." />
      <View style={styles.tabRow}>
        {outputTabs.map((tab) => {
          const selected = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.notesCard}>
        <Text style={styles.notesTitle}>{active.label}</Text>
        <Text style={styles.notesBody}>{featuredLecture.outputs[activeTab]}</Text>
      </Card>

      <Card style={styles.detailCard}>
        <Text style={styles.detailTitle}>Diagram description</Text>
        <Text style={styles.detailBody}>{featuredLecture.diagramDescription}</Text>
      </Card>

      <Card style={styles.detailCard}>
        <Text style={styles.detailTitle}>Key vocabulary</Text>
        <View style={styles.badges}>
          {featuredLecture.keyVocabulary.map((word) => (
            <Badge key={word} label={word} tone="primary" />
          ))}
        </View>
      </Card>

      <Card style={styles.detailCard}>
        <Text style={styles.detailTitle}>Practice questions</Text>
        {featuredLecture.practiceQuestions.map((question, index) => (
          <Text key={question} style={styles.question}>
            {index + 1}. {question}
          </Text>
        ))}
      </Card>

      <Card style={styles.reviewNotice}>
        <Ionicons name="alert-circle-outline" size={22} color={colors.warning} />
        <Text style={styles.reviewText}>AI content is a draft. Please review before sharing.</Text>
      </Card>

      <View style={styles.actions}>
        <AppButton title="Share with Class" onPress={() => router.push("/(teacher)/dashboard")} />
        <AppButton
          title="Create Assignment"
          variant="outline"
          onPress={() => router.push("/(teacher)/create-assignment")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.md
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  sparkleIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  summaryText: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  source: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tab: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md
  },
  tabSelected: {
    backgroundColor: colors.secondarySoft,
    borderColor: colors.secondary
  },
  tabText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  tabTextSelected: {
    color: colors.secondary
  },
  notesCard: {
    gap: spacing.md
  },
  notesTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  notesBody: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "600"
  },
  detailCard: {
    gap: spacing.md
  },
  detailTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  detailBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  question: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600"
  },
  reviewNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.warningSoft
  },
  reviewText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  actions: {
    gap: spacing.md
  }
});
