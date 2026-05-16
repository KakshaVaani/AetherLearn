import { AssignmentAnswerMode } from "@/types";

export const assignmentAnswerModeOptions: Array<{ label: string; value: AssignmentAnswerMode }> = [
  { label: "MCQ", value: "mcq" },
  { label: "Short answer", value: "short_answer" },
  { label: "Long answer", value: "long_answer" }
];

export function normalizeAssignmentAnswerMode(value?: string | null): AssignmentAnswerMode {
  const mode = (value ?? "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (mode === "mcq" || mode === "multiple_choice" || mode === "multiple_choice_question") {
    return "mcq";
  }
  if (mode === "long_answer" || mode === "long" || mode === "essay" || mode === "paragraph") {
    return "long_answer";
  }
  return "short_answer";
}

export function assignmentAnswerModeLabel(mode: AssignmentAnswerMode) {
  return assignmentAnswerModeOptions.find((item) => item.value === mode)?.label ?? "Short answer";
}
