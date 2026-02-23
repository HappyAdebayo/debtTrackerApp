import React, { useState, useEffect } from "react";
import { View, Text, Modal, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, } from "react-native";

type AddDebtModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, amount?: number) => void;
  cName?: string; 
};

export default function AddDebtModal({ visible, onClose, onAdd, cName }: AddDebtModalProps) {
  const [customerName, setCustomerName] = useState(cName||"");
  
  const handleAdd = () => {
    if (!customerName.trim()) return; 
    onAdd(customerName.trim());
    setCustomerName("");  
  };

   useEffect(() => {
    setCustomerName(cName || "");
  }, [cName]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add New Debt</Text>

          <TextInput
            placeholder="Person Name"
            value={customerName}
            onChangeText={setCustomerName}
            style={styles.input}
          />


          <Pressable style={styles.modalButton} onPress={handleAdd}>
            <Text style={styles.modalButtonText}>Add</Text>
          </Pressable>

          <Pressable
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
    color: "#111827",
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 15,
  },
  modalButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#111827",
  },
});