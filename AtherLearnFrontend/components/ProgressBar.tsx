import { StyleSheet, View } from "react-native";
import { colors, radii } from "@/constants/theme";

type ProgressBarProps = {
  value: number;
  color?: string;
};

export function ProgressBar({ value, color = colors.primary }: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(100, value))}%` as `${number}%`;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill
  }
});
