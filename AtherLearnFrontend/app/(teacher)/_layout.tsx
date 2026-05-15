import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

type TabIconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: TabIconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TeacherTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          minHeight: 70,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700"
        }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Home", tabBarIcon: tabIcon("home-outline") }}
      />
      <Tabs.Screen
        name="classrooms/index"
        options={{ title: "Classrooms", tabBarIcon: tabIcon("people-outline") }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: "Insights", tabBarIcon: tabIcon("analytics-outline") }}
      />
      <Tabs.Screen name="classrooms/[id]" options={{ href: null }} />
      <Tabs.Screen name="upload" options={{ href: null }} />
      <Tabs.Screen name="assignment/index" options={{ href: null }} />
      <Tabs.Screen name="assignment/[id]" options={{ href: null }} />
      <Tabs.Screen name="lecture-result" options={{ href: null }} />
      <Tabs.Screen name="create-assignment" options={{ href: null }} />
      <Tabs.Screen name="submissions" options={{ href: null }} />
    </Tabs>
  );
}
