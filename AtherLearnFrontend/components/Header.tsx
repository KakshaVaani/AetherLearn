import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";

type HeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showSettings?: boolean;
  onBack?: () => void;
};

export function Header({ title, subtitle, showBack = false, showSettings = true, onBack }: HeaderProps) {
  const segments = useSegments();

  function openSettings() {
    if (segments[0] === "(student)") {
      router.push("/(student)/profile");
      return;
    }

    router.push("/(tabs)/settings");
  }

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack ?? (() => router.back())}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {showSettings ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={openSettings}
          style={styles.iconButton}
        >
          <Ionicons name="settings-outline" size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  titleBlock: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  }
});
