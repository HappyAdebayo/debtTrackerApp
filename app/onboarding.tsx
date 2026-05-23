import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  StatusBar,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PRIMARY = "#2563EB";
const PRIMARY_LIGHT = "rgba(37, 99, 235, 0.08)";
const SUCCESS = "#10B981";
const DANGER = "#EF4444";
const WARNING = "#F59E0B";

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  type: "track" | "speed" | "backup";
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    title: "Track Debts Easily",
    subtitle: "Track who owes you, payment history, and balances in one place.",
    type: "track",
  },
  {
    id: "2",
    title: "Lightning-Fast Speed",
    subtitle: "Access and search all your customer records instantly with zero delay.",
    type: "speed",
  },
  {
    id: "3",
    title: "Backup & Restore",
    subtitle: "Backup your records securely and restore them anytime on another device.",
    type: "backup",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const handleNext = async () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem("@seen_onboarding", "true");
      router.replace("/login");
    } catch (error) {
      console.error("Failed to save onboarding state:", error);
      router.replace("/login");
    }
  };

  // Renders the visual mockup based on slide type
  const renderVisual = (type: "track" | "speed" | "backup") => {
    switch (type) {
      case "track":
        return (
          <View style={styles.visualContainer}>
            {/* Outstandings Card */}
            <View style={styles.trackCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Outstanding Balance</Text>
                <View style={styles.trendBadge}>
                  <Ionicons name="trending-up" size={14} color={SUCCESS} />
                  <Text style={styles.trendText}>+18%</Text>
                </View>
              </View>
              <Text style={styles.balanceAmount}>₦165,000</Text>
              <Text style={styles.cardSubtitle}>Across 2 active debtors</Text>
            </View>

            {/* Customer Records */}
            <View style={styles.miniList}>
              <View style={styles.listItem}>
                <View style={[styles.avatarContainer, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                  <Text style={[styles.avatarText, { color: WARNING }]}>S</Text>
                </View>
                <View style={styles.listTextContainer}>
                  <Text style={styles.listName}>Sandra</Text>
                  <Text style={styles.listStatus}>Last activity: 2 days ago</Text>
                </View>
                <Text style={[styles.listAmount, { color: DANGER }]}>₦120,000</Text>
              </View>

              <View style={styles.listItem}>
                <View style={[styles.avatarContainer, { backgroundColor: PRIMARY_LIGHT }]}>
                  <Text style={[styles.avatarText, { color: PRIMARY }]}>D</Text>
                </View>
                <View style={styles.listTextContainer}>
                  <Text style={styles.listName}>David</Text>
                  <Text style={styles.listStatus}>Last activity: 1 day ago</Text>
                </View>
                <Text style={[styles.listAmount, { color: DANGER }]}>₦45,000</Text>
              </View>
            </View>

            {/* Payment Logs */}
            <View style={styles.logPillRow}>
              <View style={styles.logPill}>
                <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                <Text style={[styles.logText, { color: SUCCESS }]}>₦15,000 Received</Text>
              </View>
              <View style={[styles.logPill, { borderColor: "rgba(0,0,0,0.06)" }]}>
                <Ionicons name="add-circle" size={14} color={PRIMARY} />
                <Text style={[styles.logText, { color: PRIMARY }]}>Added Invoice</Text>
              </View>
            </View>
          </View>
        );

      case "speed":
        return (
          <View style={styles.visualContainer}>
            {/* Phone Outer Frame */}
            <View style={styles.phoneFrame}>
              {/* Phone Speaker Notch */}
              <View style={styles.phoneNotch} />

              {/* Status Banner */}
              <View style={styles.speedStatusBanner}>
                <Ionicons name="flash-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.speedStatusText}>Lightning Fast</Text>
                <View style={styles.speedDot} />
              </View>

              {/* Mock App Content */}
              <View style={styles.phoneContent}>
                <View style={styles.speedCard}>
                  <View style={styles.speedHeader}>
                    <Ionicons name="speedometer-outline" size={20} color={PRIMARY} />
                    <Text style={styles.speedTitle}>Zero Delay Engine</Text>
                  </View>
                  <View style={styles.speedGaugeContainer}>
                    <View style={styles.speedGaugeTrack}>
                      <View style={styles.speedGaugeFill} />
                    </View>
                    <Text style={styles.speedPercentage}>0.01s</Text>
                  </View>
                  <Text style={styles.speedDescription}>
                    Ultra-fast database means instant loading and seamless search.
                  </Text>
                </View>

                {/* Instant Search Status */}
                <View style={styles.searchMockCard}>
                  <View style={styles.searchBarMock}>
                    <Ionicons name="search-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.searchMockPlaceholder}>Sandra</Text>
                  </View>
                  <View style={styles.searchResultMock}>
                    <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                    <Text style={styles.searchResultText}>Found Instantly</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        );

      case "backup":
        return (
          <View style={styles.visualContainer}>
            {/* Cloud Backup Graphic */}
            <View style={styles.cloudCard}>
              <View style={styles.cloudIconRow}>
                <Ionicons name="phone-portrait-outline" size={32} color={PRIMARY} />
                <View style={styles.transferLine}>
                  <View style={[styles.arrowPill, { backgroundColor: SUCCESS }]}>
                    <Ionicons name="arrow-forward-sharp" size={10} color="#FFFFFF" />
                  </View>
                  <View style={styles.dashedLine} />
                </View>
                <Ionicons name="cloud-upload-outline" size={42} color={PRIMARY} />
              </View>

              <Text style={styles.cloudTitle}>Cloud Synchronization</Text>
              <Text style={styles.cloudSubtitle}>Highly secure AES-256 encryption</Text>
            </View>

            {/* Success Card */}
            <View style={styles.backupSuccessCard}>
              <View style={styles.successCheckContainer}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>Last Backup Saved</Text>
                <Text style={styles.successTime}>Today at 10:42 AM</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            {/* Restore Card */}
            <View style={styles.restoreCard}>
              <Ionicons name="sync-circle-outline" size={20} color={PRIMARY} />
              <Text style={styles.restoreText}>Restore 42 records instantly</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FDFDFD" barStyle="dark-content" />

      {/* Top Header Row with Skip Button */}
      <View style={styles.header}>
        {activeIndex < SLIDES.length - 1 ? (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      {/* Slide Pager */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Premium Visual Graphics Mockups */}
            <View style={styles.visualWrapper}>{renderVisual(item.type)}</View>

            {/* Bottom Content Card */}
            <View style={styles.textWrapper}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      {/* Footer controls: pagination & button */}
      <View style={styles.footer}>
        {/* Navigation Dot Indicators */}
        <View style={styles.paginationRow}>
          {SLIDES.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isActive ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            );
          })}
        </View>

        {/* Dynamic Action Button */}
        <Pressable style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>
            {activeIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Ionicons
            name={activeIndex === SLIDES.length - 1 ? "arrow-forward" : "chevron-forward"}
            size={16}
            color="#FFFFFF"
            style={{ marginLeft: 6 }}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFDFD",
  },
  header: {
    height: 48,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 24,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  skipText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  skipPlaceholder: {
    height: 30,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  visualWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  visualContainer: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  textWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: "center",
    gap: 20,
  },
  paginationRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 22,
    backgroundColor: PRIMARY,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: "#E5E7EB",
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    width: "100%",
    maxWidth: 320,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Visual mockups - Slide 1 (Track) */
  trackCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  trendText: {
    color: SUCCESS,
    fontSize: 11,
    fontWeight: "700",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  miniList: {
    width: "100%",
    gap: 8,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 13,
  },
  listTextContainer: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  listStatus: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },
  listAmount: {
    fontWeight: "700",
    fontSize: 14,
  },
  logPillRow: {
    flexDirection: "row",
    gap: 6,
    width: "100%",
    justifyContent: "center",
  },
  logPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.12)",
    gap: 4,
  },
  logText: {
    fontSize: 11,
    fontWeight: "600",
  },

  /* Visual mockups - Slide 2 (Offline) */
  phoneFrame: {
    width: 210,
    height: 320,
    backgroundColor: "#FFFFFF",
    borderWidth: 6,
    borderColor: "#1F2937",
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  phoneNotch: {
    width: 70,
    height: 14,
    backgroundColor: "#1F2937",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  speedStatusBanner: {
    width: "100%",
    backgroundColor: PRIMARY,
    paddingTop: 18,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  speedStatusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  speedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginLeft: 6,
  },
  phoneContent: {
    flex: 1,
    width: "100%",
    padding: 12,
    gap: 10,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  speedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  speedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  speedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  speedGaugeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  speedGaugeTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    marginRight: 10,
    overflow: "hidden",
  },
  speedGaugeFill: {
    width: "95%",
    height: "100%",
    backgroundColor: SUCCESS,
    borderRadius: 3,
  },
  speedPercentage: {
    fontSize: 12,
    fontWeight: "800",
    color: SUCCESS,
  },
  speedDescription: {
    fontSize: 10,
    color: "#6B7280",
    lineHeight: 14,
  },
  searchMockCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchBarMock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  searchMockPlaceholder: {
    fontSize: 10,
    color: "#1F2937",
    fontWeight: "600",
  },
  searchResultMock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  searchResultText: {
    fontSize: 9,
    fontWeight: "700",
    color: SUCCESS,
  },

  /* Visual mockups - Slide 3 (Backup) */
  cloudCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
  },
  cloudIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    marginBottom: 14,
  },
  transferLine: {
    width: 60,
    height: 12,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  arrowPill: {
    position: "absolute",
    zIndex: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  dashedLine: {
    width: "100%",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 1,
  },
  cloudTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 2,
  },
  cloudSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  backupSuccessCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.15)",
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  successCheckContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: SUCCESS,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  successTime: {
    fontSize: 10,
    color: "#047857",
    marginTop: 1,
  },
  verifiedBadge: {
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedText: {
    color: SUCCESS,
    fontSize: 9,
    fontWeight: "700",
  },
  restoreCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  restoreText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
});
