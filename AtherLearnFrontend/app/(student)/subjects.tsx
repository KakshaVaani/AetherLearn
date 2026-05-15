import { router } from "expo-router";
import { studentAccessibilityVisuals, useStudentPreferences } from "@/api/studentPreferences";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { SubjectCard } from "@/components/SubjectCard";
import { subjects } from "@/data/subjects";

export default function StudentSubjectsScreen() {
  const preferences = useStudentPreferences();
  const visuals = studentAccessibilityVisuals(preferences);

  return (
    <ScreenContainer style={visuals.screenStyle}>
      <Header title="Subjects" subtitle="Saved, synced, and ready for accessible study." />
      <SectionHeader title="Your subjects" subtitle="Offline badges show what is ready without network." />
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          cardStyle={visuals.cardStyle}
          titleStyle={visuals.titleTextStyle}
          metaStyle={visuals.metaTextStyle}
          onPress={() => router.push({ pathname: "/(student)/subject/[id]", params: { id: subject.id } })}
        />
      ))}
    </ScreenContainer>
  );
}
