import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { clearSession, getSession } from "@/api/session";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { LocalModelSettingsPanel } from "@/components/LocalModelSettingsPanel";
import { ManualSyncPanel } from "@/components/ManualSyncPanel";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { colors, radii, spacing } from "@/constants/theme";

function SettingsRow({
  icon,
  label,
  value
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </View>
  );
}

export default function SettingsScreen() {
  const [highContrast, setHighContrast] = useState(true);
  const [dyslexiaFont, setDyslexiaFont] = useState(true);
  const session = getSession();
  const roleLabel = session?.role
    ? `${session.role.charAt(0).toUpperCase()}${session.role.slice(1)} account`
    : "Signed in account";

  function handleLogout() {
    clearSession();
    router.replace("/");
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Badge label="Demo settings" tone="primary" />
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={30} color={colors.primary} />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{session?.name ?? "AtherLearn user"}</Text>
          <Text style={styles.profileEmail}>{roleLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>

      <SectionHeader title="App preferences" />
      <Card style={styles.card}>
        <SettingsRow icon="language-outline" label="App Language" value="English" />
        <SettingsRow icon="text-outline" label="Text Size" value="Large" />
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name="contrast-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>High Contrast</Text>
            <Text style={styles.rowValue}>Improves low-vision readability</Text>
          </View>
          <Switch value={highContrast} onValueChange={setHighContrast} trackColor={{ true: colors.successSoft }} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name="reader-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Dyslexia Friendly Font</Text>
            <Text style={styles.rowValue}>Mock toggle for the draft</Text>
          </View>
          <Switch value={dyslexiaFont} onValueChange={setDyslexiaFont} trackColor={{ true: colors.successSoft }} />
        </View>
      </Card>

      <SectionHeader title="System and storage" />
      <LocalModelSettingsPanel />
      {session?.role ? <ManualSyncPanel role={session.role} /> : null}

      <Pressable accessibilityRole="button" onPress={handleLogout} style={styles.signoutButton}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signoutText}>Log Out</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  title: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900"
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  profileText: {
    flex: 1,
    gap: 2
  },
  profileName: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  profileEmail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  card: {
    gap: spacing.lg
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  rowValue: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16
  },
  signoutButton: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  signoutText: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  }
});
