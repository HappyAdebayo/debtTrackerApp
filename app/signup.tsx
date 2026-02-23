import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { getUsers, saveUsers, setSession, User } from "@/lib/authStorage";
import { v4 as uuidv4 } from "uuid"; // 

const PRIMARY = "#2563EB";

export default function Signup() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    if (!businessName || !email || !password) {
      alert("All fields are required");
      return;
    }

    const users = await getUsers();

    const exists = users.find((u) => u.email === email);
    if (exists) {
      alert("User already exists");
      return;
    }

    // ✅ Generate a unique id for the new user
    const newUser: User = {
      id: uuidv4(),
      businessName,
      email,
      password,
    };

    await saveUsers([...users, newUser]);
    await setSession(newUser); // ✅ pass full user object

    router.replace("/tabs/home"); // ✅ navigate to your tabbed home
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Signup to get started</Text>

      <View style={styles.form}>
        <TextInput
          placeholder="Business Name"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={businessName}
          onChangeText={setBusinessName}
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 32,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: "#111827",
  },
  button: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});