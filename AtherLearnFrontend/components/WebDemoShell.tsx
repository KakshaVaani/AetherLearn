import { createElement, ReactNode, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type WebDemoShellProps = {
  children: ReactNode;
};

type SectionKey = "impact" | "accessibility" | "deliverables";

type Profile = {
  icon: "reading" | "vision" | "offline" | "chat";
  label: string;
  title: string;
  context: string;
  support: string;
  proof: string;
};

const palette = {
  ink: "#071327",
  inkSoft: "#1B2D4A",
  muted: "#60708A",
  blue: "#2F62EA",
  blueDark: "#174FCF",
  teal: "#078F86",
  amber: "#B77905",
  green: "#047857",
  paper: "#F6FAFF",
  panel: "#FFFFFF",
  line: "#DCE6F5",
  dark: "#0B162A"
};

const profiles: Profile[] = [
  {
    icon: "reading",
    label: "Reading access",
    title: "Dyslexia and reading anxiety",
    context: "Dense paragraphs become short, spaced, readable learning blocks.",
    support: "Line focus, simplified notes, audio replay, and private doubt solving.",
    proof: "Simplified + read aloud"
  },
  {
    icon: "vision",
    label: "Vision support",
    title: "Low vision and visual fatigue",
    context: "The app favors large readable text and touch-sized controls.",
    support: "Contrast-aware screens, read-aloud support, and reduced visual load.",
    proof: "Large text + contrast"
  },
  {
    icon: "offline",
    label: "Connectivity",
    title: "Low-connectivity classrooms",
    context: "Learning continues when the network drops or a device is shared.",
    support: "Cached notes, practice, audio, and queued progress sync.",
    proof: "Cached lesson path"
  },
  {
    icon: "chat",
    label: "Confidence",
    title: "Students afraid to ask",
    context: "A learner can ask the same question repeatedly without public pressure.",
    support: "Gemma 4 explanations, practice loops, and teacher-visible progress signals.",
    proof: "Private Q&A loop"
  }
];

export function WebDemoShell({ children }: WebDemoShellProps) {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const sectionStackTop = useRef(0);
  const sectionOffsets = useRef<Partial<Record<SectionKey, number>>>({});
  const activeSectionRef = useRef<SectionKey | null>(null);
  const [liveDemoOpen, setLiveDemoOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const desktop = Platform.OS === "web" && width >= 960;
  const wideDesktop = width >= 1160;

  const phoneHeight = Math.min(Math.max(height - 168, 560), 710);
  const phoneWidth = Math.min(350, Math.max(306, Math.round(phoneHeight * 0.49)));
  const heroMinHeight = Math.min(Math.max(height - 82, 790), 860);

  if (!desktop) {
    return <>{children}</>;
  }

  function captureSection(section: SectionKey, y: number) {
    sectionOffsets.current[section] = y;
  }

  function captureSectionStack(y: number) {
    sectionStackTop.current = y;
  }

  function scrollToSection(section: SectionKey) {
    const sectionY = sectionOffsets.current[section] ?? 0;
    const targetY = sectionStackTop.current + sectionY;
    scrollRef.current?.scrollTo({ y: Math.max(targetY - 18, 0), animated: true });
  }

  function updateActiveSection(section: SectionKey | null) {
    if (activeSectionRef.current === section) return;
    activeSectionRef.current = section;
    setActiveSection(section);
  }

  function selectSection(section: SectionKey) {
    updateActiveSection(section);
    scrollToSection(section);
  }

  function scrollToTop() {
    updateActiveSection(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handlePageScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = event.nativeEvent.contentOffset.y;
    const stackTop = sectionStackTop.current;

    if (!stackTop || y < stackTop - 96) {
      updateActiveSection(null);
      return;
    }

    const orderedSections: SectionKey[] = ["impact", "accessibility", "deliverables"];
    const nextSection = orderedSections.reduce<SectionKey | null>((current, section) => {
      const sectionY = sectionOffsets.current[section];
      if (sectionY === undefined) return current;
      return y >= stackTop + sectionY - 96 ? section : current;
    }, null);

    updateActiveSection(nextSection);
  }

  return (
    <View style={styles.shellRoot}>
      <View style={styles.navShell}>
        <View style={styles.nav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to top"
            onPress={scrollToTop}
            style={({ pressed }) => [styles.brandRow, pressed && styles.pressed]}
          >
            <View style={styles.brandMark}>
              <BrandGlyph size={25} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText}>AtherLearn</Text>
          </Pressable>

          <View style={styles.navActions}>
            <View style={styles.navCenter}>
              <NavItem label="Impact" active={activeSection === "impact"} onPress={() => selectSection("impact")} />
              <NavItem label="Accessibility" active={activeSection === "accessibility"} onPress={() => selectSection("accessibility")} />
              <NavItem label="Deliverables" active={activeSection === "deliverables"} onPress={() => selectSection("deliverables")} />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setLiveDemoOpen(true)}
              style={({ pressed }) => [styles.navCta, pressed && styles.pressed]}
            >
              <View style={styles.navCtaDot} />
              <Text style={styles.navCtaText}>Live demo</Text>
              <Text style={styles.navCtaArrow}>→</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        onScroll={handlePageScroll}
        scrollEventThrottle={16}
        removeClippedSubviews
      >
        <View style={[styles.hero, { minHeight: heroMinHeight }]}>
          <View style={styles.heroCopy}>
            <View style={styles.eyebrow}>
              <View style={styles.statusDot} />
              <Text style={styles.eyebrowText}>Inclusive AI learning for classrooms with real constraints</Text>
            </View>

            <Text style={styles.headline}>One lesson should not leave four learners behind.</Text>
            <Text style={styles.subhead}>
              AtherLearn helps a teacher upload one lesson and turn it into accessible,
              phone-first learning paths. Gemma 4 supports simplified notes, audio help,
              private doubt solving, practice, feedback, and offline-ready study flows.
            </Text>

            <View style={styles.solutionPanel}>
              <Text style={styles.solutionKicker}>How AtherLearn solves it</Text>
              <Text style={styles.solutionText}>
                It reduces the cost of inclusion: teachers create once, students receive
                a version that fits their reading ability, disability, pace, language,
                and connectivity.
              </Text>
            </View>

            <View style={styles.proofStrip}>
              <ProofItem value="Gemma 4" label="AI adaptation" />
              <View style={styles.proofDivider} />
              <ProofItem value="Offline" label="low-connectivity study" />
              <View style={styles.proofDivider} />
              <ProofItem value="Accessible" label="by default" />
            </View>
          </View>

          <View style={styles.previewZone}>
            <View style={[styles.phoneFrame, { width: phoneWidth, height: phoneHeight }]}>
              <View style={styles.speaker} />
              <View style={styles.phoneScreen} pointerEvents="none">
                <StaticPhonePreview />
              </View>
            </View>
          </View>
        </View>

        <View>
          <VideoFeature />
        </View>

        <View style={styles.sectionStack} onLayout={(event) => captureSectionStack(event.nativeEvent.layout.y)}>
          <View
            style={styles.sectionBlock}
            onLayout={(event) => captureSection("impact", event.nativeEvent.layout.y)}
          >
            <SectionIntro
              kicker="Impact"
              title="AtherLearn turns inclusion from extra work into the default workflow."
              body="The product is built around measurable classroom outcomes: more learners can access the same lesson, ask safely, continue offline, and show progress back to the teacher."
            />
            <View style={styles.metricGrid}>
              <MetricCard value="1" label="teacher upload" body="A single classroom material becomes many learning formats." />
              <MetricCard value="4" label="support paths" body="Reading, audio, private doubt solving, and offline practice." />
              <MetricCard value="0" label="public shame" body="Students can ask repeatedly without exposing confusion in class." />
            </View>
          </View>

          <View
            style={styles.sectionBlock}
            onLayout={(event) => captureSection("accessibility", event.nativeEvent.layout.y)}
          >
            <SectionIntro
              kicker="Accessibility"
              title="Designed for learners who are usually asked to adjust."
              body="AtherLearn treats accessibility as the product core: disability support, language flexibility, low-bandwidth access, and teacher visibility are part of the same flow."
            />
            <View style={styles.profileGrid}>
              {profiles.map((profile) => (
                <ProfileCard key={profile.title} profile={profile} wide={wideDesktop} />
              ))}
            </View>
          </View>

          <View
            style={styles.sectionBlock}
            onLayout={(event) => captureSection("deliverables", event.nativeEvent.layout.y)}
          >
            <SectionIntro
              kicker="Deliverables"
              title="A practical product package for pilots, not just a prototype."
              body="The deployable surface combines a web walkthrough, a mobile-first app experience, local AI capability where supported, and teacher/student flows that can be evaluated in a school pilot."
            />
            <View style={styles.deliverableGrid}>
              <DeliverableCard icon="web" title="Web walkthrough" body="A public Cloudflare Pages demo for no-install evaluation." />
              <DeliverableCard icon="mobile" title="Mobile-first app" body="A focused phone experience matching the intended classroom device." />
              <DeliverableCard icon="ai" title="Gemma 4 path" body="Local AI workflows for personalized learning support where device/browser support allows." />
              <DeliverableCard icon="teacher" title="Teacher loop" body="Upload, adapt, assign, and review who needs help next." />
            </View>
          </View>
        </View>
      </ScrollView>

      {liveDemoOpen ? (
        <View style={styles.fullscreenOverlay}>
          <View style={[styles.fullscreenBackdrop, webOnlyStyles.blurBackdrop]} />
          <View style={styles.fullscreenHeader}>
            <View>
              <Text style={styles.fullscreenKicker}>Live app mode</Text>
              <Text style={styles.fullscreenTitle}>Use AtherLearn in a focused phone view.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close live app mode"
              onPress={() => setLiveDemoOpen(false)}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <View style={[styles.modalPhone, { width: Math.min(430, width - 64), height: Math.min(height - 108, 840) }]}>
            <View style={styles.modalSpeaker} />
            <View style={styles.phoneScreen}>{children}</View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function NavItem({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}
    >
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
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
      <View
        style={[
          styles.glyphDot,
          {
            top: size * 0.06,
            left: (size - head) / 2,
            width: head,
            height: head,
            borderRadius: head / 2,
            backgroundColor: color
          }
        ]}
      />
      <View
        style={[
          styles.glyphLine,
          {
            top: size * 0.33,
            left: size * 0.16,
            width: size * 0.68,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: color
          }
        ]}
      />
      <View
        style={[
          styles.glyphLine,
          {
            top: size * 0.34,
            left: (size - stroke) / 2,
            width: stroke,
            height: size * 0.38,
            borderRadius: stroke,
            backgroundColor: color
          }
        ]}
      />
      <View
        style={[
          styles.glyphLimb,
          {
            top: size * 0.62,
            left: size * 0.34,
            width: stroke,
            height: size * 0.32,
            borderRadius: stroke,
            backgroundColor: color,
            transform: [{ rotate: "18deg" }]
          }
        ]}
      />
      <View
        style={[
          styles.glyphLimb,
          {
            top: size * 0.62,
            right: size * 0.34,
            width: stroke,
            height: size * 0.32,
            borderRadius: stroke,
            backgroundColor: color,
            transform: [{ rotate: "-18deg" }]
          }
        ]}
      />
    </View>
  );
}

function CheckGlyph({ size, color }: { size: number; color: string }) {
  const stroke = Math.max(2, Math.round(size * 0.12));

  return (
    <View style={[styles.checkGlyphRoot, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
      <View
        style={[
          styles.checkGlyphShort,
          {
            width: size * 0.3,
            height: stroke,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }]
          }
        ]}
      />
      <View
        style={[
          styles.checkGlyphLong,
          {
            width: size * 0.48,
            height: stroke,
            backgroundColor: color,
            transform: [{ rotate: "-45deg" }]
          }
        ]}
      />
    </View>
  );
}

function PhoneGlyph({ size, color }: { size: number; color: string }) {
  return (
    <View style={[styles.phoneGlyphRoot, { width: size * 0.62, height: size, borderColor: color, borderRadius: size * 0.16 }]}>
      <View style={[styles.phoneGlyphButton, { width: size * 0.16, height: Math.max(2, size * 0.08), backgroundColor: color }]} />
    </View>
  );
}

function SupportGlyph({
  kind,
  size,
  color
}: {
  kind: "reading" | "vision" | "offline" | "chat" | "web" | "mobile" | "ai" | "teacher";
  size: number;
  color: string;
}) {
  if (kind === "reading") {
    return (
      <View style={[styles.supportGlyphRoot, { width: size, height: size }]}>
        <View style={[styles.bookGlyphPage, { borderColor: color, left: size * 0.08 }]} />
        <View style={[styles.bookGlyphPage, { borderColor: color, right: size * 0.08 }]} />
      </View>
    );
  }

  if (kind === "vision") {
    return (
      <View style={[styles.eyeGlyphRoot, { width: size, height: size * 0.68, borderColor: color, borderRadius: size }]}>
        <View style={[styles.eyeGlyphDot, { width: size * 0.22, height: size * 0.22, borderRadius: size, backgroundColor: color }]} />
      </View>
    );
  }

  if (kind === "offline") {
    return (
      <View style={[styles.supportGlyphRoot, { width: size, height: size }]}>
        <View style={[styles.cloudGlyph, { borderColor: color }]} />
        <View style={[styles.slashGlyph, { backgroundColor: color, transform: [{ rotate: "42deg" }] }]} />
      </View>
    );
  }

  if (kind === "chat") {
    return (
      <View style={[styles.chatGlyphRoot, { width: size, height: size * 0.74, borderColor: color, borderRadius: size * 0.25 }]}>
        <View style={[styles.chatGlyphDot, { backgroundColor: color, left: size * 0.25 }]} />
        <View style={[styles.chatGlyphDot, { backgroundColor: color, left: size * 0.44 }]} />
        <View style={[styles.chatGlyphDot, { backgroundColor: color, left: size * 0.63 }]} />
      </View>
    );
  }

  if (kind === "mobile") {
    return <PhoneGlyph size={size} color={color} />;
  }

  if (kind === "web") {
    return (
      <View style={[styles.webGlyphRoot, { width: size, height: size * 0.72, borderColor: color }]}>
        <View style={[styles.webGlyphBar, { backgroundColor: color }]} />
      </View>
    );
  }

  if (kind === "teacher") {
    return (
      <View style={[styles.supportGlyphRoot, { width: size, height: size }]}>
        <View style={[styles.teacherGlyphBoard, { borderColor: color }]} />
        <View style={[styles.teacherGlyphBase, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={[styles.aiGlyphRoot, { width: size, height: size }]}>
      <View style={[styles.aiGlyphCenter, { width: size * 0.34, height: size * 0.34, borderRadius: size, backgroundColor: color }]} />
      <View style={[styles.aiGlyphRay, { height: size, backgroundColor: color }]} />
      <View style={[styles.aiGlyphRay, { height: size, backgroundColor: color, transform: [{ rotate: "90deg" }] }]} />
      <View style={[styles.aiGlyphRay, { height: size, backgroundColor: color, transform: [{ rotate: "45deg" }] }]} />
      <View style={[styles.aiGlyphRay, { height: size, backgroundColor: color, transform: [{ rotate: "-45deg" }] }]} />
    </View>
  );
}

function VideoFeature() {
  return (
    <View style={styles.videoSection}>
      <View style={styles.videoStoryCard}>
        <View style={styles.videoCopy}>
          <Text style={styles.sectionKicker}>Pitch film</Text>
          <Text style={styles.videoTitle}>The promise we made to Suyash.</Text>
          <Text style={styles.videoBody}>
            During an NGO visit, a boy named Suyash told us he could not understand his
            lessons because he was dyslexic. He said he failed subjects, classmates laughed,
            and then he asked, "Bhaiya, can you teach me?" We came back carrying that
            question. AtherLearn is our answer: five months later, we want to return and say,
            "Suyash, we are with you. Go fly."
          </Text>
          <View style={styles.videoPromise}>
            <View style={styles.promiseIcon}>
              <Text style={styles.promiseIconText}>!</Text>
            </View>
            <Text style={styles.videoPromiseText}>
              Built so a child can ask for help without shame, and a teacher can reach them
              without rebuilding every lesson by hand.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.videoStage}>
        <View style={styles.videoStageGlow} />
        <View style={styles.videoFrame}>
          <YouTubeEmbed videoId="927kTEB4QKw" title="AtherLearn portrait story film" />
        </View>
        <View style={styles.videoCaption}>
          <PhoneGlyph size={15} color={palette.blue} />
          <Text style={styles.videoCaptionText}>Portrait demo film</Text>
        </View>
      </View>
    </View>
  );
}

function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  if (Platform.OS !== "web") {
    return (
      <>
        <View style={styles.videoPlay}>
          <Ionicons name="play" size={30} color="#FFFFFF" />
        </View>
        <View style={styles.videoFrameCopy}>
          <Text style={styles.videoFrameTitle}>Portrait story film</Text>
          <Text style={styles.videoFrameBody}>Suyash, Gemma 4, and the learner path</Text>
        </View>
      </>
    );
  }

  return createElement("iframe", {
    title,
    src: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`,
    allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    allowFullScreen: true,
    loading: "lazy",
    referrerPolicy: "strict-origin-when-cross-origin",
    style: {
      width: "100%",
      height: "100%",
      border: 0,
      display: "block",
      backgroundColor: palette.dark
    }
  });
}

function SectionIntro({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <View style={styles.sectionIntro}>
      <Text style={styles.sectionKicker}>{kicker}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

function MetricCard({ value, label, body }: { value: string; label: string; body: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricBody}>{body}</Text>
    </View>
  );
}

function ProofItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.proofItem}>
      <Text style={styles.proofValue}>{value}</Text>
      <Text style={styles.proofLabel}>{label}</Text>
    </View>
  );
}

function ProfileCard({ profile, wide }: { profile: Profile; wide: boolean }) {
  return (
    <View style={[styles.profileCard, wide ? styles.profileCardWide : styles.profileCardNarrow]}>
      <View style={styles.profileCardTop}>
        <View style={styles.profileIcon}>
          <SupportGlyph kind={profile.icon} size={22} color={palette.blue} />
        </View>
        <Text style={styles.profileLabel}>{profile.label}</Text>
      </View>
      <View style={styles.profileCopy}>
        <Text style={styles.profileTitle}>{profile.title}</Text>
        <View style={styles.profileDivider} />
        <View style={styles.profileRow}>
          <Text style={styles.profileRowLabel}>Barrier</Text>
          <Text style={styles.profileContext}>{profile.context}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileRowLabel}>Response</Text>
          <Text style={styles.profileSupport}>{profile.support}</Text>
        </View>
        <View style={styles.profileProof}>
          <CheckGlyph size={15} color={palette.green} />
          <Text style={styles.profileProofText}>{profile.proof}</Text>
        </View>
      </View>
    </View>
  );
}

function DeliverableCard({
  icon,
  title,
  body
}: {
  icon: "web" | "mobile" | "ai" | "teacher";
  title: string;
  body: string;
}) {
  return (
    <View style={styles.deliverableCard}>
      <SupportGlyph kind={icon} size={24} color={palette.blue} />
      <Text style={styles.deliverableTitle}>{title}</Text>
      <Text style={styles.deliverableBody}>{body}</Text>
    </View>
  );
}

function StaticPhonePreview() {
  return (
    <View style={styles.staticPhoneContent}>
      <View style={styles.staticHeader}>
        <View style={styles.staticBrand}>
          <View style={styles.staticMark}>
            <BrandGlyph size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.staticBrandText}>AtherLearn</Text>
        </View>
      </View>

      <View style={styles.staticBody}>
        <Text style={styles.staticMode}>Teacher upload</Text>
        <Text style={styles.staticTitle}>Chapter material becomes accessible study paths.</Text>
        <Text style={styles.staticSubtitle}>
          Gemma 4 helps create simplified notes, audio support, practice, and feedback.
        </Text>

        <View style={styles.staticCard}>
          <View style={styles.staticCardIcon}>
            <AccessibilityGlyph size={24} color={palette.blue} />
          </View>
          <View style={styles.staticCardCopy}>
            <Text style={styles.staticCardTitle}>Inclusive outputs</Text>
            <Text style={styles.staticCardBody}>Dyslexia support, low-vision readable text, audio, and private Q&A.</Text>
          </View>
        </View>

        <View style={styles.staticCard}>
          <View style={styles.staticCardIconTeal}>
            <SupportGlyph kind="offline" size={24} color={palette.teal} />
          </View>
          <View style={styles.staticCardCopy}>
            <Text style={styles.staticCardTitle}>Offline-ready learning</Text>
            <Text style={styles.staticCardBody}>Notes and practice continue on the phone when connectivity drops.</Text>
          </View>
        </View>

        <View style={styles.staticPillRow}>
          <Text style={styles.staticPill}>Teacher</Text>
          <Text style={styles.staticPill}>Student</Text>
          <Text style={styles.staticPill}>Practice</Text>
        </View>
      </View>
    </View>
  );
}

const cardShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.08,
  shadowRadius: 28,
  elevation: 4
};

const phoneShadow = {
  shadowColor: "#07111F",
  shadowOffset: { width: 0, height: 28 },
  shadowOpacity: 0.24,
  shadowRadius: 42,
  elevation: 12
};

const webOnlyStyles = {
  blurBackdrop: {
    backdropFilter: "blur(18px)"
  } as never
};

const styles = StyleSheet.create({
  shellRoot: {
    flex: 1,
    backgroundColor: palette.paper
  },
  page: {
    flex: 1,
    minHeight: "100vh" as never,
    backgroundColor: palette.paper
  },
  pageContent: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingBottom: 56
  },
  navShell: {
    width: "100%",
    backgroundColor: "rgba(246,250,255,0.94)" as never,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    zIndex: 20
  },
  nav: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 32,
    paddingHorizontal: 32
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.blue,
    ...cardShadow
  },
  brandText: {
    color: palette.ink,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "900"
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
    position: "absolute",
    alignSelf: "center"
  },
  glyphLimb: {
    position: "absolute"
  },
  checkGlyphRoot: {
    position: "relative",
    borderWidth: 2
  },
  checkGlyphShort: {
    position: "absolute",
    left: "24%" as never,
    top: "50%" as never,
    borderRadius: 99
  },
  checkGlyphLong: {
    position: "absolute",
    left: "42%" as never,
    top: "43%" as never,
    borderRadius: 99
  },
  phoneGlyphRoot: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2
  },
  phoneGlyphButton: {
    borderRadius: 99
  },
  supportGlyphRoot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  bookGlyphPage: {
    position: "absolute",
    top: "16%" as never,
    width: "40%" as never,
    height: "70%" as never,
    borderWidth: 2,
    borderRadius: 4
  },
  eyeGlyphRoot: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  eyeGlyphDot: {},
  cloudGlyph: {
    width: "72%" as never,
    height: "48%" as never,
    borderWidth: 2,
    borderRadius: 99
  },
  slashGlyph: {
    position: "absolute",
    width: 2,
    height: "96%" as never,
    borderRadius: 99
  },
  chatGlyphRoot: {
    position: "relative",
    borderWidth: 2,
    justifyContent: "center"
  },
  chatGlyphDot: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 3
  },
  webGlyphRoot: {
    borderWidth: 2,
    borderRadius: 5,
    overflow: "hidden"
  },
  webGlyphBar: {
    height: 4,
    width: "100%" as never
  },
  teacherGlyphBoard: {
    width: "80%" as never,
    height: "58%" as never,
    borderWidth: 2,
    borderRadius: 4
  },
  teacherGlyphBase: {
    width: "48%" as never,
    height: 2,
    borderRadius: 99,
    marginTop: 3
  },
  aiGlyphRoot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  aiGlyphCenter: {},
  aiGlyphRay: {
    position: "absolute",
    width: 2,
    borderRadius: 99,
    opacity: 0.8
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 34,
    marginLeft: "auto" as never
  },
  navCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  navItem: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "transparent" as never
  },
  navItemActive: {
    backgroundColor: "#EAF1FF",
    borderColor: "#C9DAFF"
  },
  navText: {
    color: palette.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  navTextActive: {
    color: palette.blueDark
  },
  navCta: {
    minHeight: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: palette.blue,
    borderWidth: 1,
    borderColor: "#AFC6FF",
    paddingHorizontal: 18,
    shadowColor: palette.blue,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 8
  },
  navCtaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DFFCEF"
  },
  navCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  navCtaArrow: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  hero: {
    minHeight: 704,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 56,
    paddingVertical: 34
  },
  heroCopy: {
    flex: 1,
    maxWidth: 660,
    gap: 22
  },
  eyebrow: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#C9DAFF",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: palette.green
  },
  eyebrowText: {
    color: palette.blueDark,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  headline: {
    color: palette.ink,
    fontSize: 66,
    lineHeight: 72,
    fontWeight: "900"
  },
  subhead: {
    color: palette.muted,
    fontSize: 18,
    lineHeight: 31,
    maxWidth: 640
  },
  solutionPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    padding: 18,
    gap: 8,
    ...cardShadow
  },
  solutionKicker: {
    color: palette.blueDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "900"
  },
  solutionText: {
    color: palette.ink,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: "800"
  },
  proofStrip: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "rgba(255,255,255,0.82)" as never,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    ...cardShadow
  },
  proofItem: {
    minWidth: 112,
    gap: 3
  },
  proofValue: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900"
  },
  proofLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  proofDivider: {
    width: 1,
    height: 36,
    backgroundColor: palette.line,
    marginHorizontal: 14
  },
  previewZone: {
    width: 382,
    minHeight: 700,
    alignItems: "center",
    justifyContent: "center"
  },
  phoneFrame: {
    borderRadius: 42,
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
    backgroundColor: "#52627D",
    zIndex: 2
  },
  phoneScreen: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 34,
    backgroundColor: "#F6F8FC"
  },
  videoSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 34,
    marginBottom: 34
  },
  videoStoryCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "rgba(255,255,255,0.86)" as never,
    justifyContent: "center",
    padding: 28,
    ...cardShadow
  },
  videoCopy: {
    maxWidth: 690,
    justifyContent: "center",
    gap: 14
  },
  videoTitle: {
    color: palette.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900"
  },
  videoBody: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 27
  },
  videoPromise: {
    maxWidth: 620,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C9DAFF",
    backgroundColor: "#F6FAFF",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    marginTop: 4
  },
  promiseIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.blue
  },
  promiseIconText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  videoPromiseText: {
    flex: 1,
    color: palette.inkSoft,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "800"
  },
  videoStage: {
    position: "relative",
    width: 364,
    minHeight: 640,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18
  },
  videoStageGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(47,98,234,0.12)" as never,
    transform: [{ scaleX: 1.15 }],
    top: 108
  },
  videoFrame: {
    width: 302,
    height: 536,
    borderRadius: 36,
    borderWidth: 10,
    borderColor: palette.dark,
    backgroundColor: palette.dark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...phoneShadow
  },
  videoCaption: {
    marginTop: 14,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C9DAFF",
    backgroundColor: "rgba(255,255,255,0.9)" as never,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...cardShadow
  },
  videoCaptionText: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  videoPlay: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: palette.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
    ...cardShadow
  },
  videoFrameCopy: {
    alignItems: "center",
    gap: 4
  },
  videoFrameTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  videoFrameBody: {
    color: "rgba(255,255,255,0.72)" as never,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  sectionStack: {
    gap: 28,
    paddingTop: 18,
    paddingBottom: 56
  },
  sectionBlock: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "rgba(255,255,255,0.72)" as never,
    padding: 22,
    ...cardShadow
  },
  sectionIntro: {
    maxWidth: 820,
    gap: 10,
    marginBottom: 24
  },
  sectionKicker: {
    color: palette.blueDark,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900"
  },
  sectionBody: {
    color: palette.muted,
    fontSize: 17,
    lineHeight: 28
  },
  metricGrid: {
    flexDirection: "row",
    gap: 14
  },
  metricCard: {
    flex: 1,
    minHeight: 178,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    padding: 18,
    ...cardShadow
  },
  metricValue: {
    color: palette.blue,
    fontSize: 46,
    lineHeight: 50,
    fontWeight: "900"
  },
  metricLabel: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
    marginTop: 4
  },
  metricBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8
  },
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  profileCard: {
    minHeight: 244,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    padding: 16,
    gap: 14,
    ...cardShadow
  },
  profileCardWide: {
    flex: 1
  },
  profileCardNarrow: {
    width: "48.5%" as never
  },
  profileCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF1FF"
  },
  profileLabel: {
    color: palette.blueDark,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    textTransform: "uppercase" as never
  },
  profileCopy: {
    gap: 10
  },
  profileTitle: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900"
  },
  profileDivider: {
    height: 1,
    backgroundColor: "#E7EEF8"
  },
  profileRow: {
    gap: 3
  },
  profileRowLabel: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    textTransform: "uppercase" as never
  },
  profileContext: {
    color: palette.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  profileSupport: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19
  },
  profileProof: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#BDEFD3",
    backgroundColor: "#E8FAEF",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 9
  },
  profileProofText: {
    color: palette.green,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  deliverableGrid: {
    flexDirection: "row",
    gap: 14
  },
  deliverableCard: {
    flex: 1,
    minHeight: 194,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    padding: 18,
    gap: 10,
    ...cardShadow
  },
  deliverableTitle: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  deliverableBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 22
  },
  staticPhoneContent: {
    flex: 1,
    backgroundColor: "#F6F8FC"
  },
  staticHeader: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 18,
    paddingHorizontal: 20
  },
  staticBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  staticMark: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.blue
  },
  staticBrandText: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  staticLivePill: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#BDEFD3",
    backgroundColor: "#E8FAEF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9
  },
  staticLiveText: {
    color: palette.green,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900"
  },
  staticBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12
  },
  staticMode: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#EAF1FF",
    color: palette.blue,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  staticTitle: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900"
  },
  staticSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 22
  },
  staticCard: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    ...cardShadow
  },
  staticCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF1FF"
  },
  staticCardIconTeal: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7FAF7"
  },
  staticCardCopy: {
    flex: 1,
    gap: 4
  },
  staticCardTitle: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900"
  },
  staticCardBody: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18
  },
  staticPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  staticPill: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CFE0FF",
    backgroundColor: "#FFFFFF",
    color: palette.blueDark,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  fullscreenOverlay: {
    position: "fixed" as never,
    inset: 0 as never,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  fullscreenBackdrop: {
    position: "absolute",
    inset: 0 as never,
    backgroundColor: "rgba(5, 14, 31, 0.74)" as never
  },
  fullscreenHeader: {
    position: "absolute",
    top: 22,
    left: 28,
    right: 28,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  fullscreenKicker: {
    color: "rgba(255,255,255,0.72)" as never,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "900"
  },
  fullscreenTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  closeButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    ...cardShadow
  },
  closeButtonText: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "900"
  },
  modalPhone: {
    borderRadius: 52,
    backgroundColor: palette.dark,
    borderWidth: 12,
    borderColor: "#172033",
    paddingTop: 24,
    paddingHorizontal: 12,
    paddingBottom: 12,
    overflow: "hidden",
    zIndex: 1,
    ...phoneShadow
  },
  modalSpeaker: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    width: 78,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#52627D",
    zIndex: 2
  },
  pressed: {
    opacity: 0.86
  }
});
