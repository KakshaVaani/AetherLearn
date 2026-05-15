import { router } from "expo-router";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { SubjectCard } from "@/components/SubjectCard";
import { subjects } from "@/data/subjects";

export default function StudentSubjectsScreen() {
  return (
    <ScreenContainer>
      <Header title="Subjects" subtitle="Saved, synced, and ready for accessible study." />
      <SectionHeader title="Your subjects" subtitle="Offline badges show what is ready without network." />
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          onPress={() => router.push({ pathname: "/(student)/subject/[id]", params: { id: subject.id } })}
        />
      ))}
    </ScreenContainer>
  );
}
