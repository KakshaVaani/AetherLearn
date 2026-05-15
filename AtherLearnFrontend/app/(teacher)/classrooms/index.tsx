import { router } from "expo-router";
import { ClassroomCard } from "@/components/ClassroomCard";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { classrooms } from "@/data/classrooms";

export default function TeacherClassroomsScreen() {
  return (
    <ScreenContainer>
      <Header title="Classrooms" subtitle="Manage inclusive learning groups." />
      <SectionHeader
        title="Your classrooms"
        subtitle="Each class tracks subjects, codes, and learner access profiles."
      />
      {classrooms.map((classroom) => (
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
