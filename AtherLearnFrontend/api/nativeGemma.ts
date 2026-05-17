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
  seededModelImportAvailable?: boolean;
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
  getDeviceCapabilities?: () => Promise<DeviceCapabilities>;
  getModelStatus?: (modelId: string) => Promise<ModelStatus>;
  getSeededModelStatus?: (modelId: string, modelFile: string) => Promise<SeededModelStatus>;
  downloadModel?: (modelId: string, modelFile: string, commitHash: string) => Promise<ModelStatus>;
  importSeededModel?: (modelId: string, modelFile: string) => Promise<ModelStatus>;
  deleteModel?: (modelId: string) => Promise<{ modelId: string; deleted: boolean }>;
  generate?: (request: NativeGenerationRequest) => Promise<NativeGenerationResult>;
};

function bridge(): AetherGemmaModule | null {
  if (Platform.OS !== "android") return null;
  try {
    return requireNativeModule<AetherGemmaModule>("AetherGemma");
  } catch {
    return null;
  }
}

function hasNativeFunction<Key extends keyof AetherGemmaModule>(
  native: AetherGemmaModule,
  key: Key
): native is AetherGemmaModule & Record<Key, NonNullable<AetherGemmaModule[Key]>> {
  return typeof native[key] === "function";
}

function fallbackDeviceCapabilities(): DeviceCapabilities {
  return {
    platform: Platform.OS,
    androidSdk: 0,
    totalMemoryBytes: 0,
    availableMemoryBytes: 0,
    freeStorageBytes: 0,
    nativeBridgeAvailable: false,
    seededModelImportAvailable: false
  };
}

function missingNativeMethodError(methodName: keyof AetherGemmaModule) {
  return new Error(`Native Gemma bridge is missing ${methodName}. Rebuild the Android development client.`);
}

export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const native = bridge();
  if (!native || !hasNativeFunction(native, "getDeviceCapabilities")) return fallbackDeviceCapabilities();
  try {
    const capabilities = await native.getDeviceCapabilities();
    return {
      ...capabilities,
      seededModelImportAvailable:
        hasNativeFunction(native, "getSeededModelStatus") && hasNativeFunction(native, "importSeededModel")
    };
  } catch {
    return fallbackDeviceCapabilities();
  }
}

export async function getModelStatus(model: LocalModelDefinition): Promise<ModelStatus> {
  const native = bridge();
  if (!native || !hasNativeFunction(native, "getModelStatus")) {
    return { modelId: model.id, downloaded: false, bytes: 0 };
  }
  try {
    return await native.getModelStatus(model.modelId);
  } catch {
    return { modelId: model.id, downloaded: false, bytes: 0 };
  }
}

export async function getSeededModelStatus(model: LocalModelDefinition): Promise<SeededModelStatus> {
  const native = bridge();
  if (!native || !hasNativeFunction(native, "getSeededModelStatus")) {
    return { modelId: model.id, available: false, bytes: 0 };
  }
  try {
    return await native.getSeededModelStatus(model.modelId, model.modelFile);
  } catch {
    return { modelId: model.id, available: false, bytes: 0 };
  }
}

export async function downloadModel(model: LocalModelDefinition): Promise<ModelStatus> {
  const native = bridge();
  if (!native) throw new Error("Native Gemma bridge is unavailable. Build an Android development client.");
  if (!hasNativeFunction(native, "downloadModel")) throw missingNativeMethodError("downloadModel");
  return native.downloadModel(model.modelId, model.modelFile, model.commitHash);
}

export async function importSeededModel(model: LocalModelDefinition): Promise<ModelStatus> {
  const native = bridge();
  if (!native) throw new Error("Native Gemma bridge is unavailable. Build an Android development client.");
  if (!hasNativeFunction(native, "importSeededModel")) throw missingNativeMethodError("importSeededModel");
  return native.importSeededModel(model.modelId, model.modelFile);
}

export async function deleteModel(model: LocalModelDefinition) {
  const native = bridge();
  if (!native || !hasNativeFunction(native, "deleteModel")) return { modelId: model.id, deleted: false };
  return native.deleteModel(model.modelId);
}

export async function generateWithNativeGemma(
  model: LocalModelDefinition,
  request: Omit<NativeGenerationRequest, "modelId">
) {
  const native = bridge();
  if (!native) throw new Error("Native Gemma bridge is unavailable. Build an Android development client.");
  if (!hasNativeFunction(native, "generate")) throw missingNativeMethodError("generate");
  return native.generate({ ...request, modelId: model.modelId });
}

export async function isNativeGemmaAvailable() {
  return Boolean(bridge());
}
