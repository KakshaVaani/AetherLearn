import { ReactNode, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type WebDemoShellProps = {
  children: ReactNode;
};

const palette = {
  ink: "#102033",
  muted: "#607085",
  blue: "#2563EB",
  teal: "#0F766E",
  saffron: "#F59E0B",
  paper: "#F7FAFC",
  white: "#FFFFFF",
  border: "#DCE6F2",
  dark: "#111827"
};

export function WebDemoShell({ children }: WebDemoShellProps) {
  const { width, height } = useWindowDimensions();
  const [fullDemo, setFullDemo] = useState(false);
  const desktop = Platform.OS === "web" && width >= 960;

  if (!desktop || fullDemo) {
    return <>{children}</>;
  }

  const phoneHeight = Math.min(Math.max(height - 96, 620), 760);
  const phoneWidth = Math.min(390, Math.max(340, Math.round(phoneHeight * 0.49)));

  return (
    <View style={styles.page}>
      <View style={styles.content}>
        <View style={styles.previewColumn}>
          <View style={[styles.phone, { width: phoneWidth, height: phoneHeight }]}>
            <View style={styles.speaker} />
            <View style={styles.phoneScreen}>{children}</View>
          </View>
        </View>

        <View style={styles.storyColumn}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="accessibility-outline" size={24} color={palette.white} />
            </View>
            <Text style={styles.brandText}>AtherLearn</Text>
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.title}>AI learning that still works when the classroom is offline.</Text>
            <Text style={styles.lede}>
              We built AtherLearn for teachers and students who cannot assume fast devices,
              reliable internet, or one-size-fits-all lessons.
            </Text>
          </View>

          <View style={styles.reasonGrid}>
            <ReasonCard
              icon="school-outline"
              title="For teachers"
              body="Upload one lesson and review classroom progress from a simple mobile workflow."
              tint={palette.teal}
            />
            <ReasonCard
              icon="book-outline"
              title="For students"
              body="Get notes, practice, audio support, and feedback shaped around each learner."
              tint={palette.blue}
            />
            <ReasonCard
              icon="shield-checkmark-outline"
              title="For low connectivity"
              body="Demo data, local storage, and optional on-device AI keep the experience usable."
              tint={palette.saffron}
            />
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFullDemo(true)}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
            >
              <Text style={styles.primaryActionText}>Open full demo</Text>
              <Ionicons name="expand-outline" size={20} color={palette.white} />
            </Pressable>
            <Text style={styles.helperText}>The phone frame is the real app, not screenshots.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ReasonCard({
  icon,
  title,
  body,
  tint
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  tint: string;
}) {
  return (
    <View style={styles.reasonCard}>
      <View style={[styles.reasonIcon, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={styles.reasonCopy}>
        <Text style={styles.reasonTitle}>{title}</Text>
        <Text style={styles.reasonBody}>{body}</Text>
      </View>
    </View>
  );
}

const phoneShadow = {
  shadowColor: "#07111F",
  shadowOffset: { width: 0, height: 28 },
  shadowOpacity: 0.24,
  shadowRadius: 42,
  elevation: 12
};

const cardShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.08,
  shadowRadius: 28,
  elevation: 4
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: "100vh" as never,
    backgroundColor: palette.paper
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    paddingHorizontal: 32,
    paddingVertical: 40
  },
  previewColumn: {
    alignItems: "center",
    justifyContent: "center"
  },
  phone: {
    borderRadius: 46,
    backgroundColor: palette.dark,
    borderWidth: 10,
    borderColor: "#172033",
    paddingTop: 22,
    paddingHorizontal: 10,
    paddingBottom: 10,
    overflow: "hidden",
    ...phoneShadow
  },
  speaker: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    width: 72,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#344157",
    zIndex: 2
  },
  phoneScreen: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 34,
    backgroundColor: "#F6F8FC"
  },
  storyColumn: {
    width: 520,
    maxWidth: "46%" as never,
    gap: 30
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.blue
  },
  brandText: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900"
  },
  copyBlock: {
    gap: 18
  },
  title: {
    color: palette.ink,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "900"
  },
  lede: {
    color: palette.muted,
    fontSize: 18,
    lineHeight: 30
  },
  reasonGrid: {
    gap: 14
  },
  reasonCard: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    ...cardShadow
  },
  reasonIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  reasonCopy: {
    flex: 1,
    gap: 4
  },
  reasonTitle: {
    color: palette.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  reasonBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21
  },
  actionRow: {
    gap: 12
  },
  primaryAction: {
    alignSelf: "flex-start",
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: palette.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 22
  },
  primaryActionText: {
    color: palette.white,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  helperText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20
  },
  pressed: {
    opacity: 0.86
  }
});
