import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { lectures } from "@/data/lectures";
import { colors, radii, spacing } from "@/constants/theme";

const speeds = ["0.75x", "1x", "1.25x"];

export default function AudioLessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = lectures.find((item) => item.id === id) ?? lectures[0];
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1x");

  return (
    <ScreenContainer>
      <Header title="Audio Lesson" subtitle={lesson.title} showBack />

      <Card style={styles.playerCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause audio lesson" : "Play audio lesson"}
          onPress={() => setPlaying((current) => !current)}
          style={styles.playButton}
        >
          <Ionicons name={playing ? "pause" : "play"} size={48} color={colors.white} />
        </Pressable>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <Badge label="Offline available" tone="success" />
      </Card>

      <SectionHeader title="Speed" />
      <View style={styles.speedRow}>
        {speeds.map((item) => {
          const selected = speed === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setSpeed(item)}
              style={[styles.speedChip, selected && styles.speedChipSelected]}
            >
              <Text style={[styles.speedText, selected && styles.speedTextSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Transcript" />
      <Card style={styles.card}>
        <Text style={styles.body}>{lesson.outputs.dyslexiaFriendly}</Text>
      </Card>

      <SectionHeader title="Diagram described in words" />
      <Card style={styles.card}>
        <Text style={styles.body}>{lesson.diagramDescription}</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    alignItems: "center",
    gap: spacing.md
  },
  playButton: {
    width: 112,
    height: 112,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  lessonTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center"
  },
  speedRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  speedChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  speedChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  speedText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800"
  },
  speedTextSelected: {
    color: colors.primaryDark
  },
  card: {
    gap: spacing.md
  },
  body: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: "600"
  }
});
