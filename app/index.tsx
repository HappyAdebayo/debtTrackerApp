import { StatusBar, StyleSheet, Text, View } from "react-native";
import { Redirect} from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect,useState } from "react";
import { getSession } from "@/lib/authStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIMARY = "#2563EB"; 

export default function Index() {
   const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [seenOnboarding, setSeenOnboarding] = useState(false);

  useEffect(() => {

  const check = async () => {
     const s = await getSession();
      setSession(s);
      
      const seen = await AsyncStorage.getItem("@seen_onboarding");
      setSeenOnboarding(seen === "true");

    setTimeout(() => {
        setLoading(false);
      }, 1500);
  };

  check();
}, []);


 if (!loading) {
    if (session) {
      return <Redirect href="/tabs/home" />;
    } else if (seenOnboarding) {
      return <Redirect href="/login" />;
    } else {
      return <Redirect href="/onboarding" />;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
         <StatusBar backgroundColor={PRIMARY} barStyle="light-content" />
   
         <View style={styles.logo}>
           <Text style={styles.logoText}>DT</Text>
         </View>
   
         <Text style={styles.title}>Debt Tracker</Text>
         <Text style={styles.subtitle}>Manage debts with clarity</Text>
   
         <View style={styles.chipsRow}>
           <View style={styles.chip}><Text style={styles.chipText}>Secure</Text></View>
           <View style={styles.chip}><Text style={styles.chipText}>Fast</Text></View>
           <View style={styles.chip}><Text style={styles.chipText}>Simple</Text></View>
         </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
    marginBottom: 18,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 6,
  },
  chipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});