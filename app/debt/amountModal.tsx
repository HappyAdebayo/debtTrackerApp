import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

type AmountModalProps = {
  visible: boolean;
  action: "add" | "subtract";
  currentDebt?: number;
  onClose: () => void;
  onSubmit: (amount: number, description?: string, image?: string) => void;
};

export default function AmountModal({ visible, action,currentDebt = 0, onClose, onSubmit }: AmountModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [image, setImage] = useState<string>("");

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission denied", "You need to allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Please enter a number greater than 0");
      return;
    }

     if (action === "subtract" && amt > currentDebt) {
      Alert.alert("Invalid amount", `Amount cannot be greater than current debt (₦${currentDebt.toLocaleString()})`);
      return;
    }

    onSubmit(amt, description || undefined, image || undefined);
    setAmount("");
    setDescription("");
    setImage("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {action === "add" ? "Add Amount" : "Subtract Amount"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <TextInput
            style={styles.input}
            placeholder="Optional description"
            value={description}
            onChangeText={setDescription}
          />

          <Pressable style={[styles.imagePicker]} onPress={pickImage}>
            {image ? (
                <Image
                source={{ uri: image }}
                style={styles.imagePreview}
                resizeMode="cover"
                />
            ) : (
                <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Tap to select an image</Text>
                </View>
            )}
            </Pressable>

          {image ? (
            <Image
              source={{ uri: image }}
              style={{ width: 100, height: 100, alignSelf: "center", marginBottom: 12, borderRadius: 8 }}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.modalButtons}>
            <Pressable style={[styles.modalBtn, { backgroundColor: "#2563EB" }]} onPress={handleSubmit}>
              <Text style={styles.modalBtnText}>Submit</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, { backgroundColor: "#6B7280" }]} onPress={onClose}>
              <Text style={styles.modalBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    padding: 24,
    borderRadius: 16,
    width: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2, borderColor: "#D1D5DB"
  },
  modalBtnText: { color: "#FFF", fontWeight: "700" },
  imageText: { color: "#000000", fontWeight: "400",  padding: 7, },
  imagePicker: {
  width: "100%",
  height: 120,
  borderWidth: 2,
  borderColor: "#9CA3AF",
  borderStyle: "dashed",
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 12,
  overflow: "hidden",
},
imagePlaceholder: {
  justifyContent: "center",
  alignItems: "center",
},
imagePlaceholderText: {
  color: "#6B7280",
  fontSize: 16,
},
imagePreview: {
  width: "100%",
  height: "100%",
  borderRadius: 12,
},
});