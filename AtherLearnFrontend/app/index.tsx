import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiClientError } from "@/api/client";
import { demoLogin } from "@/api/backend";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Role } from "@/types";

const palette = {
  blue: "#2563EB",
  navy: "#0F172A",
  teal: "#0F766E",
  background: "#F6F8FC",
  muted: "#64748B",
  border: "#E2E8F0",
  white: "#FFFFFF",
  blueSoft: "#EFF6FF",
  tealSoft: "#E6F7F4",
  violetSoft: "#F2EEFF"
};

export default function WelcomeScreen() {
  const [demoRole, setDemoRole] = useState<Role | null>(null);
  const [message, setMessage] = useState("");

  function openWorkspace(role: Role) {
    if (role === "teacher") {
      router.replace("/(teacher)/dashboard");
      return;
    }
    router.replace("/(student)/dashboard");
  }

  async function continueWithDemo(role: Role) {
    setDemoRole(role);
    setMessage("Opening demo workspace...");
    try {
      const user = await demoLogin(role);
      openWorkspace(user.role);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Demo login failed. Start the backend and run the seed script first."
      );
    } finally {
      setDemoRole(null);
    }
  }

  return (
    <ScreenContainer padded={false} contentStyle={styles.screen}>
      <View style={styles.backgroundBlob} />
      <View style={styles.headerBrand}>
        <View style={styles.logo}>
          <Ionicons name="accessibility-outline" size={25} color={palette.white} />
        </View>
        <Text style={styles.brandName}>AtherLearn</Text>
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.headline}>
          One lesson.{"\n"}
          <Text style={styles.headlineBlue}>Every </Text>
          <Text style={styles.headlineTeal}>learner.</Text>
        </Text>
        <Text style={styles.supporting}>
          Turn classroom materials into personalized learning experiences with the power of AI.
        </Text>
      </View>

      <HeroIllustration />

      <View style={styles.valueStrip}>
        <ValueItem icon="shield-checkmark-outline" tint={palette.teal} background={palette.tealSoft} title="Upload once" subtitle="Any lesson or material" />
        <View style={styles.valueDivider} />
        <ValueItem icon="sparkles-outline" tint={palette.blue} background={palette.violetSoft} title="AI creates" subtitle="Personalized versions" />
        <View style={styles.valueDivider} />
        <ValueItem icon="people-outline" tint={palette.blue} background={palette.blueSoft} title="Every learner" subtitle="Learns in the way that fits" />
      </View>

      <View style={styles.actions}>
        <AuthButton
          title="Create Account"
          icon="person-add-outline"
          onPress={() => router.push({ pathname: "/login", params: { mode: "signup" } })}
        />
        <AuthButton
          title="Log In"
          icon="log-in-outline"
          variant="outline"
          onPress={() => router.push({ pathname: "/login", params: { mode: "login" } })}
        />
      </View>

      <Divider label="Or explore first" />

      <View style={styles.demoRow}>
        <DemoButton
          title="Teacher Demo"
          icon="school-outline"
          tint={palette.teal}
          loading={demoRole === "teacher"}
          onPress={() => continueWithDemo("teacher")}
        />
        <DemoButton
          title="Student Demo"
          icon="book-outline"
          tint={palette.blue}
          loading={demoRole === "student"}
          onPress={() => continueWithDemo("student")}
        />
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.footerNote}>
        <Ionicons name="shield-checkmark-outline" size={18} color={palette.muted} />
        <Text style={styles.footerText}>
          Demo accounts are temporary and will be removed before public launch.
        </Text>
      </View>
    </ScreenContainer>
  );
}

function HeroIllustration() {
  return (
    <View style={styles.illustrationWrap}>
      <View style={styles.illustrationOrb} />
      <View style={styles.document}>
        <View style={styles.docLineLarge} />
        <View style={styles.docLine} />
        <View style={styles.docLineShort} />
      </View>
      <View style={styles.cloud}>
        <Ionicons name="arrow-up-outline" size={30} color={palette.white} />
      </View>
      <FloatingTile style={styles.tileLeft} icon="chatbubble-ellipses" tint={palette.teal} />
      <FloatingTile style={styles.tileRight} icon="headset" tint="#6D5DFB" />
      <FloatingTile style={styles.tileBottom} icon="image" tint={palette.blue} />
    </View>
  );
}

function FloatingTile({
  icon,
  tint,
  style
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.floatingTile, style]}>
      <Ionicons name={icon} size={22} color={tint} />
    </View>
  );
}

function ValueItem({
  icon,
  tint,
  background,
  title,
  subtitle
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  background: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.valueItem}>
      <View style={[styles.valueIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={21} color={tint} />
      </View>
      <Text style={styles.valueTitle}>{title}</Text>
      <Text style={styles.valueSubtitle}>{subtitle}</Text>
    </View>
  );
}

function AuthButton({
  title,
  icon,
  variant = "primary",
  onPress
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "outline";
  onPress: () => void;
}) {
  const isOutline = variant === "outline";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.authButton,
        isOutline ? styles.outlineButton : styles.primaryButton,
        pressed && styles.pressed
      ]}
    >
      <Ionicons name={icon} size={20} color={isOutline ? palette.navy : palette.white} />
      <Text style={[styles.authButtonText, isOutline && styles.outlineButtonText]}>{title}</Text>
    </Pressable>
  );
}

function DemoButton({
  title,
  icon,
  tint,
  loading,
  onPress
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.demoButton, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <View style={[styles.demoIcon, { backgroundColor: tint === palette.teal ? palette.tealSoft : palette.blueSoft }]}>
          <Ionicons name={icon} size={20} color={tint} />
        </View>
      )}
      <Text style={[styles.demoText, { color: tint }]}>{title}</Text>
    </Pressable>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const shadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.08,
  shadowRadius: 30,
  elevation: 5
};

const softShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 18,
  elevation: 3
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 30,
    gap: 22,
    backgroundColor: palette.background
  },
  backgroundBlob: {
    position: "absolute",
    right: -60,
    top: 250,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#E9F2FF"
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: palette.blue,
    alignItems: "center",
    justifyContent: "center",
    ...softShadow
  },
  brandName: {
    color: palette.navy,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  heroCopy: {
    alignItems: "center",
    gap: 14
  },
  headline: {
    color: palette.navy,
    fontSize: 42,
    lineHeight: 49,
    fontWeight: "900",
    textAlign: "center"
  },
  headlineBlue: {
    color: palette.blue
  },
  headlineTeal: {
    color: palette.teal
  },
  supporting: {
    maxWidth: 320,
    color: palette.muted,
    fontSize: 17,
    lineHeight: 27,
    textAlign: "center"
  },
  illustrationWrap: {
    height: 205,
    alignItems: "center",
    justifyContent: "center"
  },
  illustrationOrb: {
    position: "absolute",
    right: -20,
    bottom: -8,
    width: 190,
    height: 150,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 70,
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 105,
    backgroundColor: "#EAF3FF"
  },
  document: {
    width: 132,
    height: 150,
    borderRadius: 18,
    backgroundColor: palette.white,
    paddingTop: 34,
    paddingHorizontal: 24,
    transform: [{ rotate: "-8deg" }],
    ...shadow
  },
  docLineLarge: {
    height: 8,
    width: 64,
    borderRadius: 8,
    backgroundColor: "#D9E2F3",
    marginBottom: 18
  },
  docLine: {
    height: 7,
    width: 82,
    borderRadius: 7,
    backgroundColor: "#E1E8F5",
    marginBottom: 14
  },
  docLineShort: {
    height: 7,
    width: 58,
    borderRadius: 7,
    backgroundColor: "#E1E8F5"
  },
  cloud: {
    position: "absolute",
    bottom: 35,
    width: 86,
    height: 54,
    borderRadius: 28,
    backgroundColor: palette.blue,
    alignItems: "center",
    justifyContent: "center",
    ...shadow
  },
  floatingTile: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EDF2FA",
    ...softShadow
  },
  tileLeft: {
    left: 24,
    bottom: 52
  },
  tileRight: {
    right: 20,
    bottom: 70
  },
  tileBottom: {
    right: 62,
    bottom: 8
  },
  valueStrip: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    backgroundColor: palette.white,
    paddingVertical: 16,
    ...softShadow
  },
  valueItem: {
    flex: 1,
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 6
  },
  valueIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  valueTitle: {
    color: palette.navy,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  valueSubtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center"
  },
  valueDivider: {
    width: 1,
    backgroundColor: palette.border
  },
  actions: {
    gap: 12
  },
  authButton: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10
  },
  primaryButton: {
    backgroundColor: palette.blue,
    ...softShadow
  },
  outlineButton: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border
  },
  authButtonText: {
    color: palette.white,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800"
  },
  outlineButtonText: {
    color: palette.navy
  },
  pressed: {
    opacity: 0.86
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border
  },
  dividerText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600"
  },
  demoRow: {
    flexDirection: "row",
    gap: 12
  },
  demoButton: {
    flex: 1,
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    ...softShadow
  },
  demoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  demoText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  message: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 26
  },
  footerText: {
    flex: 1,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20
  }
});
