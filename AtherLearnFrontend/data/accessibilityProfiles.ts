import { AccessibilityMode } from "@/types";
import { colors } from "@/constants/theme";

export const accessibilityModes: AccessibilityMode[] = [
  "Standard",
  "Blind / Low Vision",
  "Dyslexia Friendly",
  "Multilingual",
  "Slow Learner"
];

export const accessibilityMeta: Record<
  AccessibilityMode,
  { label: AccessibilityMode; shortLabel: string; color: string; background: string }
> = {
  Standard: {
    label: "Standard",
    shortLabel: "Standard",
    color: colors.primary,
    background: colors.primarySoft
  },
  "Blind / Low Vision": {
    label: "Blind / Low Vision",
    shortLabel: "Vision",
    color: colors.secondary,
    background: colors.secondarySoft
  },
  "Dyslexia Friendly": {
    label: "Dyslexia Friendly",
    shortLabel: "Dyslexia",
    color: "#0E7490",
    background: "#CFFAFE"
  },
  Multilingual: {
    label: "Multilingual",
    shortLabel: "Language",
    color: colors.success,
    background: colors.successSoft
  },
  "Slow Learner": {
    label: "Slow Learner",
    shortLabel: "Paced",
    color: colors.warning,
    background: colors.warningSoft
  }
};
