import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { localModelCatalog } from "@/api/modelCatalog";
import { useDefaultModelPreference } from "@/api/localPreferences";
import {
  deleteModel,
  DeviceCapabilities,
  downloadModel,
  generateWithGemma,
  getDeviceCapabilities,
  getModelStatus,
  getSeededModelStatus,
  importSeededModel,
  ModelStatus,
  SeededModelStatus
} from "@/api/gemmaRuntime";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ModelModeSelector } from "@/components/ModelModeSelector";
import { LocalModelId } from "@/types";
import { colors, spacing } from "@/constants/theme";

const modelOrder: LocalModelId[] = ["gemma-4-e2b-it", "gemma-4-e4b-it"];

export function LocalModelSettingsPanel() {
  const [preference, setPreference] = useDefaultModelPreference();
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [statuses, setStatuses] = useState<Partial<Record<LocalModelId, ModelStatus>>>({});
  const [seededStatuses, setSeededStatuses] = useState<Partial<Record<LocalModelId, SeededModelStatus>>>({});
  const [busyModel, setBusyModel] = useState<LocalModelId | null>(null);
  const [testingModel, setTestingModel] = useState<LocalModelId | null>(null);
  const [testPrompt, setTestPrompt] = useState("Explain photosynthesis for a Grade 7 student in 3 short bullets.");
  const [testOutput, setTestOutput] = useState("");
  const [message, setMessage] = useState("");

  const totalMemoryGb = useMemo(
    () => Math.round(((capabilities?.totalMemoryBytes ?? 0) / 1_000_000_000) * 10) / 10,
    [capabilities?.totalMemoryBytes]
  );
  const isWebRuntime = capabilities?.platform === "web";
  const runtimeReady = Boolean(capabilities && capabilities.runtimeKind !== "unavailable");
  const androidReady = capabilities?.runtimeKind === "android-native" && (capabilities?.androidSdk ?? 0) >= 31;
  const webReady = capabilities?.runtimeKind === "browser-webgpu";

  async function refresh() {
    const nextCapabilities = await getDeviceCapabilities();
    setCapabilities(nextCapabilities);
    const nextStatuses: Partial<Record<LocalModelId, ModelStatus>> = {};
    const nextSeededStatuses: Partial<Record<LocalModelId, SeededModelStatus>> = {};
    for (const modelId of modelOrder) {
      const model = localModelCatalog[modelId];
      nextStatuses[modelId] = await getModelStatus(model);
      if (modelId === "gemma-4-e2b-it" && nextCapabilities.seededModelImportAvailable) {
        nextSeededStatuses[modelId] = await getSeededModelStatus(model);
      }
    }
    setStatuses(nextStatuses);
    setSeededStatuses(nextSeededStatuses);
  }

  useEffect(() => {
    void refresh().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not refresh local model status.");
    });
  }, []);

  async function handlePrepare(modelId: LocalModelId) {
    const model = localModelCatalog[modelId];
    setBusyModel(modelId);
    setMessage(
      isWebRuntime
        ? `Initializing ${model.label} in this browser. First run downloads about ${formatGb(model.webSizeInBytes)} GB.`
        : `Downloading ${model.label}. Keep the app open.`
    );
    try {
      const status = await downloadModel(model);
      setStatuses((current) => ({ ...current, [modelId]: status }));
      setMessage(
        isWebRuntime
          ? `${model.label} is ready for browser-local generation in this tab.`
          : `${model.label} is ready for local generation.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Model initialization failed.");
    } finally {
      setBusyModel(null);
    }
  }

  async function handleDelete(modelId: LocalModelId) {
    setBusyModel(modelId);
    setMessage("");
    try {
      await deleteModel(localModelCatalog[modelId]);
      await refresh();
      setMessage(
        isWebRuntime
          ? `${localModelCatalog[modelId].label} was cleared from this browser session.`
          : `${localModelCatalog[modelId].label} was removed from this device.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove model.");
    } finally {
      setBusyModel(null);
    }
  }

  async function handleImportSeededModel(modelId: LocalModelId) {
    setBusyModel(modelId);
    setMessage(`Importing seeded ${localModelCatalog[modelId].label}.`);
    try {
      const status = await importSeededModel(localModelCatalog[modelId]);
      setStatuses((current) => ({ ...current, [modelId]: status }));
      await refresh();
      setMessage(`${localModelCatalog[modelId].label} was imported from the seeded file.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import seeded model.");
    } finally {
      setBusyModel(null);
    }
  }

  async function handleTest(modelId: LocalModelId) {
    const model = localModelCatalog[modelId];
    setTestingModel(modelId);
    setTestOutput("");
    setMessage(`Running a local ${model.label} test prompt.`);
    try {
      const result = await generateWithGemma(model, {
        prompt: testPrompt,
        systemInstruction: "You are a concise classroom assistant. Answer using plain, student-friendly language.",
        expectedJson: false
      });
      setTestOutput(result.text.trim());
      await refresh();
      setMessage(`${result.runtimeMode} answered locally with ${model.label} in ${result.latencyMs} ms.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Local test prompt failed.");
    } finally {
      setTestingModel(null);
    }
  }

  const selectedTestModel: LocalModelId = preference === "local-e4b" ? "gemma-4-e4b-it" : "gemma-4-e2b-it";
  return (
    <>
      <Card style={styles.card}>
        <ModelModeSelector value={preference} onChange={setPreference} label="Default AI model" />
        <View style={styles.capabilityRow}>
          {isWebRuntime ? (
            <Badge label={webReady ? "WebGPU ready" : "WebGPU unavailable"} tone={webReady ? "success" : "warning"} />
          ) : (
            <Badge
              label={capabilities?.nativeBridgeAvailable ? "Native bridge ready" : "Native bridge missing"}
              tone={capabilities?.nativeBridgeAvailable ? "success" : "warning"}
            />
          )}
          {!isWebRuntime ? (
            <Badge
              label={androidReady ? "Android 12+" : "Android dev build needed"}
              tone={androidReady ? "success" : "warning"}
            />
          ) : null}
          <Badge label={totalMemoryGb ? `${totalMemoryGb} GB RAM` : "RAM unknown"} tone="neutral" />
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="hardware-chip-outline" size={21} color={colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{isWebRuntime ? "Browser Gemma Models" : "On-device Models"}</Text>
            <Text style={styles.subtitle}>
              {isWebRuntime
                ? "Initialize Gemma 4 in a WebGPU browser. The model runs locally after download."
                : "Downloads stay on this Android device."}
            </Text>
          </View>
        </View>

        {modelOrder.map((modelId) => {
          const model = localModelCatalog[modelId];
          const status = statuses[modelId];
          const seededStatus = seededStatuses[modelId];
          const modelBytes = isWebRuntime ? model.webSizeInBytes : model.sizeInBytes;
          const storageNeed = isWebRuntime ? model.webSizeInBytes : model.minFreeStorageBytes;
          const enoughRam = totalMemoryGb === 0 || totalMemoryGb >= model.minDeviceMemoryGb;
          const enoughStorage = (capabilities?.freeStorageBytes ?? 0) === 0 || (capabilities?.freeStorageBytes ?? 0) >= storageNeed;
          const canPrepare = Boolean(runtimeReady && (isWebRuntime ? webReady : androidReady) && enoughRam && enoughStorage);
          const ready = Boolean(status?.ready ?? status?.downloaded);
          const seedAvailable = Boolean(seededStatus?.available);
          const isSeededModel = modelId === "gemma-4-e2b-it";
          return (
            <View key={model.id} style={styles.modelRow}>
              <View style={styles.modelCopy}>
                <Text style={styles.modelTitle}>{model.label}</Text>
                <Text style={styles.modelMeta}>
                  {formatGb(modelBytes)} GB {isWebRuntime ? "web task" : "LiteRT model"}, needs {model.minDeviceMemoryGb} GB RAM
                </Text>
                {isSeededModel && capabilities?.seededModelImportAvailable && capabilities.seedDirectory ? (
                  <View style={styles.seedBox}>
                    <Text style={styles.seedTitle}>Seed path</Text>
                    <Text style={styles.seedText}>
                      {`${capabilities.seedDirectory}/${model.modelFile}`}
                    </Text>
                    <Text style={styles.seedHint}>
                      {seedAvailable
                        ? "Seed file detected. Import it to avoid downloading again."
                        : "Place the file here with adb push, then reopen Settings or tap refresh by revisiting this screen."}
                    </Text>
                  </View>
                ) : null}
                {!ready && !canPrepare ? (
                  <Text style={styles.warning}>
                    {isWebRuntime && !webReady
                      ? "Open the live demo in a WebGPU-capable Chrome or Edge browser."
                      : !androidReady && !isWebRuntime
                        ? "Build the Android dev client first."
                        : !enoughRam
                          ? "This device does not report enough RAM."
                          : "Free more storage before initializing."}
                  </Text>
                ) : null}
              </View>
              <View style={styles.modelAction}>
                <Badge
                  label={ready ? (isWebRuntime ? "Ready" : "Installed") : (isWebRuntime ? "Not initialized" : "Not installed")}
                  tone={ready ? "success" : "neutral"}
                />
                <AppButton
                  title={isWebRuntime ? (ready ? "Reinitialize" : "Initialize in browser") : (ready ? "Delete" : "Download")}
                  variant={ready && !isWebRuntime ? "outline" : "secondary"}
                  fullWidth={false}
                  disabled={!ready && !canPrepare}
                  loading={busyModel === modelId}
                  onPress={() => (ready && !isWebRuntime ? handleDelete(modelId) : handlePrepare(modelId))}
                  style={styles.modelButton}
                  textStyle={styles.modelButtonText}
                />
                {isWebRuntime && ready ? (
                  <AppButton
                    title="Clear session"
                    variant="outline"
                    fullWidth={false}
                    loading={busyModel === modelId}
                    onPress={() => handleDelete(modelId)}
                    style={styles.modelButton}
                    textStyle={styles.modelButtonText}
                  />
                ) : null}
                {isSeededModel && !ready && seedAvailable ? (
                  <AppButton
                    title="Import seeded model"
                    variant="outline"
                    fullWidth={false}
                    loading={busyModel === modelId}
                    onPress={() => handleImportSeededModel(modelId)}
                    style={styles.modelButton}
                    textStyle={styles.modelButtonText}
                  />
                ) : null}
              </View>
            </View>
          );
        })}

        {isWebRuntime ? (
          <View style={styles.testBox}>
            <Text style={styles.seedTitle}>Browser-local test prompt</Text>
            <TextInput
              value={testPrompt}
              onChangeText={setTestPrompt}
              multiline
              placeholder="Ask a short classroom question"
              placeholderTextColor={colors.muted}
              style={styles.testInput}
            />
            <AppButton
              title={`Test ${localModelCatalog[selectedTestModel].label}`}
              variant="outline"
              fullWidth={false}
              disabled={!webReady || !testPrompt.trim()}
              loading={testingModel === selectedTestModel}
              onPress={() => handleTest(selectedTestModel)}
              style={styles.testButton}
              textStyle={styles.modelButtonText}
            />
            {testOutput ? <Text style={styles.testOutput}>{testOutput}</Text> : null}
          </View>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Card>
    </>
  );
}

function formatGb(bytes: number) {
  return (bytes / 1_000_000_000).toFixed(1);
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  capabilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  headerCopy: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  modelRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center"
  },
  modelCopy: {
    flex: 1,
    gap: 6
  },
  modelTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  modelMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  modelAction: {
    alignItems: "flex-end",
    gap: spacing.sm
  },
  modelButton: {
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  modelButtonText: {
    fontSize: 13,
    lineHeight: 18
  },
  warning: {
    color: colors.warning,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700"
  },
  seedBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4
  },
  seedTitle: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800"
  },
  seedText: {
    color: colors.secondary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700"
  },
  seedHint: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  },
  testBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm
  },
  testInput: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    padding: spacing.sm,
    textAlignVertical: "top"
  },
  testButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingHorizontal: spacing.md
  },
  testOutput: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm
  },
  message: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  }
});
