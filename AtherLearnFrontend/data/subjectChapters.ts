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
    description: "Photosynthesis, water movement, and diagram-based revision.",
    lectureIds: ["photosynthesis", "water-cycle"],
    assignmentIds: ["photosynthesis-quiz"]
  },
  {
    id: "science-human-systems",
    subject: "Science",
    title: "Chapter 2: Human Body Systems",
    description: "Digestive system notes with accessible step-by-step explanations.",
    lectureIds: ["digestive-system"],
    assignmentIds: ["digestive-system-revision"]
  },
  {
    id: "math-fractions",
    subject: "Math",
    title: "Chapter 1: Fractions",
    description: "Number lines, equal parts, and fraction practice.",
    lectureIds: ["fractions"],
    assignmentIds: ["fractions-practice"]
  },
  {
    id: "math-algebra",
    subject: "Math",
    title: "Chapter 2: Algebra Basics",
    description: "Linear equations, inverse operations, and balanced steps.",
    lectureIds: ["linear-equations"],
    assignmentIds: ["linear-equations-practice"]
  },
  {
    id: "english-reading",
    subject: "English",
    title: "Chapter 1: Reading Skills",
    description: "Finding the main idea and supporting details in a passage.",
    lectureIds: ["reading-main-idea"],
    assignmentIds: ["reading-main-idea-check"]
  },
  {
    id: "social-civics",
    subject: "Social Studies",
    title: "Chapter 1: Community and Constitution",
    description: "Rights, duties, and Indian Constitution basics.",
    lectureIds: ["constitution-basics"],
    assignmentIds: ["constitution-basics-exit-ticket"]
  },
  {
    id: "chemistry-acids-bases",
    subject: "Science",
    title: "Chapter 1: Acids, Bases, and Indicators",
    description: "Litmus tests, everyday examples, and lab safety.",
    lectureIds: ["acids-and-bases"],
    assignmentIds: []
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
