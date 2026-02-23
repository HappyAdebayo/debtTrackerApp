import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity,} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { getSession, clearSession } from "@/lib/authStorage";
import { getUserDebts } from "@/lib/debtStorage";
import { Ionicons } from "@expo/vector-icons";

export default function Home() {
  const router = useRouter();
  const [peopleCount, setPeopleCount] = useState(0);
  const [debtCount, setDebtCount] = useState(0);
  const [checking, setChecking] = useState(true);

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

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={26} color="#fff" />
          </TouchableOpacity>
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
    </ScrollView>
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
});