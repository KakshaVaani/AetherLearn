import { Platform } from "react-native";
import { LocalModelId, ModelPreference } from "@/types";

export type LocalModelDefinition = {
  id: LocalModelId;
  label: string;
  modelId: string;
  modelFile: string;
  commitHash: string;
  sizeInBytes: number;
  webModelFile: string;
  webModelUrl: string;
  webSizeInBytes: number;
  minDeviceMemoryGb: number;
  minFreeStorageBytes: number;
  taskTypes: string[];
};

export const localModelCatalog: Record<LocalModelId, LocalModelDefinition> = {
  "gemma-4-e2b-it": {
    id: "gemma-4-e2b-it",
    label: "Gemma 4 E2B",
    modelId: "litert-community/gemma-4-E2B-it-litert-lm",
    modelFile: "gemma-4-E2B-it.litertlm",
    commitHash: "6e5c4f1e395deb959c494953478fa5cec4b8008f",
    sizeInBytes: 2588147712,
    webModelFile: "gemma-4-E2B-it-web.task",
    webModelUrl:
      "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task",
    webSizeInBytes: 2_000_000_000,
    minDeviceMemoryGb: 8,
    minFreeStorageBytes: 2588147712 + 750_000_000,
    taskTypes: ["llm_chat", "llm_prompt_lab", "llm_agent_chat"]
  },
  "gemma-4-e4b-it": {
    id: "gemma-4-e4b-it",
    label: "Gemma 4 E4B",
    modelId: "litert-community/gemma-4-E4B-it-litert-lm",
    modelFile: "gemma-4-E4B-it.litertlm",
    commitHash: "28299f30ee4d43294517a4ac93abd6163412f07f",
    sizeInBytes: 3659530240,
    webModelFile: "gemma-4-E4B-it-web.task",
    webModelUrl:
      "https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it-web.task",
    webSizeInBytes: 2_960_000_000,
    minDeviceMemoryGb: 12,
    minFreeStorageBytes: 3659530240 + 1_000_000_000,
    taskTypes: ["llm_chat", "llm_prompt_lab", "llm_agent_chat"]
  }
};

export const modelPreferenceLabels: Record<ModelPreference, string> = {
  "local-auto": "Local - Auto",
  "local-e4b": "Local - E4B",
  "local-e2b": "Local - E2B",
  "remote-gemini": "Remote Gemini"
};

export const modelPreferenceOptions: ModelPreference[] = [
  "local-auto",
  "local-e4b",
  "local-e2b",
  "remote-gemini"
];

export function preferredLocalModels(preference: ModelPreference): LocalModelId[] {
  if (preference === "local-e4b") return ["gemma-4-e4b-it"];
  if (preference === "local-e2b") return ["gemma-4-e2b-it"];
  if (preference === "remote-gemini") return [];
  if (Platform.OS === "web") return ["gemma-4-e2b-it", "gemma-4-e4b-it"];
  return ["gemma-4-e4b-it", "gemma-4-e2b-it"];
}
