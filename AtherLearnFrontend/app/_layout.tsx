import { useEffect } from "react";
import { router, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getSession } from "@/api/session";
import { colors } from "@/constants/theme";

export default function RootLayout() {
  const pathname = usePathname();

  useEffect(() => {
    const publicRoute = pathname === "/" || pathname.startsWith("/login");
    if (!publicRoute && !getSession()) {
      router.replace("/");
    }
  }, [pathname]);

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
