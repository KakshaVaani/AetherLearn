import { Assignment } from "@/types";

export const assignments: Assignment[] = [
  {
    id: "photosynthesis-quiz",
    title: "Photosynthesis Quick Check",
    classroom: "Grade 8 - Section A",
    subject: "Science",
    linkedLecture: "Photosynthesis and Plant Nutrition",
    postedAt: "2026-05-14T08:45:00.000Z",
    dueDate: "May 15, 2026",
    answerMode: "mcq",
    status: "Draft",
    versions: ["Standard", "Blind / Low Vision", "Dyslexia Friendly", "Multilingual", "Slow Learner"],
    questions: [
      {
        id: "q1",
        prompt: "Which two things do plants need for photosynthesis?",
        hint: "Look for inputs in the lesson notes.",
        options: ["Sunlight and water", "Sand and oxygen", "Glucose and soil", "Moonlight and air"]
      },
      {
        id: "q2",
        prompt: "Why is sunlight important for plants?",
        hint: "Think about energy.",
        options: [
          "It gives energy for making food",
          "It makes roots disappear",
          "It changes oxygen into soil",
          "It stops leaves from working"
        ]
      },
      {
        id: "q3",
        prompt: "What does the plant release into the air?",
        options: ["Oxygen", "Glucose", "Soil", "Water only"]
      }
    ]
  },
  {
    id: "fractions-practice",
    title: "Fractions Practice",
    classroom: "Grade 8 - Section A",
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
        prompt: "Which is larger: one-half or one-quarter?"
      }
    ]
  }
];
