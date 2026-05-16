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
    id: "science-plants",
    subject: "Science",
    title: "Chapter 1: Plant Life",
    description: "Photosynthesis, plant nutrition, and diagram-based revision.",
    lectureIds: ["photosynthesis"],
    assignmentIds: ["photosynthesis-quiz"]
  },
  {
    id: "science-energy",
    subject: "Science",
    title: "Chapter 2: Energy in Living Systems",
    description: "Teacher material will appear here after upload.",
    lectureIds: [],
    assignmentIds: []
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
    id: "english-reading",
    subject: "English",
    title: "Chapter 1: Reading Skills",
    description: "Comprehension notes and assignments from your teacher.",
    lectureIds: [],
    assignmentIds: []
  },
  {
    id: "social-civics",
    subject: "Social Studies",
    title: "Chapter 1: Community and Society",
    description: "Class notes and revision material will appear here.",
    lectureIds: [],
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
