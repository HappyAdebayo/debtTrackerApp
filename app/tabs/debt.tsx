import AddDebtModal from "@/components/AddDebtModal";
import { addDebt as addDebtToStorage, Debt, getUserDebts, saveDebts } from "@/lib/debtStorage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);

  const router = useRouter();

  const loadDebts = async () => {
    const userDebts = await getUserDebts();
    setDebts(userDebts);
  };

  useFocusEffect(
  useCallback(() => {
    loadDebts();
  }, [])
);

const addDebt = async (name: string) => {
  if (!name.trim()) return;

  if (editingCustomer) {
    const updatedDebts = debts.map(d => {
      if (d.name === editingCustomer) {
        return {
          ...d,
          name: name.trim()
        };
      }
      return d;
    });
    await saveDebts(updatedDebts);
  } else {
    const newDebt: Omit<Debt, "id" | "userId"> = {
      name: name.trim(),
      amount:[]
    };
    await addDebtToStorage(newDebt);

    const allDebts = await getUserDebts();
    const created = allDebts.find(d => d.name === name.trim());
    if (created) router.push(`/debt/${created.id}`);
  }

  setEditingCustomer(null);
  setModalVisible(false);
  await loadDebts();
};
  

const deleteDebt = async (id: string, name: string) => {
  if (Platform.OS === "web") {
    const ok = window.confirm(`Are you sure you want to delete all debts for ${name}?`);
    if (!ok) return;
  } else {
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Delete Customer",
        `Are you sure you want to delete all debts for ${name}?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Delete", style: "destructive", onPress: () => resolve(true) },
        ]
      );
    });
    if (!ok) return;
  }

  const remaining = debts.filter(d => d.id !== id);
  await saveDebts(remaining);
  await loadDebts();
};

    const filteredDebts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return debts;
    return debts.filter((debt) => debt.name.toLowerCase().includes(query));
  }, [debts, searchQuery]);

  const totalDebt = debts.reduce(
    (sum, d) => sum + d.amount.reduce((aSum, a) => aSum + a.amount, 0),
    0
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Customers Debt</Text>
          <Text style={styles.headerSubtitle}>{debts.length} customer{debts.length === 1 ? "" : "s"}</Text>
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => {
            setSearchVisible((prev) => {
              if (prev) {
                setSearchQuery("");
              }
              return !prev;
            });
          }}
        >
          <Ionicons name={searchVisible ? "close" : "search"} size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {searchVisible && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search debtors"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      )}

      {/* List */}
      <FlatList
        data={filteredDebts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              router.push({
                pathname: "/debt/[id]",
                params: { id: item.id },
              })
            }
          >
            <View style={styles.itemInfo}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.totalAmount}>
                ₦{item.amount.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.iconsRow}>
              <Pressable
                onPress={() => {
                  setEditingCustomer(item.name);
                  setModalVisible(true);
                }}
                style={styles.iconBtn}
              >
                <Ionicons name="pencil" size={18} color="#2563EB" />
              </Pressable>

              <Pressable
                onPress={() => deleteDebt(item.id, item.name)}
                style={styles.iconBtn}
              >
                <Ionicons name="trash" size={18} color="#DC2626" />
              </Pressable>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No debts yet. Add a customer to start.</Text>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <AddDebtModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingCustomer(null);
        }}
        onAdd={addDebt}
        cName={editingCustomer ?? undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", padding: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  headerSubtitle: { marginTop: 2, fontSize: 13, color: "#6B7280", maxWidth: 220 },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    height: 42,
  },

  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 12,
  },
  itemInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700", color: "#111827" },
  totalAmount: { fontSize: 14, fontWeight: "500", color: "#6B7280", marginTop: 4 },

  iconsRow: { flexDirection: "row", gap: 16 },
  iconBtn: { padding: 6 },

  empty: { textAlign: "center", color: "#6B7280", marginTop: 40, fontSize: 16 },

  /* FAB */
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#2563EB",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});