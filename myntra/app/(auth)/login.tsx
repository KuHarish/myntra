import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import React from "react";
import { ShoppingBag, Sparkles } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [isloading, setisloading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passError, setPassError] = useState("");
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const handleLogin = async () => {
    let valid = true;
    setEmailError("");
    setPassError("");

    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email address");
      valid = false;
    }
    if (!password) {
      setPassError("Password is required");
      valid = false;
    }
    if (!valid) return;

    try {
      setisloading(true);
      await login(email, password);
      router.replace("/(tabs)");
    } catch (error) {
      setPassError("Invalid email or password. Please try again.");
    } finally {
      setisloading(false);
    }
  };

  /* ─────────────────────────────── Form ─────────────────────────────── */
  const renderFormPanel = () => (
    <View style={[styles.formPanel, isDesktop && styles.formPanelDesktop]}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <ShoppingBag size={28} color="#ff3f6c" />
        <Text style={styles.logoText}>MYNTRA</Text>
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to continue your fashion journey</Text>

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="you@example.com"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(""); }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
      </View>

      {/* Password — uses the shared two-input component (no freeze on web) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <PasswordInput
          value={password}
          onChangeText={(t) => { setPassword(t); setPassError(""); }}
          placeholder="Enter your password"
          hasError={!!passError}
        />
        {!!passError && <Text style={styles.errorText}>{passError}</Text>}
      </View>

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.button, isloading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isloading}
      >
        {isloading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>SIGN IN</Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Sign Up Link */}
      <TouchableOpacity style={styles.signupLink} onPress={() => router.push("/signup")}>
        <Text style={styles.signupText}>
          New to Myntra?{" "}
          <Text style={styles.signupTextBold}>Create an account</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  /* ─────────────────────────────── Desktop ─────────────────────────────── */
  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        {/* Left hero */}
        <View style={styles.heroPanel}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
            }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Sparkles size={14} color="#ff3f6c" />
              <Text style={styles.heroBadgeText}>Premium Fashion</Text>
            </View>
            <Text style={styles.heroTitle}>Style that{"\n"}speaks for you</Text>
            <Text style={styles.heroSubtitle}>
              Explore 5 lakh+ products across clothing,{"\n"}footwear, accessories and more.
            </Text>
            <View style={styles.heroStats}>
              {[["50L+", "Products"], ["10K+", "Brands"], ["4.5★", "Rating"]].map(([val, label]) => (
                <View key={label} style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{val}</Text>
                  <Text style={styles.heroStatLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

        </View>

        {/* Right form */}
        <ScrollView
          style={styles.formScrollDesktop}
          contentContainerStyle={styles.formScrollContentDesktop}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderFormPanel()}
        </ScrollView>
      </View>
    );
  }

  /* ─────────────────────────────── Mobile ─────────────────────────────── */
  return (
    <KeyboardAvoidingView
      style={styles.mobileRoot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.mobileScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mobileHero}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
            }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.mobileLogoRow}>
            <ShoppingBag size={22} color="#fff" />
            <Text style={styles.mobileLogoText}>MYNTRA</Text>
          </View>
        </View>

        <View style={styles.mobileCard}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue shopping</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="you@example.com"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(""); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <PasswordInput
              value={password}
              onChangeText={(t) => { setPassword(t); setPassError(""); }}
              placeholder="Enter your password"
              hasError={!!passError}
            />
            {!!passError && <Text style={styles.errorText}>{passError}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.button, isloading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isloading}
          >
            {isloading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SIGN IN</Text>}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.signupLink} onPress={() => router.push("/signup")}>
            <Text style={styles.signupText}>
              New to Myntra?{" "}
              <Text style={styles.signupTextBold}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────── Styles ─────────────────────────────── */
const styles = StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: "row", backgroundColor: "#fff" },
  heroPanel: { flex: 1, position: "relative", justifyContent: "flex-end" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  heroContent: { padding: 48, paddingBottom: 56 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,63,108,0.15)", borderWidth: 1,
    borderColor: "rgba(255,63,108,0.4)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: "flex-start", marginBottom: 20,
  },
  heroBadgeText: { color: "#ff8fab", fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  heroTitle: { fontSize: 44, fontWeight: "800", color: "#fff", lineHeight: 52, marginBottom: 16, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 24, marginBottom: 36 },
  heroStats: { flexDirection: "row", gap: 32 },
  heroStat: { alignItems: "center" },
  heroStatVal: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroStatLabel: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  formScrollDesktop: { width: 480, backgroundColor: "#fff" },
  formScrollContentDesktop: { flexGrow: 1, justifyContent: "center", padding: 48 },
  formPanel: { width: "100%" },
  formPanelDesktop: {},
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 36 },
  logoText: { fontSize: 22, fontWeight: "900", color: "#ff3f6c", letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: "800", color: "#1a1a1a", marginBottom: 8, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 32, lineHeight: 22 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 8, letterSpacing: 0.2 },
  input: {
    backgroundColor: "#f7f7f8", padding: 14, borderRadius: 12,
    fontSize: 15, color: "#1a1a1a", borderWidth: 1.5, borderColor: "#ebebeb",
  },
  inputError: { borderColor: "#ff3f6c", backgroundColor: "#fff6f8" },
  errorText: { color: "#ff3f6c", fontSize: 12, marginTop: 5, marginLeft: 2 },
  button: {
    backgroundColor: "#ff3f6c", padding: 16, borderRadius: 12,
    alignItems: "center", marginTop: 4,
    shadowColor: "#ff3f6c", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 1.2 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ebebeb" },
  dividerText: { color: "#aaa", fontSize: 13 },
  signupLink: { alignItems: "center" },
  signupText: { color: "#666", fontSize: 14 },
  signupTextBold: { color: "#ff3f6c", fontWeight: "700" },
  mobileRoot: { flex: 1, backgroundColor: "#fff" },
  mobileScroll: { flexGrow: 1 },
  mobileHero: { height: 240, position: "relative", justifyContent: "flex-end" },
  mobileLogoRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 20 },
  mobileLogoText: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: 2 },
  mobileCard: {
    flex: 1, backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, padding: 28, paddingTop: 32,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
});
