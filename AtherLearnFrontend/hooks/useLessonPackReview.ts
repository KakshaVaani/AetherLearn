import { normalizeLessonPack } from "@/api/adapters";
import { useEffect, useState } from "react";
import { fetchTeacherLesson, LessonDataSource } from "@/api/backend";
import { featuredLessonPack } from "@/data/lessonPacks";
import { LessonPack } from "@/types";

export function useLessonPackReview(lessonId?: string) {
  const [lesson, setLesson] = useState<LessonPack | null>(() =>
    lessonId ? null : normalizeLessonPack(featuredLessonPack)
  );
  const [loading, setLoading] = useState(Boolean(lessonId));
  const [connected, setConnected] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [source, setSource] = useState<LessonDataSource>(lessonId ? "demo" : "demo");

  useEffect(() => {
    if (!lessonId) {
      setLesson(normalizeLessonPack(featuredLessonPack));
      setLoading(false);
      setConnected(false);
      setNotFound(false);
      setSource("demo");
      return;
    }

    let mounted = true;
    setLesson(null);
    setLoading(true);
    setConnected(false);
    setNotFound(false);
    fetchTeacherLesson(lessonId)
      .then(({ lesson: nextLesson, source }) => {
        if (!mounted) return;
        setLesson(normalizeLessonPack(nextLesson));
        setConnected(source === "backend");
        setSource(source);
        setNotFound(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLesson(null);
        setConnected(false);
        setSource("demo");
        setNotFound(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [lessonId]);

  function replaceLesson(nextLesson: LessonPack, nextSource: LessonDataSource = source) {
    setLesson(normalizeLessonPack(nextLesson));
    setSource(nextSource);
    setConnected(nextSource === "backend");
    setNotFound(false);
    setLoading(false);
  }

  return { lesson, loading, connected, notFound, source, replaceLesson };
}
