import { useEffect, useState } from "react";
import { router } from "expo-router";
import { fetchStudentLessons } from "@/api/backend";
import { AssignmentCard } from "@/components/AssignmentCard";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { assignments } from "@/data/assignments";
import { Assignment } from "@/types";

export default function StudentAssignmentsScreen() {
  const [items, setItems] = useState<Assignment[]>(assignments);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchStudentLessons()
      .then((synced) => {
        if (!mounted) return;
        if (synced.length > 0) setItems(synced);
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
        title="Pending Assignments"
        subtitle={connected ? "Synced from backend." : "Personalized work from your teachers."}
      />
      <SectionHeader title="Due soon" subtitle="Open an assignment to complete your accessible version." />
      {items.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          onPress={() =>
            router.push({ pathname: "/(student)/assignment/[id]", params: { id: assignment.id } })
          }
        />
      ))}
    </ScreenContainer>
  );
}
