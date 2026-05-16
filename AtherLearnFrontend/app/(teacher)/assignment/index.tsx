import { useEffect, useState } from "react";
import { router } from "expo-router";
import { fetchTeacherDashboard } from "@/api/backend";
import { AppButton } from "@/components/AppButton";
import { AssignmentCard } from "@/components/AssignmentCard";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { assignments } from "@/data/assignments";
import { Assignment } from "@/types";

export default function TeacherAssignmentsScreen() {
  const [items, setItems] = useState<Assignment[]>(assignments);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchTeacherDashboard()
      .then((data) => {
        if (!mounted) return;
        if (data.assignments.length > 0) setItems(data.assignments);
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
      <Header
        title="Assignments"
        subtitle={connected ? "Synced classroom work." : "Draft and published classroom work."}
      />
      <AppButton title="Create Assignment" onPress={() => router.push("/(teacher)/create-assignment")} />
      <SectionHeader title="Recent assignments" />
      {items.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          onPress={() =>
            router.push({ pathname: "/(teacher)/assignment/[id]", params: { id: assignment.id } })
          }
        />
      ))}
    </ScreenContainer>
  );
}
