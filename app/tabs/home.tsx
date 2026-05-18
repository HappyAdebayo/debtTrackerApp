import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { getSession, clearSession } from "@/lib/authStorage";
import { getUserDebts } from "@/lib/debtStorage";
import { Ionicons } from "@expo/vector-icons";
import { checkAndTriggerAutoBackup, triggerManualBackup } from "@/lib/backupService";

export default function Home() {
  const router = useRouter();
  const [peopleCount, setPeopleCount] = useState(0);
  const [debtCount, setDebtCount] = useState(0);
  const [checking, setChecking] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    try {
      setExporting(true);
      await triggerManualBackup();
      Alert.alert("Success", "Backup file created and exported successfully!");
    } catch (err) {
      console.error("Export failed:", err);
      Alert.alert("Export Failed", "Unable to export backup file.");
    } finally {
      setExporting(false);
    }
  };

  useFocusEffect(
  useCallback(() => {
    checkAuth();
  }, [])
);

  const checkAuth = async () => {
    const session = await getSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    setChecking(false);
    loadStats();

    // Trigger passive auto-backup check
    try {
      await checkAndTriggerAutoBackup();
    } catch (err) {
      console.error("Passive background auto-backup trigger failed:", err);
    }
  };

  const loadStats = async () => {
  const debts = await getUserDebts();

  const uniquePeople = new Set(debts.map((d) => d.name));
  setPeopleCount(uniquePeople.size);

  const total = debts.reduce((sum, d) => {
    const customerTotal = d.amount.reduce((aSum, a) => aSum + a.amount, 0);
    return sum + customerTotal;
  }, 0);

  setDebtCount(total);
};

  const handleLogout = async () => {
    await clearSession();
    router.replace("/login");
  };

  if (checking) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Debt Tracker</Text>
            <Text style={styles.subtitle}>
              Quick overview of who owes you
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={styles.settingsBtn}
            >
              <Ionicons name="settings-outline" size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutBtn}
            >
              <Ionicons name="log-out-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{peopleCount}</Text>
          <Text style={styles.cardLabel}>People Owing</Text>
        </View>

        <View style={styles.card}>
          <Text 
          numberOfLines={1}       
          ellipsizeMode="tail" 
          style={styles.cardNumber}>₦{debtCount.toLocaleString()}</Text>
          <Text style={styles.cardLabel}>Total Debts</Text>
        </View>
      </View>

      {/* Quick Export Hub */}
      <View style={styles.quickExportCard}>
        <View style={styles.exportHeader}>
          <View style={styles.exportIconContainer}>
            <Ionicons name="cloud-upload" size={24} color="#2563EB" />
          </View>
          <View style={styles.exportTitleContainer}>
            <Text style={styles.exportTitle}>Instant Excel Export</Text>
            <Text style={styles.exportSubtitle}>
              Secure your records by exporting directly to Microsoft Excel or Sheets.
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.exportBtn} 
          onPress={handleExportData}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.exportBtnText}>Export All Debts (Excel)</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.manageBtn}
          onPress={() => router.push("/settings")}
        >
          <Text style={styles.manageBtnText}>Manage Automated Backups</Text>
          <Ionicons name="arrow-forward" size={14} color="#2563EB" />
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  header: {
    backgroundColor: "#2563EB",
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  settingsBtn: {
    padding: 6,
  },

  logoutBtn: {
    padding: 6,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },

  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: -32,
    paddingHorizontal: 16,
  },

  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 8,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },

  cardNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  cardLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
  },

  quickExportCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginTop: 24,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },

  exportHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  exportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  exportTitleContainer: {
    flex: 1,
  },

  exportTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  exportSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16,
  },

  exportBtn: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#2563EB",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 2,
  },

  exportBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  manageBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 4,
    paddingVertical: 4,
  },

  manageBtnText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },
});