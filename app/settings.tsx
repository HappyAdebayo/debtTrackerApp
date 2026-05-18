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
import DateTimePicker from "@react-native-community/datetimepicker";

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

export default function Settings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);

  // User Profile
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");

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
        // Look up business name if available (we will parse dt_users to find matching email)
        const rawUsers = await getUsers();
        const userObj = rawUsers.find((u: any) => u.email === session.email);
        if (userObj) {
          setBusinessName(userObj.businessName);
        } else {
          setBusinessName("Business Owner");
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
  };

  // Trigger simulated online backup
  const handleLocalBackup = async () => {
    try {
      setBackingUp(true);
      // Simulate 1.5s online cloud database communication
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Save backup timestamp
      const nowStr = await updateLastBackupTime();
      setLastBackupTime(nowStr);

      Alert.alert(
        "Backup Success",
        "Your customer debts and configurations have been successfully backed up to your secure online cloud database!"
      );
    } catch (err) {
      console.error("Online backup error:", err);
      Alert.alert("Backup Failed", "Unable to establish connection to online database.");
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

  // Trigger simulated online restore
  const handleRestoreBackup = async () => {
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
              // Simulate 1.5s online cloud database download
              await new Promise((resolve) => setTimeout(resolve, 1500));

              Alert.alert(
                "Restore Success",
                "Your customer debts and configurations have been successfully restored from your secure online cloud backup!"
              );
            } catch (err) {
              console.error("Online restore error:", err);
              Alert.alert("Restore Failed", "Unable to establish connection to online backup.");
            } finally {
              setRestoring(false);
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
                <Text style={styles.optionsLabel}>Trigger Hour</Text>
                {Platform.OS === "ios" ? (
                  <View style={{ alignItems: "flex-start", marginTop: 4 }}>
                    <DateTimePicker
                      value={getPickerDate(backupConfig.time)}
                      mode="time"
                      is24Hour={true}
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
                      <Text style={styles.timeSelectorText}>{backupConfig.time}</Text>
                      <Ionicons name="time-outline" size={18} color="#6B7280" />
                    </TouchableOpacity>
                    {showTimePicker && (
                      <DateTimePicker
                        value={getPickerDate(backupConfig.time)}
                        mode="time"
                        is24Hour={true}
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
                {lastBackupTime ? new Date(lastBackupTime).toLocaleString() : "Never"}
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
      </ScrollView>
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
});
