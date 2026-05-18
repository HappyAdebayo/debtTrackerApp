import { Debt, getDebts, saveDebts } from "@/lib/debtStorage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, Image, TouchableOpacity, } from "react-native";
import AmountModal from "./amountModal";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DebtDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [personName, setPersonName] = useState<string>("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<"add" | "subtract">("add");

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    const allDebts = await getDebts();
    const debtEntry = allDebts.find((d) => d.id === id);
    if (!debtEntry) return;

    setPersonName(debtEntry.name);
    const customerDebts = allDebts.filter((d) => d.name === debtEntry.name);
    setDebts(customerDebts);
  };

  const handleSubmitAmount = (amount: number, description?: string, image?: string) => {
    const delta = modalAction === "add" ? amount : -amount;

    if (debts.length > 0) {
      const updatedDebts = debts.map((d, idx) => {
        if (idx === 0) {
          return {
            ...d,
            amount: [
              ...d.amount,
              { id: Date.now().toString(), amount: delta, description, image },
            ],
          };
        }
        return d;
      });
      setDebts(updatedDebts);

      getDebts().then((all) =>
        saveDebts(
          all.map((d) => updatedDebts.find((u) => u.id === d.id) || d)
        )
      );
    }

    setModalVisible(false);
  };

  const amountList = debts.flatMap((d) => d.amount.map((a) => ({ ...a })));
  const total = amountList.reduce((sum, a) => sum + a.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerSubtitle}>{personName}</Text>
      </View>

      <FlatList
        data={amountList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text
              style={[
                styles.amountText,
                { color: item.amount > 0 ? "#DC2626" : "#16A34A" },
              ]}
            >
              {item.amount >= 0 ? "+" : ""}
              ₦{item.amount.toLocaleString()}
            </Text>

            {item.description ? (
              <Text style={styles.itemDescription}>{item.description}</Text>
            ) : null}

            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.itemImage} />
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No debts yet. Add an amount to start.</Text>
        }
        contentContainerStyle={{ paddingBottom: 180 }}
      />

      <View style={styles.bottomBar}>
        <Text style={styles.totalText}>Total Debt: ₦{total.toLocaleString()}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.circleButton, { backgroundColor: "#16A34A" }]}
            onPress={() => {
              setModalAction("add");
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.circleButton, { backgroundColor: "#DC2626" }]}
            onPress={() => {
              setModalAction("subtract");
              setModalVisible(true);
            }}
          >
            <Ionicons name="remove" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <AmountModal
        visible={modalVisible}
        action={modalAction}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmitAmount}
        currentDebt={total}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 16 },

  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerSubtitle: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "800",
  },

  itemCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  amountText: { fontSize: 18, fontWeight: "700" },
  itemDescription: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  itemImage: { width: "50%", height: 120, borderRadius: 12, marginTop: 8 },

  empty: { textAlign: "center", color: "#6B7280", marginTop: 40 },

  bottomBar: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  totalText: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 12 },

  actions: { flexDirection: "row", gap: 24 },
  circleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});