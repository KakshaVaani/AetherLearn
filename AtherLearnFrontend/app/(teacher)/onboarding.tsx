import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiClientError } from "@/api/client";
import {
  fetchSchoolSuggestions,
  fetchTeacherClassrooms,
  SchoolSuggestion,
  setupTeacherWorkspace
} from "@/api/backend";
import { AppButton } from "@/components/AppButton";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { subjects as subjectCatalog } from "@/data/subjects";
import { Classroom } from "@/types";
import { colors, radii, spacing } from "@/constants/theme";

const grades = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];

export default function TeacherOnboardingScreen() {
  const [schoolName, setSchoolName] = useState("AtherLearn Demo School");
  const [schoolSuggestions, setSchoolSuggestions] = useState<SchoolSuggestion[]>([]);
  const [className, setClassName] = useState("Section A");
  const [grade, setGrade] = useState("Grade 8");
  const [selectedSubjects, setSelectedSubjects] = useState(["Science", "Math"]);
  const [existingClasses, setExistingClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Link your teaching classes before posting notes.");

  useEffect(() => {
    let mounted = true;
    fetchTeacherClassrooms()
      .then((classes) => {
        if (!mounted) return;
        setExistingClasses(classes);
        if (classes.length > 0) {
          setMessage("Your teacher workspace is already linked to backend classes.");
        }
      })
      .catch(() => {
        if (mounted) setMessage("Backend classes are not reachable yet. Start the backend before saving setup.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchSchoolSuggestions(schoolName)
      .then((items) => {
        if (mounted) setSchoolSuggestions(items.filter((item) => item.name !== schoolName).slice(0, 5));
      })
      .catch(() => {
        if (mounted) setSchoolSuggestions([]);
      });
    return () => {
      mounted = false;
    };
  }, [schoolName]);

  function toggleSubject(subject: string) {
    setSelectedSubjects((current) =>
      current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject]
    );
  }

  async function saveSetup() {
    setLoading(true);
    setMessage("");
    try {
      const result = await setupTeacherWorkspace({
        schoolName: schoolName.trim() || "AtherLearn Demo School",
        classes: [
          {
            name: className.trim() || "Section A",
            grade,
            section: className.trim() || "A",
            subjects: selectedSubjects
          }
        ]
      });
      setExistingClasses(result.classes);
      setMessage("Teacher, class, subjects, and student join code are ready.");
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "Could not save teacher setup. Check backend services and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const canSave = schoolName.trim().length >= 2 && selectedSubjects.length > 0;

  return (
    <ScreenContainer>
      <Header title="Teacher Setup" subtitle="Map your classes before posting classroom material." showSettings={false} />

      {existingClasses.length > 0 ? (
        <Card style={styles.readyCard}>
          <View style={styles.readyIcon}>
            <Ionicons name="checkmark-circle" size={26} color={colors.success} />
          </View>
          <View style={styles.readyText}>
            <Text style={styles.readyTitle}>Workspace linked</Text>
            <Text style={styles.readySubtitle}>
              You can upload notes into class, subject, chapter, and topic folders.
            </Text>
          </View>
          <Badge label={`${existingClasses.length} class${existingClasses.length === 1 ? "" : "es"}`} tone="success" />
        </Card>
      ) : null}

      <SectionHeader title="School" subtitle="Students will join classes inside this school space." />
      <Card style={styles.formCard}>
        <Text style={styles.label}>School name</Text>
        <TextInput
          value={schoolName}
          onChangeText={setSchoolName}
          placeholder="Enter school name"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {schoolSuggestions.length > 0 ? (
          <View style={styles.suggestionList}>
            {schoolSuggestions.map((school) => (
              <Pressable
                key={school.id}
                accessibilityRole="button"
                onPress={() => setSchoolName(school.name)}
                style={styles.suggestionRow}
              >
                <Ionicons name="business-outline" size={18} color={colors.primary} />
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionTitle}>{school.name}</Text>
                  <Text style={styles.suggestionMeta}>
                    {[school.district, school.state, school.country].filter(Boolean).join(", ") || "Existing school"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Class you teach" subtitle="Create one class now. You can add more from Classes later." />
      <Card style={styles.formCard}>
        <Text style={styles.label}>Class / section</Text>
        <TextInput
          value={className}
          onChangeText={setClassName}
          placeholder="Section A"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Grade</Text>
        <View style={styles.chipRow}>
          {grades.map((item) => (
            <ChoiceChip key={item} label={item} selected={grade === item} onPress={() => setGrade(item)} />
          ))}
        </View>

        <Text style={styles.label}>Subjects you teach in this class</Text>
        <View style={styles.subjectList}>
          {subjectCatalog.map((subject) => {
            const selected = selectedSubjects.includes(subject.name);
            return (
              <Pressable
                key={subject.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggleSubject(subject.name)}
                style={[styles.subjectRow, selected && styles.subjectRowSelected]}
              >
                <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                <Text style={styles.subjectText}>{subject.name}</Text>
                <Ionicons
                  name={selected ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={selected ? colors.primary : colors.muted}
                />
              </Pressable>
            );
          })}
        </View>
      </Card>

      {existingClasses.length > 0 ? (
        <Card style={styles.codesCard}>
          <Text style={styles.codesTitle}>Student join codes</Text>
          {existingClasses.map((classroom) => (
            <View key={classroom.id} style={styles.codeRow}>
              <View>
                <Text style={styles.codeClass}>{classroom.title}</Text>
                <Text style={styles.codeMeta}>{classroom.subjects.join(", ")}</Text>
              </View>
              <Text style={styles.codeValue}>{classroom.classCode}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <AppButton
        title={existingClasses.length > 0 ? "Update / Add Setup" : "Save Teacher Setup"}
        leftIcon={<Ionicons name="school-outline" size={20} color={colors.white} />}
        loading={loading}
        disabled={!canSave}
        onPress={saveSetup}
      />
      <AppButton
        title="Continue to Dashboard"
        variant="outline"
        leftIcon={<Ionicons name="arrow-forward-outline" size={20} color={colors.text} />}
        onPress={() => router.replace("/(teacher)/dashboard")}
      />
    </ScreenContainer>
  );
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  readyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  readyIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  readyText: {
    flex: 1,
    gap: 3
  },
  readyTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  readySubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  formCard: {
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  input: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    lineHeight: 22
  },
  suggestionList: {
    gap: spacing.sm
  },
  suggestionRow: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md
  },
  suggestionText: {
    flex: 1,
    gap: 2
  },
  suggestionTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  suggestionMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  chipText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  chipTextSelected: {
    color: colors.primaryDark
  },
  subjectList: {
    gap: spacing.sm
  },
  subjectRow: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md
  },
  subjectRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  subjectText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800"
  },
  codesCard: {
    gap: spacing.md
  },
  codesTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900"
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    padding: spacing.md
  },
  codeClass: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  codeMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  codeValue: {
    color: colors.primary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: 1
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  }
});
