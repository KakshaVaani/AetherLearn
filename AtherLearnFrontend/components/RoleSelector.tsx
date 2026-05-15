import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@/constants/theme";
import { Role } from "@/types";

type RoleSelectorProps = {
  selectedRole: Role;
  onSelectRole: (role: Role) => void;
};

const options: Array<{ role: Role; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }> = [
  {
    role: "teacher",
    title: "Teacher",
    subtitle: "Upload lessons, generate versions, review progress",
    icon: "school-outline"
  },
  {
    role: "student",
    title: "Student",
    subtitle: "Learn with notes, audio, practice, and feedback",
    icon: "book-outline"
  }
];

export function RoleSelector({ selectedRole, onSelectRole }: RoleSelectorProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = selectedRole === option.role;

        return (
          <Pressable
            key={option.role}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onSelectRole(option.role)}
            style={[
              styles.option,
              selected && {
                borderColor: colors.primary,
                backgroundColor: colors.primarySoft
              }
            ]}
          >
            <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
              <Ionicons
                name={option.icon}
                size={22}
                color={selected ? colors.white : colors.primary}
              />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{option.title}</Text>
              <Text style={styles.subtitle}>{option.subtitle}</Text>
            </View>
            {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  option: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  iconWrapSelected: {
    backgroundColor: colors.primary
  },
  textBlock: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  }
});
