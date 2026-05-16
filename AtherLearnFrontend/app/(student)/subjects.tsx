import { router } from "expo-router";
import { useStudentCopy } from "@/api/studentCopy";
import { useStudentAcademicProfile } from "@/api/studentProfile";
import { studentAccessibilityVisuals, useStudentPreferences } from "@/api/studentPreferences";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { SubjectCard } from "@/components/SubjectCard";
import { subjects } from "@/data/subjects";

export default function StudentSubjectsScreen() {
  const profile = useStudentAcademicProfile();
  const preferences = useStudentPreferences();
  const copy = useStudentCopy();
  const visuals = studentAccessibilityVisuals(preferences);
  const visibleSubjects = profile?.subjects.length
    ? subjects.filter((subject) => profile.subjects.includes(subject.name))
    : subjects;

  return (
    <ScreenContainer style={visuals.screenStyle}>
      <Header title={copy.subjects} subtitle={copy.subjectsSubtitle} />
      <SectionHeader title={copy.yourSubjects} subtitle={copy.subjectsHelper} />
      {visibleSubjects.map((subject) => (
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
