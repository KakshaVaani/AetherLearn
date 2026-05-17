import { normalizeLessonPack } from "@/api/adapters";
import { useEffect, useState } from "react";
import { fetchTeacherLessons } from "@/api/backend";
import { featuredLessonPack } from "@/data/lessonPacks";
import { LessonPack } from "@/types";

export function useLessonPackReview(lessonId?: string) {
  const [lesson, setLesson] = useState<LessonPack>(() => normalizeLessonPack(featuredLessonPack));
  const [loading, setLoading] = useState(Boolean(lessonId));
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!lessonId) {
      setLesson(normalizeLessonPack(featuredLessonPack));
      setLoading(false);
      setConnected(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    fetchTeacherLessons()
      .then((items) => {
        if (!mounted) return;
        const match = items.find((item) => item.id === lessonId);
        if (match) {
          setLesson(normalizeLessonPack(match));
          setConnected(true);
        } else {
          setLesson(normalizeLessonPack(featuredLessonPack));
          setConnected(false);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setLesson(normalizeLessonPack(featuredLessonPack));
        setConnected(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [lessonId]);

  return { lesson, loading, connected };
}
