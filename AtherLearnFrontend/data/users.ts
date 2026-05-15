import { User } from "@/types";

export const teacher: User = {
  id: "teacher-1",
  name: "Ms. Sharma",
  role: "teacher",
  avatarInitials: "MS"
};

export const students: User[] = [
  {
    id: "student-aarav",
    name: "Aarav",
    role: "student",
    avatarInitials: "AA",
    accessibilityMode: "Dyslexia Friendly",
    preferredLanguage: "English"
  },
  {
    id: "student-meera",
    name: "Meera",
    role: "student",
    avatarInitials: "ME",
    accessibilityMode: "Blind / Low Vision",
    preferredLanguage: "English"
  },
  {
    id: "student-rafiq",
    name: "Rafiq",
    role: "student",
    avatarInitials: "RA",
    accessibilityMode: "Multilingual",
    preferredLanguage: "Hindi + English"
  },
  {
    id: "student-neha",
    name: "Neha",
    role: "student",
    avatarInitials: "NE",
    accessibilityMode: "Slow Learner",
    preferredLanguage: "English"
  },
  {
    id: "student-kiran",
    name: "Kiran",
    role: "student",
    avatarInitials: "KI",
    accessibilityMode: "Standard",
    preferredLanguage: "English"
  }
];

export const currentStudent = students[0];
