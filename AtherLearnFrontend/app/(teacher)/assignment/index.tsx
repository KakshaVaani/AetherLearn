import { router } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { AssignmentCard } from "@/components/AssignmentCard";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { assignments } from "@/data/assignments";

export default function TeacherAssignmentsScreen() {
  return (
    <ScreenContainer>
      <Header title="Assignments" subtitle="Draft and published classroom work." />
      <AppButton title="Create Assignment" onPress={() => router.push("/(teacher)/create-assignment")} />
      <SectionHeader title="Recent assignments" />
      {assignments.map((assignment) => (
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
