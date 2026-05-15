import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiClientError } from "@/api/client";
import { loginWithPassword, signupWithPassword } from "@/api/backend";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Role } from "@/types";

type AuthMode = "login" | "signup";

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
  danger: "#DC2626"
};

export default function LoginScreen() {
  const params = useLocalSearchParams<{ mode?: AuthMode; role?: Role }>();
  const initialMode = useMemo<AuthMode>(
    () => (params.mode === "signup" ? "signup" : "login"),
    [params.mode]
  );
  const initialRole = useMemo<Role>(
    () => (params.role === "student" || params.role === "teacher" ? params.role : "teacher"),
    [params.role]
  );
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  function openWorkspace(role: Role) {
    if (role === "teacher") {
      router.replace("/home");
      return;
    }
    router.replace("/(student)/dashboard");
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
  }

  function showOAuthMessage() {
    setMessage("Google sign-in will be enabled when OAuth is configured.");
  }

  function showPasswordResetMessage() {
    setMessage("Password reset will be enabled when email delivery is configured.");
  }

  function authErrorMessage(error: unknown, fallback: string) {
    if (error instanceof ApiClientError) {
      return error.message;
    }
    return fallback;
  }

  async function submitLogin() {
    setLoading(true);
    setMessage("");
    try {
      const user = await loginWithPassword(email, password);
      openWorkspace(user.role);
    } catch (error) {
      setMessage(authErrorMessage(error, "Login failed. Check your email and password."));
    } finally {
      setLoading(false);
    }
  }

  async function submitSignup() {
    setLoading(true);
    setMessage("");
    try {
      const user = await signupWithPassword({
        name,
        email,
        password,
        role: selectedRole
      });
      openWorkspace(user.role);
    } catch (error) {
      setMessage(authErrorMessage(error, "Signup failed. Check your details or try another email."));
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";
  const canSubmit = isSignup
    ? name.trim().length >= 2 && email.trim().length > 0 && password.length >= 8
    : email.trim().length > 0 && password.length > 0;

  return (
    <ScreenContainer padded={false} contentStyle={styles.screen}>
      <View style={styles.backgroundBlobTop} />
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" label="Go back" onPress={() => router.replace("/")} />
      </View>

      {isSignup ? (
        <SignupContent
          name={name}
          email={email}
          password={password}
          passwordVisible={passwordVisible}
          selectedRole={selectedRole}
          loading={loading}
          canSubmit={canSubmit}
          message={message}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onTogglePassword={() => setPasswordVisible((value) => !value)}
          onRoleChange={setSelectedRole}
          onSubmit={submitSignup}
          onGoogle={showOAuthMessage}
          onSwitchMode={() => switchMode("login")}
          onModeChange={switchMode}
        />
      ) : (
        <LoginContent
          email={email}
          password={password}
          passwordVisible={passwordVisible}
          loading={loading}
          canSubmit={canSubmit}
          message={message}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onTogglePassword={() => setPasswordVisible((value) => !value)}
          onSubmit={submitLogin}
          onGoogle={showOAuthMessage}
          onForgotPassword={showPasswordResetMessage}
          onSwitchMode={() => switchMode("signup")}
        />
      )}
    </ScreenContainer>
  );
}

function LoginContent({
  email,
  password,
  passwordVisible,
  loading,
  canSubmit,
  message,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onGoogle,
  onForgotPassword,
  onSwitchMode
}: {
  email: string;
  password: string;
  passwordVisible: boolean;
  loading: boolean;
  canSubmit: boolean;
  message: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
  onGoogle: () => void;
  onForgotPassword: () => void;
  onSwitchMode: () => void;
}) {
  return (
    <View style={styles.authContent}>
      <View style={styles.centerCopy}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to continue to your AtherLearn workspace.</Text>
      </View>

      <WorkspaceIllustration />

      <View style={styles.form}>
        <AuthInput
          label="Email"
          icon="mail-outline"
          value={email}
          onChangeText={onEmailChange}
          placeholder="name@school.edu"
          keyboardType="email-address"
          autoComplete="email"
        />
        <AuthInput
          label="Password"
          icon="lock-closed-outline"
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Password"
          secureTextEntry={!passwordVisible}
          autoComplete="password"
          rightIcon={passwordVisible ? "eye-off-outline" : "eye-outline"}
          onRightIconPress={onTogglePassword}
        />
        <Pressable accessibilityRole="button" onPress={onForgotPassword} style={styles.forgotButton}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
      </View>

      {message ? <Text style={styles.errorText}>{message}</Text> : null}

      <PrimaryButton title="Log In" loading={loading} disabled={!canSubmit} onPress={onSubmit} />
      <Divider label="or" />
      <GoogleButton title="Continue with Google" onPress={onGoogle} />

      <View style={styles.bottomPrompt}>
        <Text style={styles.promptText}>New to AtherLearn?</Text>
        <Pressable accessibilityRole="button" onPress={onSwitchMode}>
          <Text style={styles.linkText}>Create an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SignupContent({
  name,
  email,
  password,
  passwordVisible,
  selectedRole,
  loading,
  canSubmit,
  message,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onRoleChange,
  onSubmit,
  onGoogle,
  onSwitchMode,
  onModeChange
}: {
  name: string;
  email: string;
  password: string;
  passwordVisible: boolean;
  selectedRole: Role;
  loading: boolean;
  canSubmit: boolean;
  message: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onRoleChange: (role: Role) => void;
  onSubmit: () => void;
  onGoogle: () => void;
  onSwitchMode: () => void;
  onModeChange: (mode: AuthMode) => void;
}) {
  return (
    <View style={styles.authContent}>
      <View style={styles.centerCopy}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Choose how you'll use AtherLearn.</Text>
      </View>

      <View style={styles.segmented}>
        <SegmentButton title="Log In" active={false} onPress={() => onModeChange("login")} />
        <SegmentButton title="Sign Up" active onPress={() => onModeChange("signup")} />
      </View>

      <View style={styles.form}>
        <AuthInput
          label="Full Name"
          icon="person-outline"
          value={name}
          onChangeText={onNameChange}
          placeholder="Your name"
          autoComplete="name"
        />
        <AuthInput
          label="Email"
          icon="mail-outline"
          value={email}
          onChangeText={onEmailChange}
          placeholder="name@school.edu"
          keyboardType="email-address"
          autoComplete="email"
        />
        <AuthInput
          label="Password"
          icon="lock-closed-outline"
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Password"
          secureTextEntry={!passwordVisible}
          autoComplete="password-new"
          rightIcon={passwordVisible ? "eye-off-outline" : "eye-outline"}
          onRightIconPress={onTogglePassword}
          helper="Use at least 8 characters."
        />
      </View>

      <View style={styles.roleBlock}>
        <Text style={styles.inputLabel}>I am a</Text>
        <RoleCard
          role="teacher"
          selected={selectedRole === "teacher"}
          icon="school-outline"
          title="Teacher"
          subtitle="Upload lessons, generate versions, and review progress."
          onPress={() => onRoleChange("teacher")}
        />
        <RoleCard
          role="student"
          selected={selectedRole === "student"}
          icon="book-outline"
          title="Student"
          subtitle="Learn with notes, audio, practice, and feedback."
          onPress={() => onRoleChange("student")}
        />
      </View>

      {message ? <Text style={styles.errorText}>{message}</Text> : null}

      <PrimaryButton title="Create Account" loading={loading} disabled={!canSubmit} onPress={onSubmit} />
      <Divider label="or" />
      <GoogleButton title="Sign up with Google" onPress={onGoogle} />

      <View style={styles.bottomPromptRow}>
        <Text style={styles.promptText}>Already have an account? </Text>
        <Pressable accessibilityRole="button" onPress={onSwitchMode}>
          <Text style={styles.linkText}>Log in</Text>
        </Pressable>
      </View>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={22} color={palette.navy} />
    </Pressable>
  );
}

function WorkspaceIllustration() {
  return (
    <View style={styles.workspaceWrap}>
      <View style={styles.workspaceBlob} />
      <View style={styles.chair} />
      <View style={styles.desk} />
      <View style={styles.laptop}>
        <Ionicons name="sparkles-outline" size={17} color="#9AA9C0" />
      </View>
      <View style={styles.cup} />
      <View style={styles.plantPot}>
        <View style={styles.leafOne} />
        <View style={styles.leafTwo} />
        <View style={styles.leafThree} />
      </View>
    </View>
  );
}

function AuthInput({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoComplete,
  rightIcon,
  onRightIconPress,
  helper
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoComplete?: "email" | "password" | "password-new" | "name";
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  helper?: string;
}) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <Ionicons name={icon} size={21} color="#7C8AA5" />
        <TextInput
          autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#75819A"
          secureTextEntry={secureTextEntry}
          style={styles.input}
          value={value}
        />
        {rightIcon ? (
          <Pressable accessibilityRole="button" onPress={onRightIconPress} hitSlop={10}>
            <Ionicons name={rightIcon} size={22} color="#7C8AA5" />
          </Pressable>
        ) : null}
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

function SegmentButton({
  title,
  active,
  onPress
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        active && styles.segmentButtonActive,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{title}</Text>
    </Pressable>
  );
}

function RoleCard({
  selected,
  icon,
  title,
  subtitle,
  onPress
}: {
  role: Role;
  selected: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleCard,
        selected && styles.roleCardSelected,
        pressed && styles.pressed
      ]}
    >
      <View style={[styles.roleIcon, selected ? styles.roleIconSelected : styles.roleIconMuted]}>
        <Ionicons name={icon} size={26} color={selected ? palette.white : palette.teal} />
      </View>
      <View style={styles.roleText}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={24}
        color={selected ? palette.blue : "#94A3B8"}
      />
    </Pressable>
  );
}

function PrimaryButton({
  title,
  loading,
  disabled,
  onPress
}: {
  title: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      {loading ? <ActivityIndicator color={palette.white} /> : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  );
}

function GoogleButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
    >
      <Text style={styles.googleMark}>G</Text>
      <Text style={styles.googleText}>{title}</Text>
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

const softShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.06,
  shadowRadius: 22,
  elevation: 3
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
    backgroundColor: palette.background
  },
  backgroundBlobTop: {
    position: "absolute",
    top: 90,
    right: -72,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#EDF5FF"
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 42
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    ...softShadow
  },
  authContent: {
    gap: 22
  },
  centerCopy: {
    alignItems: "center",
    gap: 10
  },
  title: {
    color: palette.navy,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    maxWidth: 280,
    color: palette.muted,
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center"
  },
  workspaceWrap: {
    height: 198,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  workspaceBlob: {
    position: "absolute",
    bottom: 26,
    width: 270,
    height: 128,
    borderRadius: 70,
    backgroundColor: "#EAF3FF"
  },
  chair: {
    position: "absolute",
    left: 34,
    bottom: 24,
    width: 88,
    height: 66,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#9DBDFF",
    opacity: 0.8
  },
  desk: {
    width: 260,
    height: 12,
    borderRadius: 12,
    backgroundColor: "#D9E2F1",
    marginBottom: 18
  },
  laptop: {
    position: "absolute",
    bottom: 46,
    left: 98,
    width: 108,
    height: 78,
    borderRadius: 10,
    backgroundColor: "#F5F8FE",
    borderWidth: 1,
    borderColor: "#CFD8E8",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "3deg" }],
    ...softShadow
  },
  cup: {
    position: "absolute",
    bottom: 42,
    right: 108,
    width: 34,
    height: 42,
    borderRadius: 10,
    backgroundColor: palette.blue
  },
  plantPot: {
    position: "absolute",
    bottom: 40,
    right: 42,
    width: 48,
    height: 54,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: "#CFE2F1"
  },
  leafOne: {
    position: "absolute",
    left: 2,
    top: -30,
    width: 18,
    height: 46,
    borderRadius: 18,
    backgroundColor: "#62BD62",
    transform: [{ rotate: "-32deg" }]
  },
  leafTwo: {
    position: "absolute",
    left: 18,
    top: -40,
    width: 18,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#72CB70",
    transform: [{ rotate: "10deg" }]
  },
  leafThree: {
    position: "absolute",
    right: 2,
    top: -30,
    width: 18,
    height: 46,
    borderRadius: 18,
    backgroundColor: "#58AD5D",
    transform: [{ rotate: "34deg" }]
  },
  segmented: {
    height: 58,
    borderRadius: 17,
    backgroundColor: palette.white,
    flexDirection: "row",
    padding: 4,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    ...softShadow
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  segmentButtonActive: {
    backgroundColor: palette.blue
  },
  segmentText: {
    color: palette.navy,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: palette.white
  },
  form: {
    gap: 18
  },
  inputBlock: {
    gap: 9
  },
  inputLabel: {
    color: palette.navy,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16
  },
  input: {
    flex: 1,
    color: palette.navy,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 0
  },
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 2
  },
  linkText: {
    color: palette.blue,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800"
  },
  helper: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18
  },
  roleBlock: {
    gap: 14
  },
  roleCard: {
    minHeight: 108,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16
  },
  roleCardSelected: {
    borderColor: palette.blue,
    backgroundColor: palette.blueSoft
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  roleIconSelected: {
    backgroundColor: palette.blue
  },
  roleIconMuted: {
    backgroundColor: palette.tealSoft
  },
  roleText: {
    flex: 1,
    gap: 5
  },
  roleTitle: {
    color: palette.navy,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  roleSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: palette.blue,
    alignItems: "center",
    justifyContent: "center",
    ...softShadow
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.86
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18
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
    fontWeight: "700"
  },
  googleButton: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14
  },
  googleMark: {
    color: "#4285F4",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900"
  },
  googleText: {
    color: palette.navy,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800"
  },
  bottomPrompt: {
    alignItems: "center",
    gap: 8,
    paddingTop: 20
  },
  bottomPromptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6
  },
  promptText: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 22
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  }
});
