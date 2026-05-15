import { Subject } from "@/types";

export const subjects: Subject[] = [
  {
    id: "science",
    name: "Science",
    lessons: 8,
    pendingAssignments: 2,
    color: "#2563EB",
    badge: "Saved offline"
  },
  {
    id: "math",
    name: "Math",
    lessons: 6,
    pendingAssignments: 1,
    color: "#7C3AED",
    badge: "Cloud generated"
  },
  {
    id: "english",
    name: "English",
    lessons: 5,
    pendingAssignments: 0,
    color: "#16A34A",
    badge: "Local mode ready"
  },
  {
    id: "social-studies",
    name: "Social Studies",
    lessons: 4,
    pendingAssignments: 1,
    color: "#F59E0B",
    badge: "Sync pending"
  }
];
