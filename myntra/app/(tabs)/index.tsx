import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, ChevronRight, Bell, ArrowLeft, X } from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import axios from "axios";
import { useTheme } from "@/src/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { API_BASE_URL } from "@/constants/Api";
import { useFocusEffect } from "@react-navigation/native";
import { useResponsive } from "@/src/hooks/useResponsive";
import ResponsiveContainer from "@/src/components/responsive/ResponsiveContainer";
import ResponsiveGrid from "@/src/components/responsive/ResponsiveGrid";
import { resolveImageUri } from "@/utils/image";

const deals = [
  {
    id: 1,
    title: "Under ₹599",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "40-70% Off",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop",
  },
];

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [product, setproduct] = useState<any[]>([]);
  const [categories, setcategories] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const { scaleFont, spacing, isTablet } = useResponsive();

  // Search State
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleProductPress = (productId: string) => {
    if (!user) {
      router.push("/login");
    } else {
      router.push(`/product/${productId}`);
    }
  };

  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setSearchQuery("");
  };

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/notifications/${user._id}`);
      const unread = res.data.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      // Silently fail
    }
  }, [user]);

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
        const prod = await axios.get(`${API_BASE_URL}/product`);
        setcategories(cat.data || []);
        setproduct(prod.data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchproduct();
  }, []);

  const filteredProducts = product.filter((p: any) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.brand && p.brand.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  });

  return (
    <ResponsiveContainer>
      {/* Header */}
      {isSearchActive ? (
        <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border, padding: spacing.md }]} colorType="background">
          <TouchableOpacity onPress={handleCloseSearch} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={[styles.searchBarContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Search size={18} color={theme.colors.textMuted} style={styles.searchIconInside} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search for brands, products..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                <X size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </ThemedView>
      ) : (
        <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border, padding: spacing.md }]} colorType="background">
          <ThemedText type="title" style={[styles.logo, { color: theme.colors.primary, fontSize: scaleFont(24) }]}>
            MYNTRA
          </ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.searchButton} onPress={() => setIsSearchActive(true)}>
              <Search size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => router.push("/notifications" as any)}
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
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {searchQuery.trim() !== "" ? (
          /* Search Results Layout */
          <ThemedView style={[styles.section, { padding: spacing.md }]} colorType="background">
            <ThemedText type="subtitle" style={[styles.searchResultsTitle, { fontSize: scaleFont(15) }]}>
              Search Results ({filteredProducts.length})
            </ThemedText>

            {filteredProducts.length === 0 ? (
              <ThemedView style={styles.emptyStateContainer} colorType="background">
                <Search size={48} color={theme.colors.textMuted} style={styles.emptyStateIcon} />
                <ThemedText type="subtitle" style={styles.emptyStateTitle}>
                  No Products Found
                </ThemedText>
                <ThemedText colorType="textMuted" style={styles.emptyStateDescription}>
                  Try searching with a different keyword.
                </ThemedText>
              </ThemedView>
            ) : (
              <ResponsiveGrid
                data={filteredProducts}
                paddingHorizontal={spacing.md}
                gap={spacing.md}
                renderItem={(p: any) => (
                  <TouchableOpacity
                    key={p._id}
                    style={[styles.productCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.text }]}
                    onPress={() => handleProductPress(p._id)}
                  >
                    <Image
                      source={{
                        uri: resolveImageUri(p.images?.[0])
                      }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    <ThemedView style={styles.productInfo} colorType="card">
                      <ThemedText type="default" colorType="textMuted" style={[styles.brandName, { fontSize: scaleFont(11) }]}>
                        {p.brand}
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" numberOfLines={1} style={[styles.productName, { fontSize: scaleFont(13) }]}>
                        {p.name}
                      </ThemedText>
                      <View style={styles.priceRow}>
                        <ThemedText type="defaultSemiBold" style={[styles.productPrice, { fontSize: scaleFont(14) }]}>
                          ₹{p.price}
                        </ThemedText>
                        <ThemedText type="defaultSemiBold" style={{ color: theme.colors.primary, fontSize: scaleFont(13) }}>
                          {p.discount}
                        </ThemedText>
                      </View>
                    </ThemedView>
                  </TouchableOpacity>
                )}
              />
            )}
          </ThemedView>
        ) : (
          /* Default Feed Layout */
          <>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&auto=format&fit=crop",
              }}
              style={[styles.banner, { height: isTablet ? 320 : 200 }]}
              resizeMode="cover"
            />

            {/* Categories Section */}
            <ThemedView style={[styles.section, { padding: spacing.md }]} colorType="background">
              <ThemedView style={styles.sectionHeader} colorType="background">
                <ThemedText type="subtitle" style={[styles.sectionTitle, { fontSize: scaleFont(16) }]}>
                  SHOP BY CATEGORY
                </ThemedText>
                <TouchableOpacity style={styles.viewAll} onPress={() => router.push("/categories")}>
                  <ThemedText style={{ color: theme.colors.primary, marginRight: 5, fontSize: scaleFont(14) }} type="defaultSemiBold">
                    View All
                  </ThemedText>
                  <ChevronRight size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </ThemedView>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScroll}
              >
                {isLoading ? (
                  <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
                ) : categories.length === 0 ? (
                  <ThemedText colorType="textMuted" style={styles.emptyText}>No categories available</ThemedText>
                ) : (
                  categories.map((category: any) => (
                    <TouchableOpacity
                      key={category._id}
                      style={styles.categoryCard}
                      onPress={() => router.push({ pathname: "/categories", params: { categoryId: category._id } })}
                    >
                      <Image source={{ uri: category.image }} style={styles.categoryImage} />
                      <ThemedText style={[styles.categoryName, { fontSize: scaleFont(13) }]} type="defaultSemiBold">
                        {category.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </ThemedView>

            {/* Deals Section */}
            <ThemedView style={[styles.section, { padding: spacing.md }]} colorType="background">
              <ThemedView style={styles.sectionHeader} colorType="background">
                <ThemedText type="subtitle" style={[styles.sectionTitle, { fontSize: scaleFont(16) }]}>
                  DEALS OF THE DAY
                </ThemedText>
              </ThemedView>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dealsScroll}
              >
                {deals.map((deal) => (
                  <TouchableOpacity key={deal.id} style={styles.dealCard}>
                    <Image source={{ uri: deal.image }} style={styles.dealImage} resizeMode="cover" />
                    <View style={styles.dealOverlay}>
                      <Text style={[styles.dealTitle, { fontSize: scaleFont(16) }]}>{deal.title}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ThemedView>

            {/* Recently Viewed */}
            <RecentlyViewedSection />

            {/* Trending Section */}
            <ThemedView style={[styles.section, { padding: spacing.md }]} colorType="background">
              <ThemedView style={styles.sectionHeader} colorType="background">
                <ThemedText type="subtitle" style={[styles.sectionTitle, { fontSize: scaleFont(16) }]}>
                  TRENDING NOW
                </ThemedText>
              </ThemedView>
              
              {isLoading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
              ) : product.length === 0 ? (
                <ThemedText colorType="textMuted" style={styles.emptyText}>No Product available</ThemedText>
              ) : (
                <ResponsiveGrid
                  data={product}
                  paddingHorizontal={spacing.md}
                  gap={spacing.md}
                  renderItem={(p: any) => (
                    <TouchableOpacity
                      key={p._id}
                      style={[styles.productCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.text }]}
                      onPress={() => handleProductPress(p._id)}
                    >
                      <Image
                        source={{
                          uri: resolveImageUri(p.images?.[0])
                        }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                      <ThemedView style={styles.productInfo} colorType="card">
                        <ThemedText type="default" colorType="textMuted" style={[styles.brandName, { fontSize: scaleFont(11) }]}>
                          {p.brand}
                        </ThemedText>
                        <ThemedText type="defaultSemiBold" numberOfLines={1} style={[styles.productName, { fontSize: scaleFont(13) }]}>
                          {p.name}
                        </ThemedText>
                        <View style={styles.priceRow}>
                          <ThemedText type="defaultSemiBold" style={[styles.productPrice, { fontSize: scaleFont(14) }]}>
                            ₹{p.price}
                          </ThemedText>
                          <ThemedText type="defaultSemiBold" style={{ color: theme.colors.primary, fontSize: scaleFont(13) }}>
                            {p.discount}
                          </ThemedText>
                        </View>
                      </ThemedView>
                    </TouchableOpacity>
                  )}
                />
              )}
            </ThemedView>
          </>
        )}
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  },
  section: {
    paddingVertical: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontWeight: "bold",
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
    fontWeight: "bold",
  },
  productCard: {
    width: "100%",
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
    aspectRatio: 1,
  },
  productInfo: {
    padding: 10,
  },
  brandName: {
    marginBottom: 2,
  },
  productName: {
    marginBottom: 5,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontWeight: "bold",
  },
  loader: {
    marginTop: 50,
    width: '100%',
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchIconInside: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  searchResultsTitle: {
    fontWeight: "bold",
    marginBottom: 15,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    width: "100%",
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
