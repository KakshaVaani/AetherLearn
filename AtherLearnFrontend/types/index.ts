export type Role = "teacher" | "student";

export type RuntimeMode = "Hosted Gemma" | "Local Ollama" | "Demo Fixture";

export type LessonStatus = "Draft" | "Needs Review" | "Approved" | "Exported";

export type LessonOutputType =
  | "Teacher + Student + Trust Packs"
  | "Teacher Pack"
  | "Student Access Pack"
  | "Audio Explanation"
  | "Quiz / Worksheet";

export type AccessibilityMode =
  | "Standard"
  | "Blind / Low Vision"
  | "Dyslexia Friendly"
  | "Multilingual"
  | "Slow Learner";

export type AssignmentAnswerMode = "mcq" | "short_answer" | "long_answer";

export type SyncBadge = "Saved offline" | "Sync pending" | "Cloud generated" | "Local mode ready";

export type User = {
  id: string;
  name: string;
  role: Role;
  avatarInitials: string;
  accessibilityMode?: AccessibilityMode;
  preferredLanguage?: string;
};

export type Subject = {
  id: string;
  name: string;
  lessons: number;
  pendingAssignments: number;
  color: string;
  badge?: SyncBadge;
};

export type AccessibilityBreakdown = Record<AccessibilityMode, number>;

export type ClassSubject = {
  id: string;
  subject: string;
  teacherId?: string;
};

export type Classroom = {
  id: string;
  title: string;
  grade?: string;
  section?: string | null;
  schoolId?: string;
  classCode: string;
  students: number;
  subjects: string[];
  classSubjects?: ClassSubject[];
  accessibilityProfiles: number;
  accessibilityBreakdown: AccessibilityBreakdown;
};

export type LectureOutput = {
  standard: string;
  blindLowVision: string;
  dyslexiaFriendly: string;
  multilingual: string;
  slowLearner: string;
};

export type TeacherPdf = {
  fileName: string;
  pageCount: number;
  uploadedAt: string;
};

export type Lecture = {
  id: string;
  title: string;
  subject: string;
  source: string;
  sourceType: string;
  postedAt: string;
  teacherPdf: TeacherPdf;
  teacherNotes: string;
  status: string;
  diagramDescription: string;
  keyVocabulary: string[];
  practiceQuestions: string[];
  outputs: LectureOutput;
  badge: SyncBadge;
};

export type AssignmentQuestion = {
  id: string;
  prompt: string;
  hint?: string;
  options?: string[];
};

export type Assignment = {
  id: string;
  title: string;
  classroom: string;
  subject: string;
  linkedLecture: string;
  postedAt: string;
  dueDate: string;
  answerMode: AssignmentAnswerMode;
  versions: AccessibilityMode[];
  questions: AssignmentQuestion[];
  status: "Draft" | "Published";
};

export type Submission = {
  id: string;
  studentName: string;
  accessibilityProfile: AccessibilityMode;
  score: number | null;
  aiFeedbackStatus: "Ready" | "Generating" | "Needs review";
  status: "Graded" | "Pending";
};

export type ImageQualityCheck = {
  label: "Focus" | "Lighting" | "Crop";
  status: "Good" | "Needs Review";
};

export type SourceCard = {
  topic: string;
  sourceType: string;
  confidence: number;
  detectedText: string[];
  diagramElements: string[];
  equations: string[];
  unclearRegions: string[];
  confidenceNotes: string[];
};

export type TeacherPack = {
  objective: string;
  keyConcepts: string[];
  teachingScript: string;
  classroomActivity: string;
  worksheet: string[];
  answerKey: string[];
  misconceptions: string[];
  differentiatedSupport: string;
};

export type StudentAccessPack = {
  screenReaderSummary: string;
  audioStudyScript: string;
  visualDescription: string;
  stepByStepExplanation: string;
  vocabulary: { term: string; meaning: string }[];
  steps: string[];
  practiceQuestions: string[];
  selfCheckAnswers: string[];
};

export type TrustPack = {
  runtimeMode: RuntimeMode;
  model: string;
  latency: string;
  schemaStatus: "Valid" | "Needs Repair";
  teacherReviewStatus: "Review Required" | "Approved";
  confidence: number;
  accessibilityWarnings: string[];
};

export type SafetyFlags = {
  sourceUnclear: boolean;
  possibleOcrError: boolean;
  teacherReviewRequired: boolean;
};

export type LessonPack = {
  id: string;
  title: string;
  classroomId?: string | null;
  classSubjectId?: string | null;
  grade: string;
  subject: string;
  language: string;
  learnerNeed: string;
  outputType: LessonOutputType;
  status: LessonStatus;
  runtimeMode: RuntimeMode;
  qualityChecks: ImageQualityCheck[];
  sourceCard: SourceCard;
  teacherPack: TeacherPack;
  studentAccessPack: StudentAccessPack;
  trustPack: TrustPack;
  safetyFlags: SafetyFlags;
};
