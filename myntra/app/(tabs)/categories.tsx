import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Image,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, X, SlidersHorizontal } from "lucide-react-native";
import axios from "axios";
import { useTheme } from "@/src/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { API_BASE_URL } from "@/constants/Api";
import { useResponsive } from "@/src/hooks/useResponsive";
import ResponsiveContainer from "@/src/components/responsive/ResponsiveContainer";
import ResponsiveGrid from "@/src/components/responsive/ResponsiveGrid";

export default function TabTwoScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const { theme } = useTheme();
  const { scaleFont, spacing } = useResponsive();

  /* ─── Fetch categories + ALL products on mount ─── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [catRes, prodRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/category`),
          axios.get(`${API_BASE_URL}/product`),
        ]);
        setCategories(catRes.data || []);
        setAllProducts(prodRes.data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ─── Handlers ─── */
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setSearchQuery("");
  };

  /* ─── Derived data ─── */

  // Filtered category list for search on landing page
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (cat: any) =>
        cat.name.toLowerCase().includes(q) ||
        cat.subcategory?.some((s: string) => s.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // Selected category object
  const selectedCategoryData = useMemo(
    () => (selectedCategory ? categories.find((c: any) => c._id === selectedCategory) : null),
    [categories, selectedCategory]
  );

  /**
   * Products that belong to the selected category.
   * Uses the Product.categories[] array (ObjectId refs) — the correct field
   * added with the recommendation engine.  Falls back to the old productId[]
   * field on the category doc so existing data also works.
   */
  const categoryProducts = useMemo(() => {
    if (!selectedCategoryData) return [];

    // Primary: filter allProducts whose categories array includes this category id
    const byCategories = allProducts.filter((p: any) =>
      Array.isArray(p.categories) && p.categories.includes(selectedCategoryData._id)
    );

    if (byCategories.length > 0) return byCategories;

    // Fallback: use legacy productId[] on the category document
    return selectedCategoryData.productId || [];
  }, [allProducts, selectedCategoryData]);

  // Search across products when user types in search bar
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return allProducts.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [allProducts, searchQuery]);

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <ResponsiveContainer>
        <ThemedView style={styles.loaderContainer} colorType="background">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </ThemedView>
      </ResponsiveContainer>
    );
  }

  /* ─── Shared product card renderer ─── */
  const renderProductCard = (product: any) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.text }]}
      onPress={() => router.push(`/product/${product._id}`)}
    >
      <Image
        source={{
          uri: product.images?.[0] ||
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop",
        }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <ThemedView style={styles.productInfo} colorType="card">
        <ThemedText type="default" colorType="textMuted" style={[styles.brandName, { fontSize: scaleFont(11) }]}>
          {product.brand}
        </ThemedText>
        <ThemedText type="defaultSemiBold" numberOfLines={2} style={[styles.productName, { fontSize: scaleFont(13) }]}>
          {product.name}
        </ThemedText>
        <View style={styles.priceRow}>
          <ThemedText type="defaultSemiBold" style={[styles.price, { fontSize: scaleFont(14) }]}>
            ₹{product.price}
          </ThemedText>
          {!!product.discount && (
            <ThemedText type="defaultSemiBold" style={{ color: theme.colors.primary, fontSize: scaleFont(12) }}>
              {product.discount}
            </ThemedText>
          )}
        </View>
      </ThemedView>
    </TouchableOpacity>
  );

  return (
    <ResponsiveContainer>
      {/* ─── Header ─── */}
      <ThemedView
        style={[styles.header, { borderBottomColor: theme.colors.border, padding: spacing.md }]}
        colorType="background"
      >
        <ThemedText type="title" style={[styles.headerTitle, { fontSize: scaleFont(22) }]}>
          Categories
        </ThemedText>
      </ThemedView>

      {/* ─── Search bar ─── */}
      <ThemedView
        style={[styles.searchContainer, { borderBottomColor: theme.colors.border, padding: spacing.md }]}
        colorType="background"
      >
        <ThemedView
          style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface }]}
          colorType="surface"
        >
          <Search size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text, fontSize: scaleFont(15) }]}
            placeholder="Search products, brands or categories"
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </ThemedView>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ══════════ SEARCH RESULTS VIEW ══════════ */}
        {searchQuery !== "" && (
          <ThemedView style={[styles.section, { padding: spacing.md }]} colorType="background">
            <ThemedText
              type="defaultSemiBold"
              style={[styles.sectionLabel, { color: theme.colors.textMuted, fontSize: scaleFont(13) }]}
            >
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </ThemedText>
            {searchResults.length === 0 ? (
              <ThemedView style={styles.emptyState} colorType="background">
                <ThemedText colorType="textMuted" style={{ textAlign: "center", fontSize: scaleFont(14) }}>
                  No products found for "{searchQuery}"
                </ThemedText>
              </ThemedView>
            ) : (
              <ResponsiveGrid
                data={searchResults}
                paddingHorizontal={0}
                gap={spacing.sm}
                phoneCols={2}
                tabletCols={3}
                largeTabletCols={4}
                renderItem={renderProductCard}
              />
            )}
          </ThemedView>
        )}

        {/* ══════════ CATEGORY LANDING VIEW ══════════ */}
        {!selectedCategory && searchQuery === "" && (
          <ThemedView style={[styles.section, { padding: spacing.md }]} colorType="background">
            <ResponsiveGrid
              data={filteredCategories}
              paddingHorizontal={0}
              gap={spacing.md}
              phoneCols={1}
              tabletCols={2}
              largeTabletCols={3}
              renderItem={(category: any) => (
                <TouchableOpacity
                  style={[styles.categoryCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.text }]}
                  onPress={() => handleCategorySelect(category._id)}
                >
                  <Image source={{ uri: category.image }} style={styles.categoryImage} resizeMode="cover" />
                  {/* Product count badge */}
                  <View style={[styles.countBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.countBadgeText}>
                      {allProducts.filter((p: any) =>
                        Array.isArray(p.categories) && p.categories.includes(category._id)
                      ).length} items
                    </Text>
                  </View>
                  <ThemedView style={styles.categoryInfo} colorType="card">
                    <ThemedText type="subtitle" style={[styles.categoryName, { fontSize: scaleFont(17) }]}>
                      {category.name}
                    </ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.subcategories}>
                        {category?.subcategory?.slice(0, 5).map((sub: string, idx: number) => (
                          <View
                            key={idx}
                            style={[styles.subcategoryTag, { backgroundColor: theme.colors.surface }]}
                          >
                            <ThemedText
                              type="default"
                              colorType="textMuted"
                              style={[styles.subcategoryText, { fontSize: scaleFont(12) }]}
                            >
                              {sub}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </ThemedView>
                </TouchableOpacity>
              )}
            />
          </ThemedView>
        )}

        {/* ══════════ CATEGORY DETAIL VIEW ══════════ */}
        {selectedCategoryData && searchQuery === "" && (
          <ThemedView style={[styles.section, { padding: spacing.md }]} colorType="background">
            {/* Back + title */}
            <View style={styles.categoryHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setSelectedCategory(null)}>
                <ThemedText style={{ color: theme.colors.primary, fontSize: scaleFont(15) }} type="defaultSemiBold">
                  ← All Categories
                </ThemedText>
              </TouchableOpacity>
              <ThemedText type="title" style={[styles.categoryTitle, { fontSize: scaleFont(22) }]}>
                {selectedCategoryData.name}
              </ThemedText>
              <ThemedText
                type="default"
                colorType="textMuted"
                style={{ fontSize: scaleFont(13), marginTop: 2 }}
              >
                {categoryProducts.length} product{categoryProducts.length !== 1 ? "s" : ""}
              </ThemedText>
            </View>

            {/* Subcategory filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subcategoriesScroll}>
              {/* "All" chip */}
              <TouchableOpacity
                style={[
                  styles.subcategoryButton,
                  {
                    backgroundColor: !selectedSubcategory ? theme.colors.primary : theme.colors.surface,
                    marginRight: 8,
                  },
                ]}
                onPress={() => setSelectedSubcategory(null)}
              >
                <Text
                  style={[
                    styles.subcategoryButtonText,
                    { color: !selectedSubcategory ? "#fff" : theme.colors.text, fontSize: scaleFont(13) },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {selectedCategoryData.subcategory.map((sub: string, idx: number) => {
                const isSelected = selectedSubcategory === sub;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.subcategoryButton,
                      { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface, marginRight: 8 },
                    ]}
                    onPress={() => setSelectedSubcategory(isSelected ? null : sub)}
                  >
                    <Text
                      style={[
                        styles.subcategoryButtonText,
                        { color: isSelected ? "#fff" : theme.colors.text, fontSize: scaleFont(13) },
                      ]}
                    >
                      {sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Product grid */}
            {categoryProducts.length === 0 ? (
              <ThemedView style={styles.emptyState} colorType="background">
                <ThemedText colorType="textMuted" style={{ textAlign: "center", fontSize: scaleFont(14) }}>
                  No products in this category yet.
                </ThemedText>
              </ThemedView>
            ) : (
              <ResponsiveGrid
                data={categoryProducts}
                paddingHorizontal={0}
                gap={spacing.sm}
                phoneCols={2}
                tabletCols={3}
                largeTabletCols={4}
                renderItem={renderProductCard}
              />
            )}
          </ThemedView>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingTop: 50, borderBottomWidth: 1 },
  headerTitle: { fontWeight: "bold" },
  searchContainer: { borderBottomWidth: 1 },
  searchInputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 10 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, padding: 0 },
  content: { flex: 1 },
  section: { flex: 1 },
  sectionLabel: { marginBottom: 12 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  /* Category landing */
  categoryCard: {
    width: "100%",
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    position: "relative",
  },
  categoryImage: { width: "100%", height: 160 },
  countBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  categoryInfo: { padding: 14 },
  categoryName: { fontWeight: "bold", marginBottom: 8 },
  subcategories: { flexDirection: "row" },
  subcategoryTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginRight: 6 },
  subcategoryText: { fontWeight: "500" },
  /* Category detail */
  categoryHeader: { marginBottom: 14 },
  backButton: { marginBottom: 8 },
  categoryTitle: { fontWeight: "bold" },
  subcategoriesScroll: { marginBottom: 16 },
  subcategoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  subcategoryButtonText: { fontWeight: "500" },
  /* Product card */
  productCard: {
    width: "100%",
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    overflow: "hidden",
  },
  productImage: { width: "100%", aspectRatio: 1 },
  productInfo: { padding: 10 },
  brandName: { marginBottom: 2 },
  productName: { marginBottom: 5 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontWeight: "bold" },
});
