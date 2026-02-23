import AddDebtModal from "@/components/AddDebtModal";
import { addDebt as addDebtToStorage, Debt, getUserDebts, saveDebts } from "@/lib/debtStorage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);

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

  const totalDebt = debts.reduce(
    (sum, d) => sum + d.amount.reduce((aSum, a) => aSum + a.amount, 0),
    0
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers Debt</Text>
      </View>

      {/* List */}
      <FlatList
        data={debts}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", padding: 16 },

  header: {
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 3,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#6B7280" },

  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
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