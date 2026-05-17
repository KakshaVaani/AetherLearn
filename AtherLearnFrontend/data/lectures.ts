import { lessonPacks } from "@/data/lessonPacks";
import { Lecture, SyncBadge, TeacherPdf } from "@/types";

const lectureMeta: Record<string, { source: string; postedAt: string; teacherPdf: TeacherPdf }> = {
  photosynthesis: {
    source: "Biology blackboard diagram",
    postedAt: "2026-05-13T09:00:00.000Z",
    teacherPdf: {
      fileName: "photosynthesis-plant-nutrition.pdf",
      pageCount: 8,
      uploadedAt: "May 13, 2026"
    }
  },
  "water-cycle": {
    source: "Textbook diagram photo",
    postedAt: "2026-05-13T10:15:00.000Z",
    teacherPdf: {
      fileName: "water-cycle-diagram-notes.pdf",
      pageCount: 6,
      uploadedAt: "May 13, 2026"
    }
  },
  fractions: {
    source: "Math worksheet scan",
    postedAt: "2026-05-12T10:30:00.000Z",
    teacherPdf: {
      fileName: "fractions-number-line-practice.pdf",
      pageCount: 5,
      uploadedAt: "May 12, 2026"
    }
  },
  "linear-equations": {
    source: "Algebra worked-example worksheet",
    postedAt: "2026-05-14T08:20:00.000Z",
    teacherPdf: {
      fileName: "linear-equations-balanced-steps.pdf",
      pageCount: 7,
      uploadedAt: "May 14, 2026"
    }
  },
  "digestive-system": {
    source: "Biology slide with organ diagram",
    postedAt: "2026-05-14T09:45:00.000Z",
    teacherPdf: {
      fileName: "digestive-system-overview.pdf",
      pageCount: 9,
      uploadedAt: "May 14, 2026"
    }
  },
  "acids-and-bases": {
    source: "Lab observation table",
    postedAt: "2026-05-15T11:00:00.000Z",
    teacherPdf: {
      fileName: "acids-bases-indicators-lab.pdf",
      pageCount: 6,
      uploadedAt: "May 15, 2026"
    }
  },
  "reading-main-idea": {
    source: "Reading passage handout",
    postedAt: "2026-05-15T08:40:00.000Z",
    teacherPdf: {
      fileName: "reading-main-idea-supporting-details.pdf",
      pageCount: 4,
      uploadedAt: "May 15, 2026"
    }
  },
  "constitution-basics": {
    source: "Civics notebook notes",
    postedAt: "2026-05-16T09:10:00.000Z",
    teacherPdf: {
      fileName: "constitution-rights-duties-notes.pdf",
      pageCount: 5,
      uploadedAt: "May 16, 2026"
    }
  }
};

function badgeFor(runtimeMode: string): SyncBadge {
  if (runtimeMode === "Hosted Gemma") return "Cloud generated";
  if (runtimeMode === "Local Ollama") return "Local mode ready";
  return "Saved offline";
}

export const lectures: Lecture[] = lessonPacks.map((pack) => {
  const meta = lectureMeta[pack.id];

  return {
    id: pack.id,
    title: pack.title,
    subject: pack.subject,
    classroomId: pack.classroomId,
    classSubjectId: pack.classSubjectId,
    chapterId: pack.chapterId,
    chapterTitle: pack.chapterTitle,
    topicId: pack.topicId,
    topicTitle: pack.topicTitle,
    source: meta?.source ?? pack.sourceCard.sourceType,
    sourceType: pack.sourceCard.sourceType,
    postedAt: meta?.postedAt ?? "2026-05-14T09:00:00.000Z",
    teacherPdf: meta?.teacherPdf ?? {
      fileName: `${pack.id}.pdf`,
      pageCount: 4,
      uploadedAt: "May 14, 2026"
    },
    teacherNotes: pack.teacherPack.teachingScript,
    status: `${pack.runtimeMode} analysis complete`,
    diagramDescription: pack.studentAccessPack.visualDescription,
    keyVocabulary: pack.studentAccessPack.vocabulary.map((item) => item.term),
    practiceQuestions: pack.studentAccessPack.practiceQuestions,
    outputs: {
      standard: pack.studentAccessPack.screenReaderSummary,
      blindLowVision: pack.studentAccessPack.visualDescription,
      dyslexiaFriendly: pack.studentAccessPack.stepByStepExplanation,
      multilingual: pack.language.includes("Hindi") ? pack.studentAccessPack.audioStudyScript : pack.studentAccessPack.screenReaderSummary,
      slowLearner: pack.studentAccessPack.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")
    },
    badge: badgeFor(pack.runtimeMode)
  };
});

export const featuredLecture = lectures[0];
