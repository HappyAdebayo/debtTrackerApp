import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSession, setSession, clearSession } from "@/lib/authStorage";
import { checkAndTriggerAutoBackup } from "@/lib/backupService";
import { apiRefreshToken } from "@/lib/api";

// Refresh the access token every 15 minutes
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export default function TabsLayout() {
  const router = useRouter();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [isAutoBackingUp, setIsAutoBackingUp] = useState(false);
  const slideAnim = useRef(new Animated.Value(80)).current;  // starts off-screen below

  // Slide the toast in/out based on isAutoBackingUp
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isAutoBackingUp ? 0 : 80,
      duration: 350,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  }, [isAutoBackingUp]);

  // ── Token Refresh ──────────────────────────────────────────────
  const refreshSession = async () => {
    const session = await getSession();
    if (!session?.token || !session?.refreshToken) {
      // No credentials stored — nothing to refresh
      return;
    }
    try {
      const response = await apiRefreshToken(session.token, session.refreshToken);
      const accessToken = response?.data?.accessToken || response?.data?.token;
      const newRefreshToken = response?.data?.refreshToken || session.refreshToken;

      if (accessToken) {
        // Persist the new tokens while keeping other session fields intact
        await setSession(
          {
            id: session.userId,
            email: session.email,
            businessName: session.businessName || "",
          },
          accessToken,
          newRefreshToken
        );
        console.log("[Auth] Access token refreshed successfully");
      }
    } catch (error: any) {
      console.error("[Auth] Token refresh failed:", error);
      // If the server says the refresh token is invalid/expired, force re-login
      if (error?.status === 401 || error?.status === 403) {
        await clearSession();
        router.replace("/login");
      }
    }
  };

  // Run the scheduled auto-backup check silently
  const runAutoBackupCheck = async () => {
    try {
      const triggered = await checkAndTriggerAutoBackup();
      if (triggered) {
        // Only show the toast if a backup was actually triggered
        setIsAutoBackingUp(true);
        setTimeout(() => setIsAutoBackingUp(false), 3000);
      }
    } catch (e) {
      console.error("Auto backup check failed:", e);
    }
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        // Refresh token and check backup when app comes back to foreground
        refreshSession();
        runAutoBackupCheck();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    // Run immediately on mount
    refreshSession();
    runAutoBackupCheck();

    // Then repeat every 15 minutes while the app is open
    const interval = setInterval(refreshSession, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: { paddingVertical: 6, height: 60 },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="debt"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>

      {/* ── Auto-Backup Toast ── */}
      <Animated.View
        style={[
          toastStyles.toast,
          { transform: [{ translateY: slideAnim }] },
        ]}
        pointerEvents="none"
      >
        <View style={toastStyles.dot} />
        <Text style={toastStyles.text}>Auto-backup saved ✓</Text>
      </Animated.View>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 72, // sits just above the tab bar
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E3A5F",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});