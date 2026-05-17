import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { fetchTeacherClassroomsWithSource } from "@/api/backend";
import { Badge } from "@/components/Badge";
import { ClassroomCard } from "@/components/ClassroomCard";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { colors, spacing } from "@/constants/theme";
import { Classroom } from "@/types";

type ClassroomSource = "backend" | "local" | "demo";

export default function TeacherClassroomsScreen() {
  const [items, setItems] = useState<Classroom[]>([]);
  const [source, setSource] = useState<ClassroomSource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchTeacherClassroomsWithSource()
      .then((result) => {
        if (!mounted) return;
        setItems(result.classes);
        setSource(result.source);
      })
      .catch(() => {
        if (!mounted) return;
        setItems([]);
        setSource(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const connected = source === "backend";
  const badgeLabel = loading
    ? "Loading classes"
    : source === "backend"
      ? "Backend synced"
      : source === "local"
        ? "Offline cache"
        : "Local demo";

  return (
    <ScreenContainer>
      <Header title="Classrooms" subtitle="Manage inclusive learning groups." />
      <Badge label={badgeLabel} tone={connected ? "success" : "warning"} />
      <SectionHeader
        title="Your classrooms"
        subtitle="Each class tracks subjects, codes, and learner access profiles."
      />
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading backend classes...</Text>
        </View>
      ) : null}
      {items.map((classroom) => (
        <ClassroomCard
          key={classroom.id}
          classroom={classroom}
          onPress={() =>
            router.push({ pathname: "/(teacher)/classrooms/[id]", params: { id: classroom.id } })
          }
        />
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  }
});
