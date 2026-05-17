import { Assignment } from "@/types";

export const assignments: Assignment[] = [
  {
    id: "photosynthesis-quiz",
    title: "Photosynthesis Quick Check",
    classroom: "grade-7-inclusive",
    subject: "Science",
    linkedLecture: "Photosynthesis in Plants",
    postedAt: "2026-05-14T08:45:00.000Z",
    dueDate: "May 18, 2026",
    answerMode: "mcq",
    status: "Published",
    versions: ["Standard", "Blind / Low Vision", "Dyslexia Friendly", "Multilingual", "Slow Learner"],
    questions: [
      {
        id: "q1",
        prompt: "Which three inputs do plants need for photosynthesis?",
        hint: "Look at the arrows entering the plant.",
        options: ["Sunlight, water, and carbon dioxide", "Soil, moonlight, and oxygen", "Glucose, oxygen, and sand", "Water only"]
      },
      {
        id: "q2",
        prompt: "What food does the plant make?",
        options: ["Glucose", "Oxygen", "Soil", "Carbon dioxide"]
      },
      {
        id: "q3",
        prompt: "Which plant part takes in water?",
        options: ["Roots", "Flowers", "Stem only", "Fruit"]
      }
    ]
  },
  {
    id: "fractions-practice",
    title: "Fractions Number Line Practice",
    classroom: "grade-8-a",
    subject: "Math",
    linkedLecture: "Fractions on a Number Line",
    postedAt: "2026-05-13T11:15:00.000Z",
    dueDate: "May 18, 2026",
    answerMode: "short_answer",
    status: "Published",
    versions: ["Standard", "Dyslexia Friendly", "Slow Learner"],
    questions: [
      {
        id: "q1",
        prompt: "Place one-half on a number line from 0 to 1."
      },
      {
        id: "q2",
        prompt: "Which is larger: one-half or one-fourth?"
      },
      {
        id: "q3",
        prompt: "Why must spaces on a number line be equal?"
      }
    ]
  },
  {
    id: "linear-equations-practice",
    title: "Linear Equations Balance Practice",
    classroom: "grade-8-a",
    subject: "Math",
    linkedLecture: "Linear Equations",
    postedAt: "2026-05-15T09:30:00.000Z",
    dueDate: "May 20, 2026",
    answerMode: "long_answer",
    status: "Draft",
    versions: ["Standard", "Multilingual", "Slow Learner"],
    questions: [
      {
        id: "q1",
        prompt: "Solve 3x + 2 = 11 and explain every operation."
      },
      {
        id: "q2",
        prompt: "Create a two-step equation where x = 4, then show the check."
      }
    ]
  },
  {
    id: "digestive-system-revision",
    title: "Digestive System Revision",
    classroom: "grade-9-science",
    subject: "Science",
    linkedLecture: "Digestive System Overview",
    postedAt: "2026-05-15T12:10:00.000Z",
    dueDate: "May 21, 2026",
    answerMode: "mcq",
    status: "Published",
    versions: ["Standard", "Dyslexia Friendly", "Slow Learner"],
    questions: [
      {
        id: "q1",
        prompt: "Where does digestion begin?",
        options: ["Mouth", "Large intestine", "Lungs", "Heart"]
      },
      {
        id: "q2",
        prompt: "Which organ absorbs most nutrients?",
        options: ["Small intestine", "Stomach", "Oesophagus", "Teeth"]
      },
      {
        id: "q3",
        prompt: "What does the large intestine mainly absorb?",
        options: ["Water", "Sunlight", "Oxygen", "Glucose from air"]
      }
    ]
  },
  {
    id: "reading-main-idea-check",
    title: "Main Idea Exit Check",
    classroom: "grade-7-inclusive",
    subject: "English",
    linkedLecture: "Finding the Main Idea",
    postedAt: "2026-05-16T08:50:00.000Z",
    dueDate: "May 17, 2026",
    answerMode: "short_answer",
    status: "Published",
    versions: ["Standard", "Dyslexia Friendly", "Blind / Low Vision"],
    questions: [
      {
        id: "q1",
        prompt: "Write the main idea of the passage in one sentence."
      },
      {
        id: "q2",
        prompt: "Copy two supporting details from the passage."
      }
    ]
  },
  {
    id: "constitution-basics-exit-ticket",
    title: "Rights and Duties Exit Ticket",
    classroom: "grade-7-inclusive",
    subject: "Social Studies",
    linkedLecture: "Indian Constitution Basics",
    postedAt: "2026-05-16T10:20:00.000Z",
    dueDate: "May 21, 2026",
    answerMode: "short_answer",
    status: "Published",
    versions: ["Standard", "Multilingual", "Slow Learner"],
    questions: [
      {
        id: "q1",
        prompt: "What is the Constitution?"
      },
      {
        id: "q2",
        prompt: "Give one right and one duty."
      }
    ]
  }
];
