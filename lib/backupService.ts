import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { getDebts, saveDebts } from "./debtStorage";

const DEBTS_KEY = "dt_debts";
const USERS_KEY = "dt_users";
const BACKUP_CONFIG_KEY = "dt_backup_config";
const LAST_BACKUP_TIME_KEY = "dt_last_backup_time"; // For display only (manual & scheduled)
const LAST_SCHEDULED_BACKUP_TIME_KEY = "dt_last_scheduled_backup_time"; // Tracks scheduled backups only

const BACKUP_DIR = FileSystem.documentDirectory + "backups/";

export type BackupConfig = {
  enabled: boolean;
  frequency: "daily" | "weekly";
  time: string; // "HH:MM" format e.g. "22:00"
  dayOfWeek: number; // 0-6 (0=Sunday, 1=Monday...)
};

export type BackupData = {
  app: "DebtTracker";
  version: string;
  exportedAt: string;
  data: {
    debts: any[];
    users: any[];
  };
};

export type LocalBackupFile = {
  name: string;
  uri: string;
  sizeBytes: number;
  createdAt: number;
};

// 1. Get current Backup configuration
export async function getBackupConfig(): Promise<BackupConfig> {
  try {
    const raw = await AsyncStorage.getItem(BACKUP_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading backup config:", error);
  }
  // Default config: Auto-backups off, daily at 10 PM
  return {
    enabled: false,
    frequency: "daily",
    time: "22:00",
    dayOfWeek: 0,
  };
}

// 2. Save Backup configuration
export async function saveBackupConfig(config: BackupConfig): Promise<void> {
  await AsyncStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(config));
}

// 3. Get last backup time
export async function getLastBackupTime(): Promise<string | null> {
  return await AsyncStorage.getItem(LAST_BACKUP_TIME_KEY);
}

// 4. Compile all app database tables into our JSON schema
async function compileBackupData(): Promise<BackupData> {
  const debts = await getDebts();
  const usersRaw = await AsyncStorage.getItem(USERS_KEY);
  const users = usersRaw ? JSON.parse(usersRaw) : [];

  return {
    app: "DebtTracker",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    data: {
      debts,
      users,
    },
  };
}

// 5. Trigger a Manual Backup (Compiles debt data into CSV format and opens the Native Share Sheet for Excel)
export async function triggerManualBackup(): Promise<boolean> {
  try {
    const debts = await getDebts();

    // Create CSV content starting with UTF-8 Byte Order Mark (BOM)
    // This BOM guarantees that Excel parses Naira symbol (₦) and UTF-8 characters correctly.
    let csvContent = "\uFEFF";
    csvContent += "Customer Name,Date,Amount,Description\n";

    for (const debt of debts) {
      if (debt.amount && Array.isArray(debt.amount)) {
        for (const item of debt.amount) {
          const cleanName = (debt.name || "").replace(/"/g, '""');
          const cleanDesc = (item.description || "").replace(/"/g, '""');
          const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";
          
          csvContent += `"${cleanName}","${dateStr}",${item.amount},"${cleanDesc}"\n`;
        }
      }
    }

    // Save to a temporary file in the cache directory with .csv extension
    const tempFileUri = `${FileSystem.cacheDirectory}debt_tracker_export_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(tempFileUri, csvContent);

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("Sharing is not available on this device");
    }

    // Trigger native share sheet
    await Sharing.shareAsync(tempFileUri, {
      mimeType: "text/csv",
      dialogTitle: "Export Debt Records (Excel)",
      UTI: "public.comma-separated-values-text",
    });

    // Save backup timestamp
    const nowStr = new Date().toISOString();
    await AsyncStorage.setItem(LAST_BACKUP_TIME_KEY, nowStr);

    return true;
  } catch (error) {
    console.error("Excel Export failed:", error);
    throw error;
  }
}

// 6. Restore Data from a selected Backup JSON File
export async function restoreFromBackup(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Pick a document
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, message: "Restore cancelled" };
    }

    const fileUri = result.assets[0].uri;

    // 2. Read file content
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    const parsedData = JSON.parse(fileContent) as BackupData;

    // 3. Validate backup file integrity and structure
    if (parsedData.app !== "DebtTracker" || !parsedData.data) {
      return {
        success: false,
        message: "Invalid file format. Please select a valid Debt Tracker backup file.",
      };
    }

    const { debts, users } = parsedData.data;
    if (!Array.isArray(debts) || !Array.isArray(users)) {
      return {
        success: false,
        message: "Backup file is corrupted or formatted incorrectly.",
      };
    }

    // 4. Overwrite storage with the imported tables
    await saveDebts(debts);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    return {
      success: true,
      message: `Data successfully restored! Restored ${debts.length} customers and ${users.length} users.`,
    };
  } catch (error) {
    console.error("Restore failed:", error);
    return {
      success: false,
      message: `Failed to restore: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// 7. Perform a local automatic background backup (saves silent file rolling history)
export async function performSilentBackup(): Promise<string> {
  try {
    // Ensure the backup directory exists
    const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
    }

    const backupData = await compileBackupData();
    const jsonStr = JSON.stringify(backupData);

    const fileName = `backup_auto_${Date.now()}.json`;
    const fileUri = BACKUP_DIR + fileName;

    await FileSystem.writeAsStringAsync(fileUri, jsonStr);

    // Save BOTH timestamps:
    // 1. LAST_BACKUP_TIME_KEY for display in UI (shows any backup, manual or scheduled)
    // 2. LAST_SCHEDULED_BACKUP_TIME_KEY for scheduling logic (prevents duplicate scheduled backups)
    const nowStr = new Date().toISOString();
    await AsyncStorage.setItem(LAST_BACKUP_TIME_KEY, nowStr);
    await AsyncStorage.setItem(LAST_SCHEDULED_BACKUP_TIME_KEY, nowStr);

    // Clean up old backups: Keep only the 5 most recent
    await cleanOldLocalBackups();

    return fileName;
  } catch (error) {
    console.error("Silent auto backup failed:", error);
    throw error;
  }
}

// Helper to keep only the last 5 backups
async function cleanOldLocalBackups(): Promise<void> {
  try {
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
    if (files.length <= 5) return;

    // Fetch details of all auto backup files
    const fileDetails = await Promise.all(
      files
        .filter((file) => file.startsWith("backup_auto_"))
        .map(async (fileName) => {
          const path = BACKUP_DIR + fileName;
          const info = await FileSystem.getInfoAsync(path);
          return {
            name: fileName,
            path,
            createdAt: info.exists ? info.modificationTime * 1000 : 0, // expo-file-system uses seconds for modificationTime
          };
        })
    );

    // Sort: Oldest first
    fileDetails.sort((a, b) => a.createdAt - b.createdAt);

    // Delete older files until we only have 5 left
    const filesToDeleteCount = fileDetails.length - 5;
    for (let i = 0; i < filesToDeleteCount; i++) {
      await FileSystem.deleteAsync(fileDetails[i].path, { idempotent: true });
    }
  } catch (error) {
    console.error("Error cleaning up old local backups:", error);
  }
}

// 8. Fetch the list of local rolling auto-backup files
export async function getLocalBackupsList(): Promise<LocalBackupFile[]> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
    if (!dirInfo.exists) return [];

    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
    const backupFiles = await Promise.all(
      files
        .filter((file) => file.startsWith("backup_auto_"))
        .map(async (fileName) => {
          const path = BACKUP_DIR + fileName;
          const info = await FileSystem.getInfoAsync(path);
          
          let size = 0;
          let time = Date.now();
          
          if (info.exists) {
            size = info.size || 0;
            time = info.modificationTime * 1000 || Date.now();
          }

          return {
            name: fileName,
            uri: path,
            sizeBytes: size,
            createdAt: time,
          };
        })
    );

    // Sort: Newest first
    return backupFiles.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error listing local backups:", error);
    return [];
  }
}

// 9. Delete a local auto-backup file
export async function deleteLocalBackupFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

// 10. Check if a scheduled auto-backup is due right now.
// Uses calendar-date comparison (not hours elapsed) so a manual backup
// earlier in the day does NOT block the scheduled backup from firing.
export async function isBackupDue(): Promise<boolean> {
  try {
    const config = await getBackupConfig();

    if (!config.enabled) {
      console.log("[isBackupDue] Auto-backup is DISABLED in settings → not due.");
      return false;
    }

    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const [schedHour, schedMin] = config.time.split(":").map(Number);

    // Has the scheduled clock time been reached today?
    const isTimePassed =
      currentHour > schedHour || (currentHour === schedHour && currentMinute >= schedMin);

    console.log(
      `[isBackupDue] Now=${currentHour}:${String(currentMinute).padStart(2,"0")} | ` +
      `Scheduled=${schedHour}:${String(schedMin).padStart(2,"0")} | ` +
      `isTimePassed=${isTimePassed}`
    );

    if (!isTimePassed) {
      console.log("[isBackupDue] Scheduled time not reached yet → not due.");
      return false;
    }

    const lastBackupStr = await getLastBackupTime();
    console.log(`[isBackupDue] Last backup timestamp: ${lastBackupStr ?? "(never)"}`);

    if (config.frequency === "daily") {
      // Check SCHEDULED backup history, not manual backup history
      const lastScheduledStr = await AsyncStorage.getItem(LAST_SCHEDULED_BACKUP_TIME_KEY);
      if (!lastScheduledStr) {
        console.log("[isBackupDue] Never backed up (scheduled) before → DUE NOW.");
        return true;
      }
      const lastScheduled = new Date(lastScheduledStr);
      const sameDay = lastScheduled.toDateString() === now.toDateString();
      console.log(
        `[isBackupDue] Last scheduled backup date: ${lastScheduled.toDateString()} | ` +
        `Today: ${now.toDateString()} | ` +
        `sameDay=${sameDay} → due=${!sameDay}`
      );
      // Due if the last SCHEDULED backup was on a DIFFERENT calendar day
      return !sameDay;
    } else {
      // Weekly: must be the correct day of the week
      if (currentDayOfWeek !== config.dayOfWeek) {
        console.log(
          `[isBackupDue] Weekly — today is day ${currentDayOfWeek}, scheduled day is ${config.dayOfWeek} → not due.`
        );
        return false;
      }
      // Check SCHEDULED backup history
      const lastScheduledStr = await AsyncStorage.getItem(LAST_SCHEDULED_BACKUP_TIME_KEY);
      if (!lastScheduledStr) {
        console.log("[isBackupDue] Weekly — correct day, never backed up (scheduled) → DUE NOW.");
        return true;
      }
      const lastScheduled = new Date(lastScheduledStr);
      const daysDiff = (now.getTime() - lastScheduled.getTime()) / (24 * 60 * 60 * 1000);
      const due = daysDiff >= 6;
      console.log(`[isBackupDue] Weekly — daysDiff=${daysDiff.toFixed(1)} → due=${due}`);
      return due;
    }
  } catch (error) {
    console.error("[isBackupDue] Error:", error);
    return false;
  }
}

// Legacy wrapper — kept for backward compatibility
export async function checkAndTriggerAutoBackup(): Promise<boolean> {
  const due = await isBackupDue();
  if (due) {
    await performSilentBackup();
    return true;
  }
  return false;
}

// 11. Helper to update the last backup time externally
export async function updateLastBackupTime(): Promise<string> {
  const nowStr = new Date().toISOString();
  await AsyncStorage.setItem(LAST_BACKUP_TIME_KEY, nowStr);
  return nowStr;
}
