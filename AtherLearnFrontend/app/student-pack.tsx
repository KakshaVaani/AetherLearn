import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ReviewTabs } from "@/components/ReviewTabs";
import { ScreenContainer } from "@/components/ScreenContainer";
import { featuredLessonPack } from "@/data/lessonPacks";
import { colors, radii, spacing } from "@/constants/theme";

const sections = [
  "Summary",
  "Visual Description",
  "Key Vocabulary",
  "Step-by-Step Explanation",
  "Practice Questions"
] as const;

type StudentSection = (typeof sections)[number];

export default function StudentPackScreen() {
  const [playing, setPlaying] = useState(false);
  const [openSection, setOpenSection] = useState<StudentSection>("Summary");
  const pack = featuredLessonPack.studentAccessPack;

  function sectionBody(section: StudentSection) {
    if (section === "Summary") return pack.screenReaderSummary;
    if (section === "Visual Description") return pack.visualDescription;
    if (section === "Key Vocabulary") {
      return pack.vocabulary.map((item) => `${item.term}: ${item.meaning}`).join("\n");
    }
    if (section === "Step-by-Step Explanation") {
      return pack.steps.map((item, index) => `${index + 1}. ${item}`).join("\n");
    }
    return pack.practiceQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n");
  }

  return (
    <ScreenContainer>
      <Header title="Student Access Pack" subtitle="Audio-first and screen-reader-friendly." showBack />
      <ReviewTabs active="student" />

      <Card style={styles.playerCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause audio explanation" : "Play audio explanation"}
          onPress={() => setPlaying((current) => !current)}
          style={styles.playButton}
        >
          <Ionicons name={playing ? "pause" : "play" } size={36} color={colors.white} />
        </Pressable>
        <View style={styles.playerText}>
          <Text style={styles.playerTitle}>Audio explanation</Text>
          <Text style={styles.playerMeta}>08:45 - device TTS ready</Text>
        </View>
      </Card>

      {sections.map((section) => {
        const selected = openSection === section;

        return (
          <Card key={section} style={styles.sectionCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: selected }}
              onPress={() => setOpenSection(section)}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>{section}</Text>
              </View>
              <Ionicons name={selected ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
            </Pressable>
            {selected ? <Text style={styles.sectionBody}>{sectionBody(section)}</Text> : null}
          </Card>
        );
      })}

      <View style={styles.actions}>
        <AppButton
          title="Ask Question"
          variant="outline"
          leftIcon={<Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />}
          style={styles.actionButton}
        />
        <AppButton
          title="Trust Pack"
          leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.white} />}
          onPress={() => router.push("/trust-pack")}
          style={styles.actionButton}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primarySoft
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  playerText: {
    flex: 1,
    gap: spacing.xs
  },
  playerTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900"
  },
  playerMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700"
  },
  sectionCard: {
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  sectionTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  sectionBody: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "600"
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  },
  actionButton: {
    flex: 1
  }
});
