import { useEffect, useState } from "react";
import { router } from "expo-router";
import { fetchTeacherClassrooms } from "@/api/backend";
import { Badge } from "@/components/Badge";
import { ClassroomCard } from "@/components/ClassroomCard";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { classrooms } from "@/data/classrooms";
import { Classroom } from "@/types";

export default function TeacherClassroomsScreen() {
  const [items, setItems] = useState<Classroom[]>(classrooms);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchTeacherClassrooms()
      .then((data) => {
        if (!mounted || data.length === 0) return;
        setItems(data);
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
      <Header title="Classrooms" subtitle="Manage inclusive learning groups." />
      <Badge label={connected ? "Backend synced" : "Local demo"} tone={connected ? "success" : "warning"} />
      <SectionHeader
        title="Your classrooms"
        subtitle="Each class tracks subjects, codes, and learner access profiles."
      />
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
