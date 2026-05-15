import { router } from "expo-router";
import { Header } from "@/components/Header";
import { LessonCard } from "@/components/LessonCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { lectures } from "@/data/lectures";

export default function StudentLessonsScreen() {
  return (
    <ScreenContainer>
      <Header title="Lessons" subtitle="Personalized classroom material for your profile." />
      <SectionHeader title="Available lessons" />
      {lectures.map((lesson) => (
        <LessonCard
          key={lesson.id}
          lesson={lesson}
          onPress={() => router.push({ pathname: "/(student)/lesson/[id]", params: { id: lesson.id } })}
        />
      ))}
    </ScreenContainer>
  );
}
