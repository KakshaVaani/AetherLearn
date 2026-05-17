export type SubjectChapter = {
  id: string;
  subject: string;
  title: string;
  description: string;
  lectureIds: string[];
  assignmentIds: string[];
};

export const subjectChapters: SubjectChapter[] = [
  {
    id: "science-plant-processes",
    subject: "Science",
    title: "Chapter 1: Plant Processes",
    description: "Photosynthesis, plant nutrition, stomata, and accessible diagram revision.",
    lectureIds: ["photosynthesis", "plant-nutrition-stomata"],
    assignmentIds: ["photosynthesis-quiz", "plant-nutrition-stomata-practice"]
  },
  {
    id: "science-water-cycle",
    subject: "Science",
    title: "Chapter 2: Water and Weather",
    description: "Water cycle stages, cloud formation, rainfall, and audio-first support.",
    lectureIds: ["water-cycle", "cloud-formation-rainfall"],
    assignmentIds: ["water-cycle-diagram", "cloud-rainfall-check"]
  },
  {
    id: "science-human-body",
    subject: "Science",
    title: "Chapter 1: Human Body Systems",
    description: "Digestive system path, organ roles, teeth, saliva, and enzymes.",
    lectureIds: ["digestive-system", "teeth-saliva-enzymes"],
    assignmentIds: ["digestive-system-revision", "teeth-saliva-enzymes-practice"]
  },
  {
    id: "science-acids-bases",
    subject: "Science",
    title: "Chapter 2: Acids, Bases, and Indicators",
    description: "Litmus tests, natural indicators, everyday examples, and lab safety notes.",
    lectureIds: ["acids-and-bases", "natural-indicators"],
    assignmentIds: ["acids-bases-safety", "natural-indicators-observation"]
  },
  {
    id: "math-fractions",
    subject: "Math",
    title: "Chapter 1: Fractions",
    description: "Number lines, equal parts, equivalent fractions, and practice.",
    lectureIds: ["fractions", "equivalent-fractions"],
    assignmentIds: ["fractions-practice", "equivalent-fractions-practice"]
  },
  {
    id: "math-algebra",
    subject: "Math",
    title: "Chapter 2: Algebra Basics",
    description: "Linear equations, word problems, inverse operations, and balanced steps.",
    lectureIds: ["linear-equations", "word-problems-equations"],
    assignmentIds: ["linear-equations-practice", "word-problems-equations-practice"]
  },
  {
    id: "math-measurement",
    subject: "Math",
    title: "Chapter 1: Measurement",
    description: "Area, perimeter, units, composite rectangles, and measurement problems.",
    lectureIds: ["area-perimeter", "composite-rectangles"],
    assignmentIds: ["area-perimeter-practice", "composite-rectangles-practice"]
  },
  {
    id: "math-data-handling",
    subject: "Math",
    title: "Chapter 2: Data Handling",
    description: "Bar graphs, scale reading, averages, and comparison questions.",
    lectureIds: ["data-handling", "mean-median-mode"],
    assignmentIds: ["data-handling-exit-ticket", "mean-median-mode-practice"]
  }
];

export function chaptersForSubject(subject: string) {
  return subjectChapters.filter((chapter) => chapter.subject === subject);
}

export function chapterById(id: string) {
  return subjectChapters.find((chapter) => chapter.id === id);
}

export function chapterForLecture(lectureId: string) {
  return subjectChapters.find((chapter) => chapter.lectureIds.includes(lectureId));
}
