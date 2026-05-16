import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStudentCopy } from "@/api/studentCopy";
import { colors } from "@/constants/theme";

type TabIconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: TabIconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function StudentTabsLayout() {
  const copy = useStudentCopy();

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
        options={{ title: copy.dashboard, tabBarIcon: tabIcon("home-outline") }}
      />
      <Tabs.Screen
        name="subjects"
        options={{ title: copy.subjects, tabBarIcon: tabIcon("library-outline") }}
      />
      <Tabs.Screen
        name="assignment/index"
        options={{ title: copy.assignments, tabBarIcon: tabIcon("clipboard-outline") }}
      />
      <Tabs.Screen
        name="ask-doubt"
        options={{ title: copy.askDoubt, tabBarIcon: tabIcon("chatbubble-ellipses-outline") }}
      />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="subject/[id]" options={{ href: null }} />
      <Tabs.Screen name="chapter/[id]" options={{ href: null }} />
      <Tabs.Screen name="topic/[id]" options={{ href: null }} />
      <Tabs.Screen name="lesson/index" options={{ href: null }} />
      <Tabs.Screen name="lesson/[id]" options={{ href: null }} />
      <Tabs.Screen name="assignment/[id]" options={{ href: null }} />
      <Tabs.Screen name="audio/[id]" options={{ href: null }} />
      <Tabs.Screen name="feedback" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
