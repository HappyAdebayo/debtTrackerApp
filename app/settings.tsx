import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSession, getUsers } from "@/lib/authStorage";
import {
  getBackupConfig,
  saveBackupConfig,
  getLastBackupTime,
  triggerManualBackup,
  updateLastBackupTime,
  BackupConfig,
} from "@/lib/backupService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiCreateBackup, apiRestoreBackup } from "@/lib/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getUserDebts, saveDebts, clearUserDebts } from "@/lib/debtStorage";

const PRIMARY = "#2563EB";
const PRIMARY_LIGHT = "#EFF6FF";
const DANGER = "#DC2626";

const DAYS_OF_WEEK = [
  { label: "S", value: 0, fullName: "Sunday" },
  { label: "M", value: 1, fullName: "Monday" },
  { label: "T", value: 2, fullName: "Tuesday" },
  { label: "W", value: 3, fullName: "Wednesday" },
  { label: "T", value: 4, fullName: "Thursday" },
  { label: "F", value: 5, fullName: "Friday" },
  { label: "S", value: 6, fullName: "Saturday" },
];

const getPickerDate = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};

  const now = new Date();

// Returns a human-friendly backup time: "Today at 2:30 PM", "Yesterday at …", or "22 May 2026 at 10:00 PM"
const formatLastBackupTime = (isoString: string): string => {
  if (!isoString) return "Never";
  const backupDate = new Date(isoString);
  if (isNaN(backupDate.getTime())) return "Never";
  const now = new Date();

  // Format time manually to bypass React Native / Hermes engine locale limitations
  const hoursNum = backupDate.getHours();
  const minutesNum = backupDate.getMinutes();
  const ampm = hoursNum >= 12 ? "PM" : "AM";
  const displayHours = hoursNum % 12 || 12;
  const displayMinutes = minutesNum.toString().padStart(2, "0");
  const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;

  // Format date manually
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = backupDate.getDate();
  const month = months[backupDate.getMonth()];
  const year = backupDate.getFullYear();
  const dateStr = `${day} ${month} ${year}`;

  if (backupDate.toDateString() === now.toDateString()) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (backupDate.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeStr}`;
  }

  return `${dateStr} at ${timeStr}`;
};

// Formats a "HH:MM" 24-hour string to 12-hour string with AM/PM
const formatTime12Hour = (time24: string): string => {
  if (!time24) return "Not set";
  const [hoursStr, minutesStr] = time24.split(":");
  const hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return time24;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutesStr} ${ampm}`;
};


export default function Settings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);

  // Animated pulse for the cloud icon in the backup overlay
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (backingUp) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
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

  // User Profile
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);

  // Backup Configuration States
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    enabled: false,
    frequency: "daily",
    time: "22:00",
    dayOfWeek: 0,
  });
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      updateConfig({ time: `${hours}:${minutes}` });
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      // Fetch session
      const session = await getSession();
      if (session) {
        setEmail(session.email);
        setToken(session.token || null);
        if (session.businessName) {
          setBusinessName(session.businessName);
        } else {
          // Look up business name if available (we will parse dt_users to find matching email)
          const rawUsers = await getUsers();
          const userObj = rawUsers.find((u: any) => u.email === session.email);
          if (userObj) {
            setBusinessName(userObj.businessName);
          } else {
            setBusinessName("Business Owner");
          }
        }
      }

      // Fetch backup configs
      const config = await getBackupConfig();
      setBackupConfig(config);

      const lastTime = await getLastBackupTime();
      setLastBackupTime(lastTime);
    } catch (e) {
      console.error("Failed to load settings data", e);
    } finally {
      setLoading(false);
    }
  };

  // Save changes to backup config
  const updateConfig = async (updated: Partial<BackupConfig>) => {
    const newConfig = { ...backupConfig, ...updated };
    setBackupConfig(newConfig);
    await saveBackupConfig(newConfig);

    // When the user enables auto-backup, immediately run a backup
    // so they get instant confirmation the feature works.
    if (updated.enabled === true) {
      setTimeout(() => {
        handleLocalBackup();
      }, 400);
    }
  };

  // Trigger online cloud backup
  const handleLocalBackup = async () => {
    if (!token) {
      Alert.alert("Authentication Required", "Please log in again to back up your data.");
      return;
    }

    try {
      setBackingUp(true);

      // Compile backup data
      const debts = await getUserDebts();

      const backupPayload = {
        transactions: debts,
      };

      // Call backend API
      await apiCreateBackup(token, backupPayload);
      
      // Save backup timestamp locally
      const nowStr = await updateLastBackupTime();
      setLastBackupTime(nowStr);

      Alert.alert(
        "Backup Success",
        "Your customer debts and configurations have been successfully backed up to your secure online cloud database!"
      );
    } catch (err: any) {
      console.error("Online backup error:", err);
      Alert.alert(
        "Backup Failed",
        err.message || "Unable to establish connection to online database."
      );
    } finally {
      setBackingUp(false);
    }
  };

  // Trigger manual export (Share Sheet)
  const handleExportData = async () => {
    try {
      setExporting(true);
      await triggerManualBackup();
      
      // Update states
      const lastTime = await getLastBackupTime();
      setLastBackupTime(lastTime);

      Alert.alert("Export Successful", "All debts and customer records have been exported to Excel!");
    } catch (err) {
      console.error("Export data error:", err);
      Alert.alert("Export Failed", "Unable to export data.");
    } finally {
      setExporting(false);
    }
  };

  // Trigger online cloud restore
  const handleRestoreBackup = async () => {
    if (!token) {
      Alert.alert("Authentication Required", "Please log in again to restore your data.");
      return;
    }

    Alert.alert(
      "Confirm Cloud Restore",
      "Restoring from your online cloud backup will overwrite your current device data with your last saved database records. This cannot be undone.\n\nAre you sure you want to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Restore Data",
          style: "default",
          onPress: async () => {
            try {
              setRestoring(true);
              
              // Fetch latest backup from backend
              const response = await apiRestoreBackup(token);
              // Support multiple nested response shapes from the backend
              const backupList =
                response?.data?.backupData?.data ||
                [];
              
              const actualBackupList = Array.isArray(backupList) ? backupList : [];

              if (actualBackupList.length === 0) {
                Alert.alert("No Backup Found", "You do not have any saved cloud backups to restore from.");
                return;
              }

              // Extract data from the most recent backup
              const latestBackup = actualBackupList[0];
              const backupPayload = latestBackup?.data || latestBackup || null;

              if (!backupPayload) {
                console.log(backupPayload);
                
                Alert.alert("Restore Failed", "The latest cloud backup data is empty or corrupt.");
                return;
              }

              // Extract user and transactions with support for multiple formats
              // const user =
              //   backupPayload.user ||
              //   backupPayload.data?.users ||
              //   backupPayload.users ||
              //   [];
              const transactions =
                backupPayload.transactions ||
                backupPayload.data?.debts ||
                backupPayload.debts ||
                [];

              // Save tables to SQLite
              if (Array.isArray(transactions)) {
                await saveDebts(transactions);
              }
              // if (Array.isArray(user)) {
              //   await AsyncStorage.setItem("dt_users", JSON.stringify(user));
              // }

              Alert.alert(
                "Restore Success",
                "Your customer debts and configurations have been successfully restored from your secure online cloud backup!"
              );
            } catch (err: any) {
              console.error("Online restore error:", err);
              Alert.alert(
                "Restore Failed",
                err.message || "Unable to establish connection to online backup."
              );
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  };

  const handleClearLocalData = () => {
    Alert.alert(
      "Confirm Clear Local Data",
      "Are you sure you want to delete all customer debt records and transactions from this device? This will erase all local records and cannot be undone.\n\nAre you sure you want to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete Everything",
          style: "destructive",
          onPress: async () => {
            try {
              setClearing(true);
              await clearUserDebts();
              Alert.alert(
                "Data Cleared",
                "All customer debt records and transactions have been successfully cleared from this device!"
              );
            } catch (err: any) {
              console.error("Clear local data error:", err);
              Alert.alert(
                "Clear Failed",
                err.message || "Unable to delete local records."
              );
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading Settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {businessName ? businessName.substring(0, 2).toUpperCase() : "DT"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{businessName}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
        </View>

        {/* Section: Backup and Sync */}
        <Text style={styles.sectionHeader}>Backup & Sync Settings</Text>

        <View style={styles.card}>
          {/* Row 1: Enable Auto Backup */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Ionicons name="cloud-upload-outline" size={22} color={PRIMARY} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Automatic Backups</Text>
                <Text style={styles.settingDescription}>
                  Back up debts silently in the background
                </Text>
              </View>
            </View>
            <Switch
              value={backupConfig.enabled}
              onValueChange={(val) => updateConfig({ enabled: val })}
              trackColor={{ false: "#E5E7EB", true: "#93C5FD" }}
              thumbColor={backupConfig.enabled ? PRIMARY : "#F3F4F6"}
            />
          </View>

          {/* Conditional Auto Backup Setup */}
          {backupConfig.enabled && (
            <View style={styles.backupOptions}>
              <View style={styles.divider} />

              {/* Frequency Selector */}
              <Text style={styles.optionsLabel}>Backup Frequency</Text>
              <View style={styles.frequencyRow}>
                <TouchableOpacity
                  style={[
                    styles.freqButton,
                    backupConfig.frequency === "daily" && styles.freqButtonActive,
                  ]}
                  onPress={() => updateConfig({ frequency: "daily" })}
                >
                  <Text
                    style={[
                      styles.freqText,
                      backupConfig.frequency === "daily" && styles.freqTextActive,
                    ]}
                  >
                    Daily
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.freqButton,
                    backupConfig.frequency === "weekly" && styles.freqButtonActive,
                  ]}
                  onPress={() => updateConfig({ frequency: "weekly" })}
                >
                  <Text
                    style={[
                      styles.freqText,
                      backupConfig.frequency === "weekly" && styles.freqTextActive,
                    ]}
                  >
                    Weekly
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Weekly Day Selector */}
              {backupConfig.frequency === "weekly" && (
                <View style={styles.weeklyContainer}>
                  <Text style={styles.optionsLabel}>Choose Day of the Week</Text>
                  <View style={styles.daysRow}>
                    {DAYS_OF_WEEK.map((day) => {
                      const isActive = backupConfig.dayOfWeek === day.value;
                      return (
                        <TouchableOpacity
                          key={day.value}
                          style={[styles.dayChip, isActive && styles.dayChipActive]}
                          onPress={() => updateConfig({ dayOfWeek: day.value })}
                        >
                          <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.dayHelperText}>
                    Backups will run every{" "}
                    <Text style={{ fontWeight: "700", color: PRIMARY }}>
                      {DAYS_OF_WEEK.find((d) => d.value === backupConfig.dayOfWeek)?.fullName}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Time Selector (Native Date/Time Picker) */}
              <View style={styles.timePickerContainer}>
                <Text style={styles.optionsLabel}>Backup Time</Text>
                {Platform.OS === "ios" ? (
                  <View style={{ alignItems: "flex-start", marginTop: 4 }}>
                    <DateTimePicker
                      value={getPickerDate(backupConfig.time)}
                      mode="time"
                      is24Hour={false}
                      onChange={handleTimeChange}
                      themeVariant="light"
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.timeSelector}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={styles.timeSelectorText}>{formatTime12Hour(backupConfig.time)}</Text>
                      <Ionicons name="time-outline" size={18} color="#6B7280" />
                    </TouchableOpacity>
                    {showTimePicker && (
                      <DateTimePicker
                        value={getPickerDate(backupConfig.time)}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={handleTimeChange}
                      />
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          {/* Display Last Backup Time */}
          <View style={styles.divider} />
          <View style={styles.lastBackupRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.lastBackupText}>
              Last backup:{" "}
              <Text style={{ fontWeight: "600", color: "#374151" }}>
                {lastBackupTime ? formatLastBackupTime(lastBackupTime) : "Never"}
              </Text>
            </Text>
          </View>
        </View>

        {/* Section: Cloud Backup & Data Portability */}
        <Text style={styles.sectionHeader}>Cloud & Data Portability</Text>

        <View style={styles.actionsCard}>
          <Text style={styles.actionsCardDesc}>
            Sync your active customer records securely to your online cloud backup, restore your database from the cloud, or export your debts directly to Microsoft Excel.
          </Text>

          {/* Cloud Backup Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLocalBackup}
            disabled={backingUp || restoring || exporting}
          >
            {backingUp ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Back Up Now (Cloud Sync)</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cloud Restore Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRestoreBackup}
            disabled={backingUp || restoring || exporting}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={20} color={PRIMARY} />
                <Text style={styles.secondaryButtonText}>Restore Backup (Cloud Sync)</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Export Data Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleExportData}
            disabled={backingUp || restoring || exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <>
                <Ionicons name="grid-outline" size={20} color={PRIMARY} />
                <Text style={styles.secondaryButtonText}>Export All Debts (Excel)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Section: Danger Zone */}
        {/* <Text style={[styles.sectionHeader, { color: DANGER }]}>Danger Zone</Text> */}

        {/* <View style={styles.actionsCard}>
          <Text style={styles.actionsCardDesc}>
            Erase all locally stored customer debt records and transaction history from this device to start fresh. This action does not affect your online cloud backups.
          </Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearLocalData}
            disabled={backingUp || restoring || exporting || clearing}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={DANGER} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={DANGER} />
                <Text style={styles.dangerButtonText}>Clear All Local Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View> */}
      </ScrollView>

      {/* ── Backup Loading Overlay ── */}
      <Modal
        visible={backingUp}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            {/* Animated cloud icon */}
            <Animated.View
              style={[
                styles.overlayIconRing,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Ionicons name="cloud-upload" size={44} color={PRIMARY} />
            </Animated.View>

            <Text style={styles.overlayTitle}>Backing Up Your Data</Text>
            <Text style={styles.overlaySubtitle}>
              Securely syncing your customer records to the cloud.
              Please keep the app open.
            </Text>

            <ActivityIndicator
              size="large"
              color={PRIMARY}
              style={{ marginTop: 20 }}
            />

            <View style={styles.overlaySteps}>
              <View style={styles.overlayStep}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.overlayStepText}>Collecting debt records</Text>
              </View>
              <View style={styles.overlayStep}>
                <Ionicons name="ellipse" size={10} color={PRIMARY} style={{ marginTop: 3 }} />
                <Text style={styles.overlayStepText}>Uploading to secure cloud...</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileAvatarText: {
    color: PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  profileEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 16,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  settingDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },
  backupOptions: {
    marginTop: 4,
  },
  optionsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 8,
  },
  frequencyRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 10,
    marginBottom: 16,
  },
  freqButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  freqButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  freqText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  freqTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },
  weeklyContainer: {
    marginBottom: 16,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: {
    backgroundColor: PRIMARY,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  dayChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayHelperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  timePickerContainer: {
    position: "relative",
    zIndex: 100,
  },
  timeSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  timeSelectorText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  timeDropdown: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
    zIndex: 200,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemActive: {
    backgroundColor: PRIMARY_LIGHT,
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#4B5563",
  },
  dropdownItemTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },
  lastBackupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  lastBackupText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 8,
  },
  actionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  actionsCardDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  dangerButton: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: DANGER,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dangerButtonText: {
    color: DANGER,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: "700",
  },
  backupsListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  backupsListHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 12,
  },
  miniDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  backupItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backupItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backupItemMeta: {
    marginLeft: 12,
  },
  backupItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  backupItemSize: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  backupItemActions: {
    flexDirection: "row",
    gap: 6,
  },
  backupItemBtn: {
    padding: 8,
  },

  // ── Backup Overlay ──
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  overlayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 12,
  },
  overlayIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  overlaySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  overlaySteps: {
    marginTop: 24,
    alignSelf: "stretch",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
  },
  overlayStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  overlayStepText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
});
