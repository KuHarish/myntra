import React, { useEffect, useState } from "react";
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
import { Search, X } from "lucide-react-native";
import axios from "axios";
import { useTheme } from "@/src/theme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { API_BASE_URL } from "@/constants/Api";

export default function TabTwoScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setcategories] = useState<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchproduct = async () => {
      try {
        setIsLoading(true);
        const cat = await axios.get(`${API_BASE_URL}/category`);
        setcategories(cat.data);
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchproduct();
  }, []);

  if (isLoading) {
    return (
      <ThemedView style={styles.loaderContainer} colorType="background">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ThemedView>
    );
  }

  if (!categories) {
    return (
      <ThemedView style={styles.container} colorType="background">
        <ThemedText style={{ textAlign: 'center', marginTop: 50 }}>Categories not found</ThemedText>
      </ThemedView>
    );
  }

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

  const handleSubcategorySelect = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
    setSearchQuery("");
  };

  const filtercategories = categories?.filter(
    (category: any) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.subcategory.some((subcategory: any) =>
        subcategory.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      category.productId.some(
        (product: any) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const selectedcategorydata = selectedCategory
    ? categories?.find((cat: any) => cat._id === selectedCategory)
    : null;

  const renderProducts = (products: any) => {
    return products?.map((product: any) => (
      <TouchableOpacity
        key={product._id}
        style={[styles.productCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.text }]}
        onPress={() => router.push(`/product/${product._id}`)}
      >
        <Image source={{ uri: product.images[0] }} style={styles.productImage} />
        <ThemedView style={styles.productInfo} colorType="card">
          <ThemedText type="default" colorType="textMuted" style={styles.brandName}>{product.brand}</ThemedText>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.productName}>{product.name}</ThemedText>
          <View style={styles.priceRow}>
            <ThemedText type="defaultSemiBold" style={styles.price}>₹{product.price}</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: theme.colors.primary, fontSize: 13 }}>{product.discount}</ThemedText>
          </View>
        </ThemedView>
      </TouchableOpacity>
    ));
  };

  return (
    <ThemedView style={styles.container} colorType="background">
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <ThemedText type="title" style={styles.headerTitle}>Categories</ThemedText>
      </ThemedView>

      <ThemedView style={[styles.searchContainer, { borderBottomColor: theme.colors.border }]} colorType="background">
        <ThemedView style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface }]} colorType="surface">
          <Search size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search for products, brands and more"
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

      <ScrollView style={styles.content}>
        {!selectedCategory && (
          <ThemedView style={styles.categoriesGrid} colorType="background">
            {filtercategories?.map((category: any) => (
              <TouchableOpacity
                key={category._id}
                style={[styles.categoryCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.text }]}
                onPress={() => handleCategorySelect(category._id)}
              >
                <Image
                  source={{ uri: category.image }}
                  style={styles.categoryImage}
                />
                <ThemedView style={styles.categoryInfo} colorType="card">
                  <ThemedText type="subtitle" style={styles.categoryName}>{category.name}</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.subcategories}>
                      {category?.subcategory?.map((sub: any, idx: any) => (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.subcategoryTag, { backgroundColor: theme.colors.surface }]}
                          onPress={() => handleSubcategorySelect(sub)}
                        >
                          <ThemedText type="default" colorType="textMuted" style={styles.subcategoryText}>{sub}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </ThemedView>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}

        {selectedcategorydata && (
          <ThemedView style={styles.categoryDetail} colorType="background">
            <View style={styles.categoryHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedCategory(null)}
              >
                <ThemedText style={{ color: theme.colors.primary, fontSize: 16 }} type="defaultSemiBold">
                  ← Back to Categories
                </ThemedText>
              </TouchableOpacity>
              <ThemedText type="title" style={styles.categoryTitle}>
                {selectedcategorydata.name}
              </ThemedText>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.subcategoriesScroll}
            >
              {selectedcategorydata.subcategory.map(
                (sub: any, idx: any) => {
                  const isSelected = selectedSubcategory === sub;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.subcategoryButton,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                        },
                      ]}
                      onPress={() => handleSubcategorySelect(sub)}
                    >
                      <Text
                        style={[
                          styles.subcategoryButtonText,
                          {
                            color: isSelected ? "#fff" : theme.colors.text,
                            fontWeight: isSelected ? "bold" : "normal",
                          },
                        ]}
                      >
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>
            <View style={styles.productsGrid}>
              {renderProducts(selectedcategorydata?.productId)}
            </View>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  content: {
    flex: 1,
  },
  categoriesGrid: {
    padding: 15,
  },
  categoryCard: {
    borderRadius: 10,
    marginBottom: 15,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    overflow: "hidden",
  },
  categoryImage: {
    width: "100%",
    height: 150,
  },
  categoryInfo: {
    padding: 15,
  },
  categoryName: {
    fontSize: 18,
    marginBottom: 10,
  },
  subcategories: {
    flexDirection: "row",
  },
  subcategoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  subcategoryText: {
    fontSize: 13,
  },
  categoryDetail: {
    flex: 1,
    padding: 15,
  },
  categoryHeader: {
    marginBottom: 15,
  },
  backButton: {
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 22,
    marginTop: 5,
  },
  subcategoriesScroll: {
    marginBottom: 15,
  },
  subcategoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  subcategoryButtonText: {
    fontSize: 14,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    width: "48%",
    borderRadius: 10,
    marginBottom: 15,
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
  price: {
    fontSize: 14,
  },
});
