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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { apiSignup } from "@/lib/api";

const PRIMARY = "#2563EB";

export default function Signup() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!businessName || !email || !password) {
      alert("All fields are required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiSignup(businessName, email, password);
      alert(response.message || "Registration successful! Please check your email for the verification code.");
      router.replace(`/verify-signup?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      console.error("Signup error:", error);
      alert(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
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

        <Pressable 
          style={[styles.button, isLoading && { opacity: 0.7 }]} 
          onPress={handleSignup}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{isLoading ? "Signing up..." : "Sign Up"}</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/login")}>
                  <Text style={styles.link}>
                    Already have an account? <Text style={styles.linkBold}>Login</Text>
                  </Text>
          </Pressable>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
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
  }
});