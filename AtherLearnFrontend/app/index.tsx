import { createElement, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from "react-native";
import { router } from "expo-router";
import { ApiClientError } from "@/api/client";
import { demoLogin } from "@/api/backend";
import { isStudentAcademicProfileComplete } from "@/api/studentProfile";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Role } from "@/types";

const palette = {
  blue: "#2F62EA",
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
    if (!isStudentAcademicProfileComplete()) {
      router.replace("/(student)/onboarding");
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
          : "Demo login failed. Check that the backend is running."
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
          <BrandGlyph size={25} color={palette.white} />
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
        <ValueItem icon="shield" tint={palette.teal} background={palette.tealSoft} title="Upload once" subtitle="Any lesson or material" />
        <View style={styles.valueDivider} />
        <ValueItem icon="sparkles" tint={palette.blue} background={palette.violetSoft} title="AI creates" subtitle="Personalized versions" />
        <View style={styles.valueDivider} />
        <ValueItem icon="people" tint={palette.blue} background={palette.blueSoft} title="Every learner" subtitle="Learns in the way that fits" />
      </View>

      <View style={styles.actions}>
        <AuthButton
          title="Create Account"
          icon="plus"
          onPress={() => router.push({ pathname: "/login", params: { mode: "signup" } })}
        />
        <AuthButton
          title="Log In"
          icon="login"
          variant="outline"
          onPress={() => router.push({ pathname: "/login", params: { mode: "login" } })}
        />
      </View>

      <Divider label="Or explore first" />

      <View style={styles.demoRow}>
        <DemoButton
          title="Teacher Demo"
          icon="teacher"
          tint={palette.teal}
          loading={demoRole === "teacher"}
          onPress={() => continueWithDemo("teacher")}
        />
        <DemoButton
          title="Student Demo"
          icon="book"
          tint={palette.blue}
          loading={demoRole === "student"}
          onPress={() => continueWithDemo("student")}
        />
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.footerNote}>
        <MiniGlyph kind="shield" size={18} color={palette.muted} />
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
        <ArrowGlyph size={30} color={palette.white} />
      </View>
      <FloatingTile style={styles.tileLeft} icon="chat" tint={palette.teal} />
      <FloatingTile style={styles.tileRight} icon="audio" tint="#6D5DFB" />
      <FloatingTile style={styles.tileBottom} icon="image" tint={palette.blue} />
    </View>
  );
}

function FloatingTile({
  icon,
  tint,
  style
}: {
  icon: "chat" | "audio" | "image";
  tint: string;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.floatingTile, style]}>
      <MiniGlyph kind={icon} size={22} color={tint} />
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
  icon: string;
  tint: string;
  background: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.valueItem}>
      <View style={[styles.valueIcon, { backgroundColor: background }]}>
        <MiniGlyph kind={icon} size={21} color={tint} />
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
  icon: string;
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
      <MiniGlyph kind={icon} size={20} color={isOutline ? palette.navy : palette.white} />
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
  icon: "teacher" | "book";
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
          <MiniGlyph kind={icon} size={20} color={tint} />
        </View>
      )}
      <Text style={[styles.demoText, { color: tint }]}>{title}</Text>
    </Pressable>
  );
}

function BrandGlyph({ size, color }: { size: number; color: string }) {
  if (Platform.OS === "web") {
    return createElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        "aria-hidden": true
      },
      createElement("circle", {
        cx: 12,
        cy: 5.1,
        r: 1.9,
        fill: color
      }),
      createElement("path", {
        d: "M6.3 9.2h11.4M12 7.8v6.9M9.1 19.2l2.9-4.5 2.9 4.5M9.5 12.1 12 13.5l2.5-1.4",
        stroke: color,
        strokeWidth: 2.1,
        strokeLinecap: "round",
        strokeLinejoin: "round"
      })
    );
  }

  return <AccessibilityGlyph size={size} color={color} />;
}

function AccessibilityGlyph({ size, color }: { size: number; color: string }) {
  if (Platform.OS === "web") {
    return createElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        "aria-hidden": true
      },
      createElement("circle", {
        cx: 12,
        cy: 4.5,
        r: 2,
        stroke: color,
        strokeWidth: 2.2
      }),
      createElement("path", {
        d: "M5 8.2C7.7 7.1 9.8 6.6 12 6.6s4.3.5 7 1.6",
        stroke: color,
        strokeWidth: 2.2,
        strokeLinecap: "round"
      }),
      createElement("path", {
        d: "M12 7.4v12.8",
        stroke: color,
        strokeWidth: 2.2,
        strokeLinecap: "round"
      }),
      createElement("path", {
        d: "M8.7 11.2 12 13.1l3.3-1.9",
        stroke: color,
        strokeWidth: 2.2,
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }),
      createElement("path", {
        d: "m9.2 20.2 2.8-7.1 2.8 7.1",
        stroke: color,
        strokeWidth: 2.2,
        strokeLinecap: "round",
        strokeLinejoin: "round"
      })
    );
  }

  const stroke = Math.max(2, Math.round(size * 0.1));
  const head = Math.max(4, Math.round(size * 0.18));

  return (
    <View style={[styles.glyphRoot, { width: size, height: size }]}>
      <View style={[styles.glyphDot, { top: size * 0.06, left: (size - head) / 2, width: head, height: head, borderRadius: head / 2, backgroundColor: color }]} />
      <View style={[styles.glyphLine, { top: size * 0.33, left: size * 0.16, width: size * 0.68, height: stroke, borderRadius: stroke, backgroundColor: color }]} />
      <View style={[styles.glyphLine, { top: size * 0.34, left: (size - stroke) / 2, width: stroke, height: size * 0.38, borderRadius: stroke, backgroundColor: color }]} />
      <View style={[styles.glyphLimb, { top: size * 0.62, left: size * 0.34, width: stroke, height: size * 0.32, borderRadius: stroke, backgroundColor: color, transform: [{ rotate: "18deg" }] }]} />
      <View style={[styles.glyphLimb, { top: size * 0.62, right: size * 0.34, width: stroke, height: size * 0.32, borderRadius: stroke, backgroundColor: color, transform: [{ rotate: "-18deg" }] }]} />
    </View>
  );
}

function ArrowGlyph({ size, color }: { size: number; color: string }) {
  if (Platform.OS === "web") {
    return createElement(
      "svg",
      { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
      createElement("path", {
        d: "M12 19V5M6.5 10.5 12 5l5.5 5.5",
        stroke: color,
        strokeWidth: 2.5,
        strokeLinecap: "round",
        strokeLinejoin: "round"
      })
    );
  }

  const stroke = Math.max(3, Math.round(size * 0.12));

  return (
    <View style={[styles.arrowRoot, { width: size, height: size }]}>
      <View style={[styles.arrowStem, { width: stroke, height: size * 0.7, borderRadius: stroke, backgroundColor: color }]} />
      <View style={[styles.arrowHeadLeft, { width: size * 0.36, height: stroke, borderRadius: stroke, backgroundColor: color, transform: [{ rotate: "-45deg" }] }]} />
      <View style={[styles.arrowHeadRight, { width: size * 0.36, height: stroke, borderRadius: stroke, backgroundColor: color, transform: [{ rotate: "45deg" }] }]} />
    </View>
  );
}

function MiniGlyph({ kind, size, color }: { kind: string; size: number; color: string }) {
  if (Platform.OS === "web") {
    const common = {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      "aria-hidden": true
    };
    const stroke = {
      stroke: color,
      strokeWidth: 2.2,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    };

    if (kind === "shield") {
      return createElement(
        "svg",
        common,
        createElement("path", {
          d: "M12 3.5 19 6v5.2c0 4.6-2.8 7.8-7 9.3-4.2-1.5-7-4.7-7-9.3V6l7-2.5Z",
          ...stroke
        }),
        createElement("path", { d: "m8.8 12 2 2 4.5-4.7", ...stroke })
      );
    }

    if (kind === "sparkles") {
      return createElement(
        "svg",
        common,
        createElement("path", { d: "M12 3.5 13.5 9 19 10.5 13.5 12 12 17.5 10.5 12 5 10.5 10.5 9 12 3.5Z", ...stroke }),
        createElement("path", { d: "M18.5 15.5 19.2 18l2.3.7-2.3.7-.7 2.6-.7-2.6-2.3-.7 2.3-.7.7-2.5Z", ...stroke }),
        createElement("path", { d: "M5.5 14 6 15.8l1.8.5-1.8.5-.5 1.8-.5-1.8-1.8-.5 1.8-.5.5-1.8Z", ...stroke })
      );
    }

    if (kind === "people") {
      return createElement(
        "svg",
        common,
        createElement("path", { d: "M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", ...stroke }),
        createElement("path", { d: "M15.5 11a2.6 2.6 0 1 0 0-5.2", ...stroke }),
        createElement("path", { d: "M3.8 19c.7-3.1 2.5-4.7 4.7-4.7s4 1.6 4.7 4.7", ...stroke }),
        createElement("path", { d: "M13.5 14.6c2 .3 3.5 1.8 4.1 4.4", ...stroke })
      );
    }

    if (kind === "chat") {
      return createElement(
        "svg",
        common,
        createElement("path", { d: "M5 6.5h14v9H9l-4 3v-12Z", ...stroke }),
        createElement("path", { d: "M8.5 10.5h7M8.5 13h4.5", ...stroke })
      );
    }

    if (kind === "audio") {
      return createElement(
        "svg",
        common,
        createElement("path", { d: "M5 11v2a7 7 0 0 0 14 0v-2", ...stroke }),
        createElement("path", { d: "M7 11a5 5 0 0 1 10 0", ...stroke }),
        createElement("path", { d: "M8 13h2v4H8a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2ZM16 13h-2v4h2a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2Z", ...stroke })
      );
    }

    if (kind === "image") {
      return createElement(
        "svg",
        common,
        createElement("path", { d: "M4.5 6h15v12h-15V6Z", ...stroke }),
        createElement("path", { d: "m7 16 3.2-3.2 2.2 2.2 1.6-1.6 3 2.6", ...stroke }),
        createElement("path", { d: "M15.5 9.8h.1", ...stroke })
      );
    }

    if (kind === "teacher") {
      return createElement(
        "svg",
        common,
        createElement("path", { d: "M5 5.5h14v9H5v-9Z", ...stroke }),
        createElement("path", { d: "M8 18.5h8M12 14.5v4", ...stroke })
      );
    }

    if (kind === "book") {
      return createElement(
        "svg",
        common,
        createElement("path", { d: "M5 5.5h6.2c1.1 0 2 .9 2 2v11H7a2 2 0 0 1-2-2v-11Z", ...stroke }),
        createElement("path", { d: "M13.2 7.5c0-1.1.9-2 2-2H19v11a2 2 0 0 1-2 2h-3.8", ...stroke })
      );
    }

    if (kind === "login") {
      return createElement(
        "svg",
        common,
        createElement("path", { d: "M10 7 15 12l-5 5", ...stroke }),
        createElement("path", { d: "M4 12h11", ...stroke }),
        createElement("path", { d: "M16 5h3v14h-3", ...stroke })
      );
    }

    return createElement(
      "svg",
      common,
      createElement("path", { d: "M12 5v14M5 12h14", ...stroke })
    );
  }

  if (kind === "shield") {
    return (
      <View style={[styles.shieldGlyph, { width: size * 0.82, height: size, borderColor: color }]}>
        <View style={[styles.shieldCheck, { backgroundColor: color, transform: [{ rotate: "-45deg" }] }]} />
      </View>
    );
  }

  if (kind === "sparkles") {
    return (
      <View style={[styles.sparkGlyphRoot, { width: size, height: size }]}>
        <View style={[styles.sparkRay, { height: size, backgroundColor: color }]} />
        <View style={[styles.sparkRay, { height: size, backgroundColor: color, transform: [{ rotate: "90deg" }] }]} />
        <View style={[styles.sparkCenter, { width: size * 0.34, height: size * 0.34, borderRadius: size, backgroundColor: color }]} />
      </View>
    );
  }

  if (kind === "people") {
    return (
      <View style={[styles.peopleGlyphRoot, { width: size, height: size }]}>
        <View style={[styles.peopleHead, { left: size * 0.1, backgroundColor: color }]} />
        <View style={[styles.peopleHead, { left: size * 0.42, backgroundColor: color }]} />
        <View style={[styles.peopleBody, { backgroundColor: color }]} />
      </View>
    );
  }

  if (kind === "chat") {
    return <Text style={[styles.textGlyph, { color, fontSize: size * 0.78, lineHeight: size }]}>...</Text>;
  }

  if (kind === "audio") {
    return <Text style={[styles.textGlyph, { color, fontSize: size * 0.82, lineHeight: size }]}>A</Text>;
  }

  if (kind === "image") {
    return <View style={[styles.imageGlyph, { width: size, height: size * 0.78, borderColor: color }]} />;
  }

  if (kind === "teacher" || kind === "book") {
    return <Text style={[styles.textGlyph, { color, fontSize: size * 0.74, lineHeight: size }]}>{kind === "teacher" ? "T" : "B"}</Text>;
  }

  return <Text style={[styles.textGlyph, { color, fontSize: size * 0.86, lineHeight: size }]}>{kind === "login" ? ">" : "+"}</Text>;
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
    borderRadius: 8,
    backgroundColor: palette.blue,
    alignItems: "center",
    justifyContent: "center",
    ...softShadow
  },
  brandGlyphFallback: {
    fontWeight: "900",
    textAlign: "center"
  },
  glyphRoot: {
    position: "relative",
    alignItems: "center"
  },
  glyphDot: {
    position: "absolute"
  },
  glyphLine: {
    position: "absolute"
  },
  glyphLimb: {
    position: "absolute"
  },
  arrowRoot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  arrowStem: {
    position: "absolute",
    bottom: "12%" as never
  },
  arrowHeadLeft: {
    position: "absolute",
    top: "18%" as never,
    left: "26%" as never
  },
  arrowHeadRight: {
    position: "absolute",
    top: "18%" as never,
    right: "26%" as never
  },
  shieldGlyph: {
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  shieldCheck: {
    width: "42%" as never,
    height: 2,
    borderRadius: 99
  },
  sparkGlyphRoot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  sparkRay: {
    position: "absolute",
    width: 2,
    borderRadius: 99
  },
  sparkCenter: {},
  peopleGlyphRoot: {
    position: "relative"
  },
  peopleHead: {
    position: "absolute",
    top: "16%" as never,
    width: "32%" as never,
    height: "32%" as never,
    borderRadius: 99
  },
  peopleBody: {
    position: "absolute",
    bottom: "12%" as never,
    left: "12%" as never,
    width: "76%" as never,
    height: "32%" as never,
    borderRadius: 99
  },
  imageGlyph: {
    borderWidth: 2,
    borderRadius: 5
  },
  textGlyph: {
    fontWeight: "900",
    textAlign: "center"
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
