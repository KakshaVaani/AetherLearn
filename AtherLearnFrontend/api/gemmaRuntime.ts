import { LocalModelDefinition } from "@/api/modelCatalog";
import {
  deleteModel as deleteNativeModel,
  downloadModel as downloadNativeModel,
  generateWithNativeGemma,
  getDeviceCapabilities as getNativeDeviceCapabilities,
  getModelStatus as getNativeModelStatus,
  getSeededModelStatus as getNativeSeededModelStatus,
  importSeededModel as importNativeSeededModel
} from "@/api/nativeGemma";
import {
  DeviceCapabilities,
  GemmaGenerationRequest,
  GemmaGenerationResult,
  ModelStatus,
  SeededModelStatus
} from "@/api/gemmaRuntimeTypes";

export type {
  DeviceCapabilities,
  GemmaGenerationRequest,
  GemmaGenerationResult,
  GemmaRuntimeKind,
  ModelStatus,
  SeededModelStatus
} from "@/api/gemmaRuntimeTypes";

export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const capabilities = await getNativeDeviceCapabilities();
  const available = capabilities.nativeBridgeAvailable;
  return {
    ...capabilities,
    runtimeKind: available ? "android-native" : "unavailable",
    runtimeLabel: "On-device Gemma",
    webGpuAvailable: false
  };
}

export async function getModelStatus(model: LocalModelDefinition): Promise<ModelStatus> {
  const status = await getNativeModelStatus(model);
  return {
    ...status,
    ready: status.downloaded,
    source: status.downloaded ? "device-file" : "not-ready"
  };
}

export function getSeededModelStatus(model: LocalModelDefinition): Promise<SeededModelStatus> {
  return getNativeSeededModelStatus(model);
}

export async function downloadModel(model: LocalModelDefinition): Promise<ModelStatus> {
  const status = await downloadNativeModel(model);
  return {
    ...status,
    ready: status.downloaded,
    source: status.downloaded ? "device-file" : "not-ready"
  };
}

export async function importSeededModel(model: LocalModelDefinition): Promise<ModelStatus> {
  const status = await importNativeSeededModel(model);
  return {
    ...status,
    ready: status.downloaded,
    source: status.downloaded ? "device-file" : "not-ready"
  };
}

export function deleteModel(model: LocalModelDefinition) {
  return deleteNativeModel(model);
}

export async function generateWithGemma(
  model: LocalModelDefinition,
  request: GemmaGenerationRequest
): Promise<GemmaGenerationResult> {
  const result = await generateWithNativeGemma(model, request);
  return {
    ...result,
    runtimeMode: "On-device Gemma",
    runtimeKind: "android-native",
    modelLabel: model.label
  };
}
