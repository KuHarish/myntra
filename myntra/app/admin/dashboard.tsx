import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, View } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { ArrowLeft, Package, Sparkles, AlertOctagon, FolderKanban, Plus, ChevronRight } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/src/theme";
import { API_BASE_URL } from "@/constants/Api";
import axios from "axios";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { theme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    discontinuedProducts: 0,
    categoriesCount: 0,
  });

  const fetchStats = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      // Fetch all products (admin endpoint)
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      const prodRes = await axios.get(`${API_BASE_URL}/admin/products`, config);
      const catRes = await axios.get(`${API_BASE_URL}/category`);

      const products = prodRes.data || [];
      const total = products.length;
      const active = products.filter((p: any) => p.status === "active").length;
      const discontinued = products.filter((p: any) => p.status === "discontinued").length;
      const categories = catRes.data || [];

      setStats({
        totalProducts: total,
        activeProducts: active,
        discontinuedProducts: discontinued,
        categoriesCount: categories.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (isAuthLoading) {
    return (
      <ThemedView style={styles.loaderContainer} colorType="background">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ThemedView>
    );
  }

  // Route protection
  if (!user || user.role !== "admin") {
    return <Redirect href="/" />;
  }

  return (
    <ThemedView style={styles.container} colorType="background">
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>Admin Dashboard</ThemedText>
      </ThemedView>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.welcomeText}>Welcome, Admin</ThemedText>
          <ThemedText type="default" colorType="textMuted" style={styles.subtitleText}>
            Overview of catalog & inventory systems
          </ThemedText>

          {/* Stats Grid */}
          <View style={styles.grid}>
            <ThemedView style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} colorType="card">
              <Package size={28} color={theme.colors.primary} />
              <ThemedText type="title" style={styles.cardValue}>{stats.totalProducts}</ThemedText>
              <ThemedText type="defaultSemiBold" colorType="textMuted" style={styles.cardLabel}>Total Products</ThemedText>
            </ThemedView>

            <ThemedView style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} colorType="card">
              <Sparkles size={28} color="#2ecc71" />
              <ThemedText type="title" style={styles.cardValue}>{stats.activeProducts}</ThemedText>
              <ThemedText type="defaultSemiBold" colorType="textMuted" style={styles.cardLabel}>Active</ThemedText>
            </ThemedView>

            <ThemedView style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} colorType="card">
              <AlertOctagon size={28} color="#e74c3c" />
              <ThemedText type="title" style={styles.cardValue}>{stats.discontinuedProducts}</ThemedText>
              <ThemedText type="defaultSemiBold" colorType="textMuted" style={styles.cardLabel}>Discontinued</ThemedText>
            </ThemedView>

            <ThemedView style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} colorType="card">
              <FolderKanban size={28} color="#f39c12" />
              <ThemedText type="title" style={styles.cardValue}>{stats.categoriesCount}</ThemedText>
              <ThemedText type="defaultSemiBold" colorType="textMuted" style={styles.cardLabel}>Categories</ThemedText>
            </ThemedView>
          </View>

          {/* Quick Actions */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>Quick Actions</ThemedText>

          <TouchableOpacity
            style={[styles.actionRow, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
            onPress={() => router.push("/admin/products")}
          >
            <View style={styles.actionLeft}>
              <Package size={22} color={theme.colors.text} />
              <ThemedText type="defaultSemiBold" style={styles.actionLabel}>Manage Products</ThemedText>
            </View>
            <ChevronRight size={22} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
            onPress={() => router.push("/admin/add-product")}
          >
            <View style={styles.actionLeft}>
              <Plus size={22} color={theme.colors.text} />
              <ThemedText type="defaultSemiBold" style={styles.actionLabel}>Add New Product</ThemedText>
            </View>
            <ChevronRight size={22} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  card: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardValue: {
    fontSize: 26,
    marginVertical: 8,
    fontWeight: 'bold',
  },
  cardLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionLabel: {
    fontSize: 15,
  },
});
