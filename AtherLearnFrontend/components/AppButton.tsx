import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle
} from "react-native";
import { colors, radii, spacing } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "success" | "warning";

type AppButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const variantStyles: Record<ButtonVariant, { background: string; border: string; text: string }> = {
  primary: { background: colors.primary, border: colors.primary, text: colors.white },
  secondary: { background: colors.secondary, border: colors.secondary, text: colors.white },
  outline: { background: colors.white, border: colors.border, text: colors.text },
  ghost: { background: "transparent", border: "transparent", text: colors.primary },
  success: { background: colors.success, border: colors.success, text: colors.white },
  warning: { background: colors.warning, border: colors.warning, text: colors.text }
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  leftIcon,
  fullWidth = true,
  style,
  textStyle
}: AppButtonProps) {
  const visual = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: visual.background,
          borderColor: visual.border,
          opacity: disabled ? 0.56 : pressed ? 0.88 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start"
        },
        style
      ]}
    >
      {loading ? <ActivityIndicator color={visual.text} /> : leftIcon}
      <Text style={[styles.text, { color: visual.text }, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700"
  }
});
