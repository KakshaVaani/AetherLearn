import { User } from "@/types";

export type DemoTeacher = User & {
  email: string;
  subjects: string[];
  classroomIds: string[];
};

export type DemoStudent = User & {
  email: string;
  classroomIds: string[];
  readingLevel: "Emerging" | "On Track" | "Advanced";
};

export const teachers: DemoTeacher[] = [
  {
    id: "teacher-demo",
    name: "Ananya Sharma",
    role: "teacher",
    avatarInitials: "AS",
    email: "teacher@aetherlearn.demo",
    subjects: ["Science", "Social Studies"],
    classroomIds: ["grade-7-inclusive", "grade-8-a", "grade-9-science"]
  },
  {
    id: "teacher-raj",
    name: "Raj Mehta",
    role: "teacher",
    avatarInitials: "RM",
    email: "raj@aetherlearn.demo",
    subjects: ["Math"],
    classroomIds: ["grade-8-a"]
  },
  {
    id: "teacher-farah",
    name: "Farah Khan",
    role: "teacher",
    avatarInitials: "FK",
    email: "farah@aetherlearn.demo",
    subjects: ["English", "Science"],
    classroomIds: ["grade-7-inclusive", "grade-9-science"]
  }
];

export const teacher: User = teachers[0];

export const students: DemoStudent[] = [
  {
    id: "student-demo",
    name: "Ravi Kumar",
    role: "student",
    avatarInitials: "RK",
    accessibilityMode: "Blind / Low Vision",
    preferredLanguage: "Hindi + English",
    email: "student@aetherlearn.demo",
    classroomIds: ["grade-7-inclusive"],
    readingLevel: "On Track"
  },
  {
    id: "student-aarav",
    name: "Aarav Singh",
    role: "student",
    avatarInitials: "AS",
    accessibilityMode: "Dyslexia Friendly",
    preferredLanguage: "English",
    email: "aarav@aetherlearn.demo",
    classroomIds: ["grade-8-a"],
    readingLevel: "On Track"
  },
  {
    id: "student-meera",
    name: "Meera Nair",
    role: "student",
    avatarInitials: "MN",
    accessibilityMode: "Blind / Low Vision",
    preferredLanguage: "English",
    email: "meera@aetherlearn.demo",
    classroomIds: ["grade-7-inclusive"],
    readingLevel: "Advanced"
  },
  {
    id: "student-rafiq",
    name: "Rafiq Ansari",
    role: "student",
    avatarInitials: "RA",
    accessibilityMode: "Multilingual",
    preferredLanguage: "Hindi + English",
    email: "rafiq@aetherlearn.demo",
    classroomIds: ["grade-8-a"],
    readingLevel: "On Track"
  },
  {
    id: "student-neha",
    name: "Neha Verma",
    role: "student",
    avatarInitials: "NV",
    accessibilityMode: "Slow Learner",
    preferredLanguage: "English",
    email: "neha@aetherlearn.demo",
    classroomIds: ["grade-7-inclusive"],
    readingLevel: "Emerging"
  },
  {
    id: "student-kiran",
    name: "Kiran Patel",
    role: "student",
    avatarInitials: "KP",
    accessibilityMode: "Standard",
    preferredLanguage: "English",
    email: "kiran@aetherlearn.demo",
    classroomIds: ["grade-8-a"],
    readingLevel: "Advanced"
  },
  {
    id: "student-ishita",
    name: "Ishita Rao",
    role: "student",
    avatarInitials: "IR",
    accessibilityMode: "Dyslexia Friendly",
    preferredLanguage: "English",
    email: "ishita@aetherlearn.demo",
    classroomIds: ["grade-9-science"],
    readingLevel: "On Track"
  },
  {
    id: "student-dev",
    name: "Dev Malhotra",
    role: "student",
    avatarInitials: "DM",
    accessibilityMode: "Slow Learner",
    preferredLanguage: "Hindi + English",
    email: "dev@aetherlearn.demo",
    classroomIds: ["grade-9-science"],
    readingLevel: "Emerging"
  },
  {
    id: "student-zoya",
    name: "Zoya Khan",
    role: "student",
    avatarInitials: "ZK",
    accessibilityMode: "Multilingual",
    preferredLanguage: "Urdu + English",
    email: "zoya@aetherlearn.demo",
    classroomIds: ["grade-7-inclusive"],
    readingLevel: "On Track"
  },
  {
    id: "student-tara",
    name: "Tara Iyer",
    role: "student",
    avatarInitials: "TI",
    accessibilityMode: "Standard",
    preferredLanguage: "English",
    email: "tara@aetherlearn.demo",
    classroomIds: ["grade-9-science"],
    readingLevel: "Advanced"
  }
];

export const classRosters: Record<string, string[]> = {
  "grade-7-inclusive": ["student-demo", "student-meera", "student-neha", "student-zoya"],
  "grade-8-a": ["student-aarav", "student-rafiq", "student-kiran"],
  "grade-9-science": ["student-ishita", "student-dev", "student-tara"]
};

export const teacherClassrooms: Record<string, string[]> = teachers.reduce<Record<string, string[]>>((acc, item) => {
  acc[item.id] = item.classroomIds;
  return acc;
}, {});

export const currentStudent = students[0];
