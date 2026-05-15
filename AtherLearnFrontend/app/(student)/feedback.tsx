import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { colors, spacing } from "@/constants/theme";

export default function FeedbackScreen() {
  return (
    <ScreenContainer>
      <Header title="Feedback" subtitle="Gemma 4 draft feedback after submission." showBack />

      <Card style={styles.scoreCard}>
        <Text style={styles.score}>82%</Text>
        <Text style={styles.scoreLabel}>Strong first attempt</Text>
      </Card>

      <SectionHeader title="What you did well" />
      <Card style={styles.card}>
        <Text style={styles.body}>You correctly named sunlight and water as things plants need.</Text>
      </Card>

      <SectionHeader title="Missing concepts" />
      <Card style={styles.card}>
        <Text style={styles.body}>Add carbon dioxide and explain that plants release oxygen.</Text>
      </Card>

      <SectionHeader title="Suggested improvement" />
      <Card style={styles.card}>
        <Text style={styles.body}>
          Try using this sentence: Plants use sunlight, water, and carbon dioxide to make glucose.
        </Text>
      </Card>

      <View style={styles.actions}>
        <AppButton
          title="Review Lesson"
          variant="outline"
          onPress={() => router.push("/(student)/lesson/photosynthesis")}
        />
        <AppButton
          title="Try Again"
          onPress={() => router.push("/(student)/assignment/photosynthesis-quiz")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scoreCard: {
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.successSoft
  },
  score: {
    color: colors.success,
    fontSize: 46,
    lineHeight: 54,
    fontWeight: "900"
  },
  scoreLabel: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  card: {
    gap: spacing.md
  },
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "600"
  },
  actions: {
    gap: spacing.md
  }
});
