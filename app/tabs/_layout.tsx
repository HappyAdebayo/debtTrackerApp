import { useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  View,
  Modal,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSession, setSession, clearSession } from "@/lib/authStorage";
import { isBackupDue, updateLastBackupTime, getBackupConfig } from "@/lib/backupService";
import { apiRefreshToken, apiCreateBackup } from "@/lib/api";
import { getUserDebts } from "@/lib/debtStorage";

// Refresh the access token every 15 minutes
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export default function TabsLayout() {
  const router = useRouter();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [backingUp, setBackingUp] = useState(false);
  const [backupDone, setBackupDone] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const checkCountRef = useRef(0);

  // Pulse animation for the cloud icon while backing up
  useEffect(() => {
    if (backingUp) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [backingUp]);

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
    checkCountRef.current += 1;
    const checkNum = checkCountRef.current;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false });

    try {
      const config = await getBackupConfig();
      const due = await isBackupDue();

      console.log(
        `[AutoBackup] ⏱ Check #${checkNum} at ${timeStr} | ` +
        `enabled=${config.enabled} | ` +
        `schedule=${config.frequency} @ ${config.time} | ` +
        `due=${due}`
      );

      if (!due) {
        console.log(`[AutoBackup] Check #${checkNum}: Not due yet — nothing to do.`);
        return;
      }

      // Get the auth token so we can call the cloud backup API
      const session = await getSession();
      if (!session?.token) {
        console.warn(`[AutoBackup] Check #${checkNum}: No auth token found — skipping cloud backup.`);
        return;
      }

      console.log(`[AutoBackup] Check #${checkNum}: ✅ Backup is due! Starting cloud backup now...`);

      // Show the backing-up modal
      setBackingUp(true);
      setBackupDone(false);

      // Compile the latest debt records
      const debts = await getUserDebts();
      console.log(`[AutoBackup] Backing up ${debts.length} customer record(s)...`);
      const backupPayload = { transactions: debts };

      // Call the same cloud API that the manual "Back Up Now" button uses
      await apiCreateBackup(session.token, backupPayload);

      // Record the timestamp so the schedule won't re-fire until tomorrow / next week
      await updateLastBackupTime();

      console.log(`[AutoBackup] ✅ Cloud backup completed successfully at ${new Date().toLocaleTimeString("en-US", { hour12: false })}.`);

      // Show success state briefly, then hide
      setBackupDone(true);
      setTimeout(() => {
        setBackingUp(false);
        setBackupDone(false);
      }, 2500);
    } catch (e) {
      console.error(`[AutoBackup] Check #${checkNum}: ❌ Auto backup failed:`, e);
      setBackingUp(false);
      setBackupDone(false);
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

    // Refresh token every 15 minutes while the app is open
    const tokenInterval = setInterval(refreshSession, REFRESH_INTERVAL_MS);

    // Check auto-backup schedule every 60 seconds so it fires at the
    // configured time even when the app is already open in the foreground.
    const backupInterval = setInterval(runAutoBackupCheck, 60 * 1000);

    return () => {
      clearInterval(tokenInterval);
      clearInterval(backupInterval);
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

      {/* ── Auto-Backup Progress Modal ── */}
      <Modal
        transparent
        animationType="fade"
        visible={backingUp}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {backupDone ? (
              <>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                </View>
                <Text style={styles.modalTitle}>Backup Complete!</Text>
                <Text style={styles.modalSubtitle}>
                  Your data has been securely saved to the cloud.
                </Text>
              </>
            ) : (
              <>
                <Animated.View
                  style={[
                    styles.cloudCircle,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Ionicons name="cloud-upload" size={36} color="#FFFFFF" />
                </Animated.View>
                <Text style={styles.modalTitle}>Backing Up…</Text>
                <Text style={styles.modalSubtitle}>
                  Saving your records to the cloud. Please don't close the app.
                </Text>
                <ActivityIndicator
                  size="small"
                  color="#2563EB"
                  style={{ marginTop: 16 }}
                />
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: pulseAnim.interpolate({
                          inputRange: [1, 1.25],
                          outputRange: ["40%", "90%"],
                        }),
                      },
                    ]}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 16,
  },
  cloudCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#2563EB",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#16A34A",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  progressBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 12,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#2563EB",
    borderRadius: 6,
  },
});