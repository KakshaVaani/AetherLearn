import { Subject } from "@/types";

export const subjects: Subject[] = [
  {
    id: "science",
    name: "Science",
    lessons: 4,
    pendingAssignments: 2,
    color: "#2563EB",
    badge: "Cloud generated"
  },
  {
    id: "math",
    name: "Math",
    lessons: 2,
    pendingAssignments: 2,
    color: "#7C3AED",
    badge: "Saved offline"
  },
  {
    id: "english",
    name: "English",
    lessons: 1,
    pendingAssignments: 1,
    color: "#16A34A",
    badge: "Local mode ready"
  },
  {
    id: "social-studies",
    name: "Social Studies",
    lessons: 1,
    pendingAssignments: 1,
    color: "#F59E0B",
    badge: "Sync pending"
  }
];
