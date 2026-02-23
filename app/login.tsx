import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, StatusBar, KeyboardAvoidingView, Platform, } from "react-native";
import { useRouter } from "expo-router";
import { setSession,getUsers } from "@/lib/authStorage";

const PRIMARY = "#2563EB";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const users = await getUsers();

    const user = users.find(
      u => u.email === email && u.password === password
    );

    if (!user) {
      alert("Invalid credentials");
      return;
    }

    await setSession(user);
    router.replace("/tabs/home");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

      <View style={styles.form}>
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

        <Pressable style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/signup")}>
          <Text style={styles.link}>
            Don’t have an account? <Text style={styles.linkBold}>Sign up</Text>
          </Text>
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
  link: {
    textAlign: "center",
    marginTop: 18,
    color: "#6B7280",
  },
  linkBold: {
    color: PRIMARY,
    fontWeight: "700",
  },
});