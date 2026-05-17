import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";
import { LocalModelDefinition } from "@/api/modelCatalog";

export type DeviceCapabilities = {
  platform: string;
  androidSdk: number;
  totalMemoryBytes: number;
  availableMemoryBytes: number;
  freeStorageBytes: number;
  modelDirectory?: string;
  seedDirectory?: string;
  nativeBridgeAvailable: boolean;
};

export type ModelStatus = {
  modelId: string;
  downloaded: boolean;
  path?: string;
  bytes: number;
};

export type SeededModelStatus = {
  modelId: string;
  available: boolean;
  path?: string;
  bytes: number;
  expectedPath?: string;
};

export type NativeGenerationRequest = {
  modelId: string;
  prompt: string;
  systemInstruction: string;
  expectedJson?: boolean;
};

export type NativeGenerationResult = {
  text: string;
  latencyMs: number;
  modelPath?: string;
};

type AetherGemmaModule = {
  getDeviceCapabilities(): Promise<DeviceCapabilities>;
  getModelStatus(modelId: string): Promise<ModelStatus>;
  getSeededModelStatus(modelId: string, modelFile: string): Promise<SeededModelStatus>;
  downloadModel(modelId: string, modelFile: string, commitHash: string): Promise<ModelStatus>;
  importSeededModel(modelId: string, modelFile: string): Promise<ModelStatus>;
  deleteModel(modelId: string): Promise<{ modelId: string; deleted: boolean }>;
  generate(request: NativeGenerationRequest): Promise<NativeGenerationResult>;
};

function bridge(): AetherGemmaModule | null {
  if (Platform.OS !== "android") return null;
  try {
    return requireNativeModule<AetherGemmaModule>("AetherGemma");
  } catch {
    return null;
  }
}

export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const native = bridge();
  if (!native) {
    return {
      platform: Platform.OS,
      androidSdk: 0,
      totalMemoryBytes: 0,
      availableMemoryBytes: 0,
      freeStorageBytes: 0,
      nativeBridgeAvailable: false
    };
  }
  return native.getDeviceCapabilities();
}

export async function getModelStatus(model: LocalModelDefinition): Promise<ModelStatus> {
  const native = bridge();
  if (!native) return { modelId: model.id, downloaded: false, bytes: 0 };
  return native.getModelStatus(model.modelId);
}

export async function getSeededModelStatus(model: LocalModelDefinition): Promise<SeededModelStatus> {
  const native = bridge();
  if (!native) return { modelId: model.id, available: false, bytes: 0 };
  return native.getSeededModelStatus(model.modelId, model.modelFile);
}

export async function downloadModel(model: LocalModelDefinition): Promise<ModelStatus> {
  const native = bridge();
  if (!native) throw new Error("Native Gemma bridge is unavailable. Build an Android development client.");
  return native.downloadModel(model.modelId, model.modelFile, model.commitHash);
}

export async function importSeededModel(model: LocalModelDefinition): Promise<ModelStatus> {
  const native = bridge();
  if (!native) throw new Error("Native Gemma bridge is unavailable. Build an Android development client.");
  return native.importSeededModel(model.modelId, model.modelFile);
}

export async function deleteModel(model: LocalModelDefinition) {
  const native = bridge();
  if (!native) return { modelId: model.id, deleted: false };
  return native.deleteModel(model.modelId);
}

export async function generateWithNativeGemma(
  model: LocalModelDefinition,
  request: Omit<NativeGenerationRequest, "modelId">
) {
  const native = bridge();
  if (!native) throw new Error("Native Gemma bridge is unavailable. Build an Android development client.");
  return native.generate({ ...request, modelId: model.modelId });
}

export async function isNativeGemmaAvailable() {
  return Boolean(bridge());
}
