import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { setSession, getLastUserId, setLastUserId } from "@/lib/authStorage";
import { apiLogin, apiRestoreBackup } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { getUserDebts, saveDebts, wipeAllDebts } from "@/lib/debtStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIMARY = "#2563EB";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Inline error shown below the form
  const [errorMessage, setErrorMessage] = useState("");

  // Unverified account modal
  const [unverifiedModalVisible, setUnverifiedModalVisible] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  // Cloud backup conflict modal
  const [cloudBackupModalVisible, setCloudBackupModalVisible] = useState(false);
  const [pendingCloudTransactions, setPendingCloudTransactions] = useState<any[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    // Clear any leftover session token when the login screen mounts
    AsyncStorage.removeItem("dt_session");
  }, []);

  const handleLogin = async () => {
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiLogin(email, password);
      const { user, token, refreshToken } = response.data;

      console.log("Login response:", response.data);

      const formattedUser = {
        id: user.id,
        email: user.email,
        businessName: user.business_name || user.businessName || "",
      };

      // ── Multi-user check ────────────────────────────────────────────
      // If a different user previously logged in on this device, wipe
      // their SQLite data before setting up the new session.
      const lastUserId = await getLastUserId();
      const newUserId = user.id.toString();

      if (lastUserId && lastUserId !== newUserId) {
        await wipeAllDebts();
        console.log("Different user detected — local SQLite data wiped.");
      }

      await setLastUserId(newUserId);
      // ────────────────────────────────────────────────────────────────

      await setSession(formattedUser, token, refreshToken);

      // ── Cloud backup check ───────────────────────────────────────────
      try {
        const localDebts = await getUserDebts();
        const hasLocalData = localDebts.length > 0;

        let cloudTransactions: any[] | null = null;
        try {
          const backupResponse = await apiRestoreBackup(token);
          const backupList = backupResponse?.data?.backupData?.data || [];
          const actualBackupList = Array.isArray(backupList) ? backupList : [];

          if (actualBackupList.length > 0) {
            const latestBackup = actualBackupList[0];
            const backupPayload = latestBackup?.data || latestBackup || null;
            if (backupPayload) {
              const transactions =
                backupPayload.transactions ||
                backupPayload.data?.debts ||
                backupPayload.debts ||
                [];
              if (Array.isArray(transactions)) {
                cloudTransactions = transactions;
              }
            }
          }
        } catch (backupErr) {
          console.error("Cloud backup fetch failed:", backupErr);
        }

        if (cloudTransactions && cloudTransactions.length > 0) {
          if (!hasLocalData) {
            // SQLite is empty → restore silently
            await saveDebts(cloudTransactions);
            router.replace("/tabs/home");
          } else {
            // Local data exists → ask the user
            setPendingCloudTransactions(cloudTransactions);
            setCloudBackupModalVisible(true);
            // Navigation deferred to modal button handlers
          }
        } else {
          router.replace("/tabs/home");
        }
      } catch (checkErr) {
        console.error("SQLite / backup check error:", checkErr);
        router.replace("/tabs/home");
      }
      // ────────────────────────────────────────────────────────────────
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.status === 403) {
        setUnverifiedEmail(email);
        setUnverifiedModalVisible(true);
      } else {
        setErrorMessage(error.message || "Invalid email or password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Cloud backup modal: keep local data
  const handleKeepCurrentData = () => {
    setCloudBackupModalVisible(false);
    router.replace("/tabs/home");
  };

  // Cloud backup modal: overwrite with cloud data
  const handleReplaceWithCloudBackup = async () => {
    setIsRestoring(true);
    try {
      await saveDebts(pendingCloudTransactions);
      setCloudBackupModalVisible(false);
      router.replace("/tabs/home");
    } catch (restoreErr) {
      console.error("Failed to restore cloud backup:", restoreErr);
      setIsRestoring(false);
      setCloudBackupModalVisible(false);
      setErrorMessage("Failed to restore cloud backup. Please try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

        {/* ── Unverified Account Modal ─────────────────────────────── */}
        <Modal
          visible={unverifiedModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setUnverifiedModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[styles.modalIconWrap, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="warning-outline" size={40} color="#EF4444" />
              </View>
              <Text style={styles.modalTitle}>Account Not Verified</Text>
              <Text style={styles.modalBody}>
                Your account is not verified yet. Please enter the verification
                code sent to your email to activate your account.
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: PRIMARY }]}
                  onPress={() => {
                    setUnverifiedModalVisible(false);
                    router.push(
                      `/verify-signup?email=${encodeURIComponent(unverifiedEmail)}`
                    );
                  }}
                >
                  <Text style={styles.modalBtnText}>Verify Now</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={() => setUnverifiedModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Cloud Backup Conflict Modal ──────────────────────────── */}
        <Modal
          visible={cloudBackupModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleKeepCurrentData}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[styles.modalIconWrap, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="cloud-download-outline" size={40} color={PRIMARY} />
              </View>
              <Text style={styles.modalTitle}>Cloud Backup Found</Text>
              <Text style={styles.modalBody}>
                We found a cloud backup for your account, but this device
                already has active customer records.{"\n\n"}
                What would you like to do?
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: PRIMARY }]}
                  onPress={handleKeepCurrentData}
                  disabled={isRestoring}
                >
                  <Text style={styles.modalBtnText}>Keep Current Data</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnDanger]}
                  onPress={handleReplaceWithCloudBackup}
                  disabled={isRestoring}
                >
                  {isRestoring ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.modalBtnText}>Replace With Cloud Backup</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Form ───────────────────────────────────────────────────── */}
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Login to continue</Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrorMessage("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrorMessage("");
            }}
            secureTextEntry
          />

          {/* Inline error message */}
          {errorMessage ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.button, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push("/signup")}>
            <Text style={styles.link}>
              Don't have an account?{" "}
              <Text style={styles.linkBold}>Sign up</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 32,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: "#111827",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  button: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    minHeight: 52,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  link: {
    textAlign: "center",
    marginTop: 18,
    color: "#6B7280",
  },
  linkBold: {
    color: PRIMARY,
    fontWeight: "700",
  },
  // ── Modal shared styles ──────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  modalIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  modalActions: {
    width: "100%",
    gap: 8,
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 50,
  },
  modalBtnSecondary: {
    backgroundColor: "#9CA3AF",
  },
  modalBtnDanger: {
    backgroundColor: "#EF4444",
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});