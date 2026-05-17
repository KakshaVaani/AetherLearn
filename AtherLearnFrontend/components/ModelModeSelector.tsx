import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { modelPreferenceLabels, modelPreferenceOptions } from "@/api/modelCatalog";
import { ModelPreference } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

type Props = {
  value: ModelPreference;
  onChange: (preference: ModelPreference) => void;
  label?: string;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

const icons: Record<ModelPreference, keyof typeof Ionicons.glyphMap> = {
  "local-auto": "phone-portrait-outline",
  "local-e4b": "hardware-chip-outline",
  "local-e2b": "flash-outline",
  "remote-gemini": "cloud-outline"
};

function subtitleFor(preference: ModelPreference) {
  const web = Platform.OS === "web";
  const subtitles: Record<ModelPreference, string> = {
    "local-auto": web ? "E2B, then E4B" : "E4B, then E2B",
    "local-e4b": web ? "2.96 GB WebGPU task" : "High-end Android",
    "local-e2b": web ? "2.0 GB WebGPU task" : "Phone fallback",
    "remote-gemini": "Backend API"
  };
  return subtitles[preference];
}

export function ModelModeSelector({
  value,
  onChange,
  label = "AI model",
  disabled = false,
  compact = false,
  style
}: Props) {
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.grid, compact && styles.compactGrid]}>
        {modelPreferenceOptions.map((preference) => {
          const selected = value === preference;
          return (
            <Pressable
              key={preference}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(preference)}
              style={({ pressed }) => [
                styles.option,
                compact && styles.compactOption,
                selected && styles.optionSelected,
                disabled && styles.optionDisabled,
                pressed && !disabled && styles.optionPressed
              ]}
            >
              <Ionicons
                name={icons[preference]}
                size={18}
                color={selected ? colors.primaryDark : colors.muted}
              />
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {modelPreferenceLabels[preference]}
                </Text>
                {!compact ? <Text style={styles.optionSubtitle}>{subtitleFor(preference)}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm
  },
  label: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  compactGrid: {
    gap: spacing.xs
  },
  option: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  compactOption: {
    flexBasis: "48%",
    minHeight: 44
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  optionDisabled: {
    opacity: 0.56
  },
  optionPressed: {
    opacity: 0.86
  },
  optionText: {
    flex: 1,
    minWidth: 0
  },
  optionLabel: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  optionLabelSelected: {
    color: colors.primaryDark
  },
  optionSubtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15
  }
});
