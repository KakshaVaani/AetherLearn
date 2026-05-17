import { LocalModelDefinition } from "@/api/modelCatalog";
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

type MediaPipeGenAi = typeof import("@mediapipe/tasks-genai");
type LlmInferenceInstance = Awaited<ReturnType<MediaPipeGenAi["LlmInference"]["createFromOptions"]>>;

const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.27/wasm";

let activeModelId: string | null = null;
let activeLlm: LlmInferenceInstance | null = null;
let initializing: Promise<LlmInferenceInstance> | null = null;

function browserNavigator() {
  if (typeof navigator === "undefined") return null;
  return navigator as Navigator & {
    gpu?: unknown;
    deviceMemory?: number;
    storage?: {
      estimate?: () => Promise<{ quota?: number; usage?: number }>;
    };
  };
}

function hasWebGpu() {
  return Boolean(browserNavigator()?.gpu);
}

async function storageEstimate() {
  try {
    return await browserNavigator()?.storage?.estimate?.();
  } catch {
    return undefined;
  }
}

export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const nav = browserNavigator();
  const estimate = await storageEstimate();
  const quota = estimate?.quota ?? 0;
  const usage = estimate?.usage ?? 0;
  const deviceMemoryGb = nav?.deviceMemory ?? 0;
  return {
    platform: "web",
    androidSdk: 0,
    totalMemoryBytes: deviceMemoryGb ? deviceMemoryGb * 1_000_000_000 : 0,
    availableMemoryBytes: 0,
    freeStorageBytes: quota ? Math.max(quota - usage, 0) : 0,
    nativeBridgeAvailable: false,
    seededModelImportAvailable: false,
    runtimeKind: hasWebGpu() ? "browser-webgpu" : "unavailable",
    runtimeLabel: "Browser Gemma",
    webGpuAvailable: hasWebGpu(),
    browserStorageQuotaBytes: quota,
    browserStorageUsageBytes: usage
  };
}

export async function getModelStatus(model: LocalModelDefinition): Promise<ModelStatus> {
  const ready = activeModelId === model.id && Boolean(activeLlm);
  return {
    modelId: model.modelId,
    downloaded: ready,
    ready,
    path: model.webModelUrl,
    bytes: model.webSizeInBytes,
    source: ready ? "browser-session" : "not-ready"
  };
}

export async function getSeededModelStatus(model: LocalModelDefinition): Promise<SeededModelStatus> {
  return {
    modelId: model.modelId,
    available: false,
    bytes: 0,
    expectedPath: model.webModelUrl
  };
}

function webGpuError() {
  return new Error(
    "Browser Gemma needs WebGPU. Open this demo in a current Chrome or Edge browser with hardware acceleration enabled."
  );
}

function formatPrompt(request: GemmaGenerationRequest) {
  return [
    "<start_of_turn>system",
    request.systemInstruction,
    "<end_of_turn>",
    "<start_of_turn>user",
    request.prompt,
    "<end_of_turn>",
    "<start_of_turn>model"
  ].join("\n");
}

async function createLlm(model: LocalModelDefinition) {
  if (!hasWebGpu()) throw webGpuError();
  const { FilesetResolver, LlmInference } = await import("@mediapipe/tasks-genai");
  const genai = await FilesetResolver.forGenAiTasks(WASM_BASE_URL);
  const device = await LlmInference.createWebGpuDevice();
  return LlmInference.createFromOptions(genai, {
    baseOptions: {
      modelAssetPath: model.webModelUrl,
      delegate: "GPU",
      gpuOptions: { device }
    },
    maxTokens: 1200,
    topK: 40,
    temperature: 0.8,
    randomSeed: 101
  });
}

async function initialize(model: LocalModelDefinition) {
  if (activeModelId === model.id && activeLlm) return activeLlm;
  if (initializing && activeModelId === model.id) return initializing;

  activeLlm?.close();
  activeLlm = null;
  activeModelId = model.id;
  const targetModelId = model.id;
  const initPromise = createLlm(model)
    .then((llm) => {
      if (activeModelId !== targetModelId) {
        llm.close();
        throw new Error("Browser Gemma initialization was superseded by another model.");
      }
      activeLlm = llm;
      return llm;
    })
    .finally(() => {
      if (initializing === initPromise) {
        initializing = null;
      }
    });
  initializing = initPromise;
  return initializing;
}

export async function downloadModel(model: LocalModelDefinition): Promise<ModelStatus> {
  await initialize(model);
  return getModelStatus(model);
}

export function importSeededModel(model: LocalModelDefinition): Promise<ModelStatus> {
  return downloadModel(model);
}

export async function deleteModel(model: LocalModelDefinition) {
  if (activeModelId === model.id) {
    activeLlm?.close();
    activeLlm = null;
    activeModelId = null;
  }
  return { modelId: model.modelId, deleted: true };
}

export async function generateWithGemma(
  model: LocalModelDefinition,
  request: GemmaGenerationRequest
): Promise<GemmaGenerationResult> {
  const startedAt = Date.now();
  const llm = await initialize(model);
  const text = await llm.generateResponse(formatPrompt(request));
  return {
    text,
    latencyMs: Date.now() - startedAt,
    modelPath: model.webModelUrl,
    runtimeMode: "Browser Gemma",
    runtimeKind: "browser-webgpu",
    modelLabel: model.label
  };
}
