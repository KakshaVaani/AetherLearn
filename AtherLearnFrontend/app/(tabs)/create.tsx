import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { generateDemoLessonFromText } from "@/api/backend";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { LessonSourcePreview } from "@/components/LessonSourcePreview";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { featuredLessonPack } from "@/data/lessonPacks";
import { colors, spacing } from "@/constants/theme";

export default function CreateScreen() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Use the demo source to generate a backend lesson pack.");

  async function usePhoto() {
    setLoading(true);
    setMessage("Generating with backend...");
    try {
      const lesson = await generateDemoLessonFromText();
      setMessage("Backend lesson generated. Opening review flow.");
      router.push({
        pathname: "/source-understanding",
        params: {
          lessonId: lesson.id,
          title: lesson.title,
          grade: lesson.grade,
          subject: lesson.subject,
          mode: "generated"
        }
      });
    } catch {
      setMessage("Backend unavailable, opening fixture review flow.");
      router.push("/source-understanding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Header title="Capture Lesson" subtitle="Mock camera preview for the first frontend draft." showSettings={false} />

      <LessonSourcePreview lesson={featuredLessonPack} />

      <SectionHeader title="Image quality" subtitle="The app will flag weak captures before analysis." />
      <Text style={styles.statusText}>{message}</Text>
      <Card style={styles.qualityCard}>
        {featuredLessonPack.qualityChecks.map((check) => {
          const good = check.status === "Good";

          return (
            <View key={check.label} style={styles.qualityItem}>
              <Ionicons
                name={good ? "checkmark-circle" : "alert-circle"}
                size={22}
                color={good ? colors.success : colors.warning}
              />
              <View style={styles.qualityText}>
                <Text style={styles.qualityLabel}>{check.label}</Text>
                <Text style={[styles.qualityStatus, !good && styles.warningText]}>{check.status}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      <View style={styles.actions}>
        <AppButton
          title="Retake"
          variant="outline"
          leftIcon={<Ionicons name="refresh-outline" size={20} color={colors.text} />}
        />
        <AppButton
          title={loading ? "Generating..." : "Use Photo"}
          leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />}
          onPress={usePhoto}
          loading={loading}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  qualityCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  qualityItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm
  },
  qualityText: {
    alignItems: "center"
  },
  qualityLabel: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  qualityStatus: {
    color: colors.success,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  warningText: {
    color: colors.warning
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  },
  statusText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  }
});
