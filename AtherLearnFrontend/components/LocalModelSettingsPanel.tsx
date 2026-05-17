import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { localModelCatalog } from "@/api/modelCatalog";
import { useDefaultModelPreference } from "@/api/localPreferences";
import {
  deleteModel,
  DeviceCapabilities,
  downloadModel,
  getDeviceCapabilities,
  getModelStatus,
  getSeededModelStatus,
  importSeededModel,
  ModelStatus,
  SeededModelStatus
} from "@/api/nativeGemma";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ModelModeSelector } from "@/components/ModelModeSelector";
import { LocalModelId } from "@/types";
import { colors, spacing } from "@/constants/theme";

const modelOrder: LocalModelId[] = ["gemma-4-e4b-it", "gemma-4-e2b-it"];

export function LocalModelSettingsPanel() {
  const [preference, setPreference] = useDefaultModelPreference();
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [statuses, setStatuses] = useState<Partial<Record<LocalModelId, ModelStatus>>>({});
  const [seededStatuses, setSeededStatuses] = useState<Partial<Record<LocalModelId, SeededModelStatus>>>({});
  const [busyModel, setBusyModel] = useState<LocalModelId | null>(null);
  const [message, setMessage] = useState("");

  const totalMemoryGb = useMemo(
    () => Math.round(((capabilities?.totalMemoryBytes ?? 0) / 1_000_000_000) * 10) / 10,
    [capabilities?.totalMemoryBytes]
  );

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

  async function handleDownload(modelId: LocalModelId) {
    setBusyModel(modelId);
    setMessage(`Downloading ${localModelCatalog[modelId].label}. Keep the app open.`);
    try {
      const status = await downloadModel(localModelCatalog[modelId]);
      setStatuses((current) => ({ ...current, [modelId]: status }));
      setMessage(`${localModelCatalog[modelId].label} is ready for local generation.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Model download failed.");
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
      setMessage(`${localModelCatalog[modelId].label} was removed from this device.`);
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

  const nativeReady = Boolean(capabilities?.nativeBridgeAvailable);
  const androidReady = nativeReady && (capabilities?.androidSdk ?? 0) >= 31;

  return (
    <>
      <Card style={styles.card}>
        <ModelModeSelector value={preference} onChange={setPreference} label="Default AI model" />
        <View style={styles.capabilityRow}>
          <Badge label={nativeReady ? "Native bridge ready" : "Native bridge missing"} tone={nativeReady ? "success" : "warning"} />
          <Badge
            label={androidReady ? "Android 12+" : "Android dev build needed"}
            tone={androidReady ? "success" : "warning"}
          />
          <Badge label={totalMemoryGb ? `${totalMemoryGb} GB RAM` : "RAM unknown"} tone="neutral" />
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="hardware-chip-outline" size={21} color={colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>On-device Models</Text>
            <Text style={styles.subtitle}>Downloads stay on this Android device.</Text>
          </View>
        </View>

        {modelOrder.map((modelId) => {
          const model = localModelCatalog[modelId];
          const status = statuses[modelId];
          const seededStatus = seededStatuses[modelId];
          const enoughRam = totalMemoryGb >= model.minDeviceMemoryGb;
          const enoughStorage = (capabilities?.freeStorageBytes ?? 0) >= model.minFreeStorageBytes;
          const canDownload = androidReady && enoughRam && enoughStorage;
          const downloaded = Boolean(status?.downloaded);
          const seedAvailable = Boolean(seededStatus?.available);
          const isSeededModel = modelId === "gemma-4-e2b-it";
          return (
            <View key={model.id} style={styles.modelRow}>
              <View style={styles.modelCopy}>
                <Text style={styles.modelTitle}>{model.label}</Text>
                <Text style={styles.modelMeta}>
                  {formatGb(model.sizeInBytes)} GB, needs {model.minDeviceMemoryGb} GB RAM
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
                {!downloaded && !canDownload ? (
                  <Text style={styles.warning}>
                    {!androidReady
                      ? "Build the Android dev client first."
                      : !enoughRam
                        ? "This device does not have enough RAM."
                        : "Free more storage before downloading."}
                  </Text>
                ) : null}
              </View>
              <View style={styles.modelAction}>
                <Badge label={downloaded ? "Installed" : "Not installed"} tone={downloaded ? "success" : "neutral"} />
                <AppButton
                  title={downloaded ? "Delete" : "Download"}
                  variant={downloaded ? "outline" : "secondary"}
                  fullWidth={false}
                  disabled={!downloaded && !canDownload}
                  loading={busyModel === modelId}
                  onPress={() => (downloaded ? handleDelete(modelId) : handleDownload(modelId))}
                  style={styles.modelButton}
                  textStyle={styles.modelButtonText}
                />
                {isSeededModel && !downloaded && seedAvailable ? (
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
  message: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  }
});
