import { useState, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { getUsers, saveUsers, setSession } from "@/lib/authStorage";

const PRIMARY = "#2563EB";

export default function VerifySignup() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0) return;

    const users = await getUsers();
    const userIndex = users.findIndex((u) => u.email === email);

    if (userIndex === -1) {
      alert("User not found");
      return;
    }

    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    users[userIndex].verificationCode = newCode;
    await saveUsers(users);

    alert(`Simulation: A new verification code has been sent: ${newCode}`);
    setCountdown(120); // Start 2-minute countdown (120 seconds)
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleVerify = async () => {
    if (!code || code.length !== 4) {
      alert("Please enter a valid 4-digit code");
      return;
    }

    const users = await getUsers();
    const userIndex = users.findIndex((u) => u.email === email);

    if (userIndex === -1) {
      alert("User not found");
      return;
    }

    const user = users[userIndex];

    if (user.verificationCode !== code) {
      alert("Invalid verification code");
      return;
    }

    // Code is correct, update user
    const updatedUser = { ...user, isVerified: true };
    users[userIndex] = updatedUser;

    await saveUsers(users);
    await setSession(updatedUser);

    router.replace("/login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      <Text style={styles.title}>Verify Email</Text>
      <Text style={styles.subtitle}>
        We&apos;ve sent a 4-digit code to {email || "your email"}.
      </Text>

      <View style={styles.form}>
        <TextInput
          placeholder="4-digit code"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={4}
        />

        <Pressable style={styles.button} onPress={handleVerify}>
          <Text style={styles.buttonText}>Verify & Continue</Text>
        </Pressable>

        <Pressable
          style={[styles.resendButton, countdown > 0 && styles.resendButtonDisabled]}
          onPress={handleResend}
          disabled={countdown > 0}
        >
          <Text style={[styles.resendButtonText, countdown > 0 && styles.resendButtonTextDisabled]}>
            {countdown > 0 ? `Resend code in ${formatTime(countdown)}` : "Resend Code"}
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
    textAlign: "center",
    letterSpacing: 4,
    fontWeight: "600",
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
  resendButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 14,
  },
  resendButtonTextDisabled: {
    color: "#6B7280",
  },
});
