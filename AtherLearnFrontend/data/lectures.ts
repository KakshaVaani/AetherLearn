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
  "plant-nutrition-stomata": {
    source: "Leaf cross-section board notes",
    postedAt: "2026-05-13T09:45:00.000Z",
    teacherPdf: {
      fileName: "plant-nutrition-stomata.pdf",
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
  "cloud-formation-rainfall": {
    source: "Weather chart and rainfall sketch",
    postedAt: "2026-05-13T11:00:00.000Z",
    teacherPdf: {
      fileName: "cloud-formation-rainfall.pdf",
      pageCount: 7,
      uploadedAt: "May 13, 2026"
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
  "teeth-saliva-enzymes": {
    source: "Mouth anatomy worksheet",
    postedAt: "2026-05-14T10:30:00.000Z",
    teacherPdf: {
      fileName: "teeth-saliva-enzymes.pdf",
      pageCount: 8,
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
  "natural-indicators": {
    source: "Turmeric and china rose observation sheet",
    postedAt: "2026-05-15T11:40:00.000Z",
    teacherPdf: {
      fileName: "natural-indicators-observation.pdf",
      pageCount: 7,
      uploadedAt: "May 15, 2026"
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
  "equivalent-fractions": {
    source: "Fraction strips classwork",
    postedAt: "2026-05-12T11:20:00.000Z",
    teacherPdf: {
      fileName: "equivalent-fractions-strips.pdf",
      pageCount: 6,
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
  "word-problems-equations": {
    source: "Algebra word problem worksheet",
    postedAt: "2026-05-14T09:10:00.000Z",
    teacherPdf: {
      fileName: "word-problems-to-equations.pdf",
      pageCount: 7,
      uploadedAt: "May 14, 2026"
    }
  },
  "area-perimeter": {
    source: "Notebook measurement example",
    postedAt: "2026-05-16T11:00:00.000Z",
    teacherPdf: {
      fileName: "area-perimeter-rectangles.pdf",
      pageCount: 6,
      uploadedAt: "May 16, 2026"
    }
  },
  "composite-rectangles": {
    source: "Composite rectangle grid worksheet",
    postedAt: "2026-05-16T11:45:00.000Z",
    teacherPdf: {
      fileName: "composite-rectangles.pdf",
      pageCount: 7,
      uploadedAt: "May 16, 2026"
    }
  },
  "data-handling": {
    source: "Bar graph worksheet",
    postedAt: "2026-05-17T08:15:00.000Z",
    teacherPdf: {
      fileName: "reading-bar-graphs.pdf",
      pageCount: 5,
      uploadedAt: "May 17, 2026"
    }
  },
  "mean-median-mode": {
    source: "Class marks data table",
    postedAt: "2026-05-17T09:00:00.000Z",
    teacherPdf: {
      fileName: "mean-median-mode.pdf",
      pageCount: 6,
      uploadedAt: "May 17, 2026"
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
