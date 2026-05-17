import { LocalModelDefinition } from "@/api/modelCatalog";
import { RuntimeMode } from "@/types";

export type GemmaRuntimeKind = "android-native" | "browser-webgpu" | "unavailable";

export type DeviceCapabilities = {
  platform: string;
  androidSdk: number;
  totalMemoryBytes: number;
  availableMemoryBytes: number;
  freeStorageBytes: number;
  modelDirectory?: string;
  seedDirectory?: string;
  nativeBridgeAvailable: boolean;
  seededModelImportAvailable?: boolean;
  runtimeKind: GemmaRuntimeKind;
  runtimeLabel: RuntimeMode;
  webGpuAvailable?: boolean;
  browserStorageQuotaBytes?: number;
  browserStorageUsageBytes?: number;
};

export type ModelStatus = {
  modelId: string;
  downloaded: boolean;
  path?: string;
  bytes: number;
  ready?: boolean;
  source?: "device-file" | "browser-session" | "not-ready";
};

export type SeededModelStatus = {
  modelId: string;
  available: boolean;
  path?: string;
  bytes: number;
  expectedPath?: string;
};

export type GemmaGenerationRequest = {
  prompt: string;
  systemInstruction: string;
  expectedJson?: boolean;
};

export type GemmaGenerationResult = {
  text: string;
  latencyMs: number;
  modelPath?: string;
  runtimeMode: RuntimeMode;
  runtimeKind: GemmaRuntimeKind;
  modelLabel: string;
};

export type GemmaRuntime = {
  getDeviceCapabilities: () => Promise<DeviceCapabilities>;
  getModelStatus: (model: LocalModelDefinition) => Promise<ModelStatus>;
  getSeededModelStatus: (model: LocalModelDefinition) => Promise<SeededModelStatus>;
  downloadModel: (model: LocalModelDefinition) => Promise<ModelStatus>;
  importSeededModel: (model: LocalModelDefinition) => Promise<ModelStatus>;
  deleteModel: (model: LocalModelDefinition) => Promise<{ modelId: string; deleted: boolean }>;
  generateWithGemma: (
    model: LocalModelDefinition,
    request: GemmaGenerationRequest
  ) => Promise<GemmaGenerationResult>;
};
