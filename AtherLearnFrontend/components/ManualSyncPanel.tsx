import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSyncSummary, runManualSync } from "@/api/sync";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Role } from "@/types";
import { colors, spacing } from "@/constants/theme";

type Props = {
  role: Role;
};

type Summary = Awaited<ReturnType<typeof getSyncSummary>>;

const emptySummary: Summary = {
  queued: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  conflict: 0,
  local_only: 0,
  lastSyncedAt: null
};

export function ManualSyncPanel({ role }: Props) {
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function refresh() {
    setSummary(await getSyncSummary());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setMessage("");
    try {
      const result = await runManualSync(role);
      setSummary(result.summary);
      setMessage(`Pushed ${result.pushed}, pulled ${result.pulled}.`);
    } catch (error) {
      await refresh();
      setMessage(error instanceof Error ? error.message : "Sync failed. Try again when online.");
    } finally {
      setSyncing(false);
    }
  }

  const hasIssues = summary.failed > 0 || summary.conflict > 0;
  const tone = hasIssues ? "warning" : summary.queued > 0 ? "secondary" : "success";

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="sync-outline" size={21} color={colors.secondary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Manual Sync</Text>
          <Text style={styles.subtitle}>
            {summary.lastSyncedAt ? `Last synced ${formatDateTime(summary.lastSyncedAt)}` : "Local queue ready"}
          </Text>
        </View>
        <Badge label={summary.queued > 0 ? `${summary.queued} queued` : "Up to date"} tone={tone} />
      </View>

      <View style={styles.counts}>
        <Count label="Queued" value={summary.queued} />
        <Count label="Synced" value={summary.synced} />
        <Count label="Failed" value={summary.failed} danger={summary.failed > 0} />
        <Count label="Conflicts" value={summary.conflict} danger={summary.conflict > 0} />
      </View>

      {message ? <Text style={[styles.message, hasIssues && styles.warningMessage]}>{message}</Text> : null}

      <AppButton
        title="Sync Now"
        variant={summary.queued > 0 ? "secondary" : "outline"}
        loading={syncing}
        leftIcon={
          <Ionicons
            name="cloud-upload-outline"
            size={18}
            color={summary.queued > 0 ? colors.white : colors.text}
          />
        }
        onPress={handleSync}
      />
    </Card>
  );
}

function Count({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <View style={styles.count}>
      <Text style={[styles.countValue, danger && styles.danger]}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
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
  counts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  count: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 72,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm
  },
  countValue: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  countLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700"
  },
  danger: {
    color: colors.danger
  },
  message: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  },
  warningMessage: {
    color: colors.warning
  }
});
