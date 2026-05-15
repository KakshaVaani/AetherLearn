import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="lesson-settings" />
        <Stack.Screen name="source-understanding" />
        <Stack.Screen name="teacher-pack" />
        <Stack.Screen name="student-pack" />
        <Stack.Screen name="trust-pack" />
      </Stack>
    </>
  );
}
