import React from "react";
import { ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  User,
  Package,
  Heart,
  CreditCard,
  MapPin,
  Settings,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/src/theme";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();

  const menuItems = [
    { icon: Package, label: "Orders", route: "/orders" },
    { icon: Heart, label: "Wishlist", route: "/wishlist" },
    { icon: CreditCard, label: "Payment Methods", route: "/payments" },
    { icon: CreditCard, label: "My Transactions", route: "/transactions" },
    { icon: MapPin, label: "Addresses", route: "/addresses" },
    { icon: Settings, label: "Settings", route: "/settings" },
  ];

  if (user && user.role === "admin") {
    menuItems.unshift({ icon: ShieldAlert, label: "Admin Dashboard", route: "/admin/dashboard" as any });
  }

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  if (!user) {
    return (
      <ThemedView style={styles.container} colorType="background">
        <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
          <ThemedText type="title" style={styles.headerTitle}>Profile</ThemedText>
        </ThemedView>
        <ThemedView style={styles.emptyState} colorType="background">
          <User size={64} color={theme.colors.primary} />
          <ThemedText style={styles.emptyTitle} type="subtitle">
            Please login to view your profile
          </ThemedText>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/login")}
          >
            <ThemedText style={styles.loginButtonText} type="defaultSemiBold">LOGIN</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} colorType="background">
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <ThemedText type="title" style={styles.headerTitle}>Profile</ThemedText>
      </ThemedView>

      <ScrollView style={styles.content}>
        <ThemedView style={styles.userInfo} colorType="background">
          <ThemedView style={[styles.avatar, { backgroundColor: theme.colors.primary }]} colorType="background">
            <User size={40} color="#fff" />
          </ThemedView>
          <ThemedView style={styles.userDetails} colorType="background">
            <ThemedText type="title" style={styles.userName}>{user.name}</ThemedText>
            <ThemedText type="default" colorType="textMuted" style={styles.userEmail}>{user.email}</ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.menuSection} colorType="background">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                {
                  backgroundColor: theme.colors.card,
                  borderBottomColor: theme.colors.border,
                },
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <ThemedView style={styles.menuItemLeft} colorType="card">
                <item.icon size={22} color={theme.colors.text} />
                <ThemedText type="defaultSemiBold" style={styles.menuItemLabel}>
                  {item.label}
                </ThemedText>
              </ThemedView>
              <ChevronRight size={22} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ThemedView>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.card,
            },
          ]}
          onPress={handleLogout}
        >
          <LogOut size={22} color={theme.colors.primary} />
          <ThemedText type="defaultSemiBold" style={[styles.logoutText, { color: theme.colors.primary }]}>
            Logout
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 100,
  },
  emptyTitle: {
    marginTop: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  loginButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  userDetails: {
    marginLeft: 15,
  },
  userName: {
    fontSize: 20,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
  },
  menuSection: {
    marginTop: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemLabel: {
    fontSize: 15,
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginTop: 30,
    marginHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
  },
});
