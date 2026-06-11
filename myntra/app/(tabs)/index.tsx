import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, ChevronRight, Bell } from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import axios from "axios";
import { useTheme } from "@/src/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { API_BASE_URL } from "@/constants/Api";
import { useFocusEffect } from "@react-navigation/native";

const deals = [
  {
    id: 1,
    title: "Under ₹599",
    image:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "40-70% Off",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop",
  },
];

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [product, setproduct] = useState<any>(null);
  const [categories, setcategories] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { theme } = useTheme();

  const handleProductPress = (productId: number) => {
    if (!user) {
      router.push("/login");
    } else {
      router.push(`/product/${productId}`);
    }
  };

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await axios.get(
        `${API_BASE_URL}/notifications/${user._id}`
      );
      const unread = res.data.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      // Silently fail — badge is non-critical
    }
  }, [user]);

  // Re-fetch unread count every time the tab gains focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  useEffect(() => {
    const fetchproduct = async () => {
      try {
        setIsLoading(true);
        const cat = await axios.get(`${API_BASE_URL}/category`);
        const product = await axios.get(`${API_BASE_URL}/product`);
        setcategories(cat.data);
        setproduct(product.data);
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchproduct();
  }, []);

  return (
    <ThemedView style={styles.container} colorType="background">
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <ThemedText type="title" style={[styles.logo, { color: theme.colors.primary }]}>MYNTRA</ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.searchButton}>
            <Search size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => router.push("/notifications")}
          >
            <Bell size={24} color={theme.colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format&fit=crop",
          }}
          style={styles.banner}
        />

        {/* Categories Section */}
        <ThemedView style={styles.section} colorType="background">
          <ThemedView style={styles.sectionHeader} colorType="background">
            <ThemedText type="subtitle" style={styles.sectionTitle}>SHOP BY CATEGORY</ThemedText>
            <TouchableOpacity style={styles.viewAll}>
              <ThemedText style={{ color: theme.colors.primary, marginRight: 5 }} type="defaultSemiBold">View All</ThemedText>
              <ChevronRight size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </ThemedView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={theme.colors.primary}
                style={styles.loader}
              />
            ) : !categories || categories.length === 0 ? (
              <ThemedText colorType="textMuted" style={styles.emptyText}>No categories available</ThemedText>
            ) : (
              categories.map((category: any) => (
                <TouchableOpacity key={category._id} style={styles.categoryCard}>
                  <Image
                    source={{ uri: category.image }}
                    style={styles.categoryImage}
                  />
                  <ThemedText style={styles.categoryName} type="defaultSemiBold">{category.name}</ThemedText>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </ThemedView>

        {/* Deals Section */}
        <ThemedView style={styles.section} colorType="background">
          <ThemedView style={styles.sectionHeader} colorType="background">
            <ThemedText type="subtitle" style={styles.sectionTitle}>DEALS OF THE DAY</ThemedText>
          </ThemedView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dealsScroll}
          >
            {deals.map((deal) => (
              <TouchableOpacity key={deal.id} style={styles.dealCard}>
                <Image source={{ uri: deal.image }} style={styles.dealImage} />
                <View style={styles.dealOverlay}>
                  <Text style={styles.dealTitle}>{deal.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>

        {/* Recently Viewed */}
        <RecentlyViewedSection />

        {/* Trending Section */}
        <ThemedView style={styles.section} colorType="background">
          <ThemedView style={styles.sectionHeader} colorType="background">
            <ThemedText type="subtitle" style={styles.sectionTitle}>TRENDING NOW</ThemedText>
          </ThemedView>
          <View style={styles.productsGrid}>
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={theme.colors.primary}
                style={styles.loader}
              />
            ) : !product || product.length === 0 ? (
              <ThemedText colorType="textMuted" style={styles.emptyText}>No Product available</ThemedText>
            ) : (
              <View style={styles.productsGrid}>
                {product.map((p: any) => (
                  <TouchableOpacity
                    key={p._id}
                    style={[styles.productCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.text }]}
                    onPress={() => handleProductPress(p._id)}
                  >
                    <Image
                      source={{ uri: p.images[0] }}
                      style={styles.productImage}
                    />
                    <ThemedView style={styles.productInfo} colorType="card">
                      <ThemedText type="default" colorType="textMuted" style={styles.brandName}>{p.brand}</ThemedText>
                      <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.productName}>{p.name}</ThemedText>
                      <View style={styles.priceRow}>
                        <ThemedText type="defaultSemiBold" style={styles.productPrice}>{p.price}</ThemedText>
                        <ThemedText type="defaultSemiBold" style={{ color: theme.colors.primary, fontSize: 13 }}>{p.discount}</ThemedText>
                      </View>
                    </ThemedView>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    width: '100%',
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  searchButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bellButton: {
    padding: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  banner: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  section: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoriesScroll: {
    marginHorizontal: -15,
  },
  categoryCard: {
    width: 100,
    marginHorizontal: 8,
  },
  categoryImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  categoryName: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
  },
  dealsScroll: {
    marginHorizontal: -15,
  },
  dealCard: {
    width: 280,
    height: 150,
    marginHorizontal: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  dealImage: {
    width: "100%",
    height: "100%",
  },
  dealOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 15,
  },
  dealTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    width: "48%",
    marginBottom: 15,
    borderRadius: 10,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  productInfo: {
    padding: 10,
  },
  brandName: {
    fontSize: 11,
    marginBottom: 2,
  },
  productName: {
    fontSize: 13,
    marginBottom: 5,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontSize: 14,
  },
  loader: {
    marginTop: 50,
    width: '100%',
  },
});
