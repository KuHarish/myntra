import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart, ShoppingBag } from "lucide-react-native";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { addRecentlyViewed } from "@/utils/recentlyViewed";
import axios from "axios";
import { API_BASE_URL } from "@/constants/Api";
import { useResponsive } from "@/src/hooks/useResponsive";
import ResponsiveContainer from "@/src/components/responsive/ResponsiveContainer";
import { resolveImageUri } from "@/utils/image";

export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [selectedSize, setSelectedSize] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout>();
  const { user } = useAuth();
  const [product, setproduct] = useState<any>(null);
  const [iswishlist, setiswishlist] = useState(false);

  const { scaleFont, spacing, isTablet } = useResponsive();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isRecsLoading, setIsRecsLoading] = useState(false);

  useEffect(() => {
    const fetchproduct = async () => {
      try {
        setIsLoading(true);
        const product = await axios.get(`${API_BASE_URL}/product/${id}`);
        setproduct(product.data);
        if (product.data) {
          addRecentlyViewed(product.data, user?._id);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchproduct();
  }, [id, user?._id]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setIsRecsLoading(true);
        const url = `${API_BASE_URL}/recommendations?productId=${id}${user?._id ? `&userId=${user._id}` : ""}`;
        const res = await axios.get(url);
        if (res.data && res.data.length > 0) {
          setRecommendations(res.data);
          // Track impressions
          res.data.forEach((prod: any) => {
            axios.post(`${API_BASE_URL}/recommendations/event`, {
              userId: user?._id || null,
              productId: prod._id,
              eventType: "impression",
              algorithmVersion: "v1"
            }).catch(() => {});
          });
        } else {
          // Fallback to general products
          const fallbackRes = await axios.get(`${API_BASE_URL}/product`);
          setRecommendations(fallbackRes.data.slice(0, 10));
        }
      } catch (err) {
        console.error("Failed to fetch recommendations, trying fallback...", err);
        try {
          const fallbackRes = await axios.get(`${API_BASE_URL}/product`);
          setRecommendations(fallbackRes.data.slice(0, 10));
        } catch (fallbackErr) {
          console.error("Ultimate fallback failed:", fallbackErr);
        }
      } finally {
        setIsRecsLoading(false);
      }
    };

    if (id) {
      fetchRecommendations();
    }
  }, [id, user?._id]);

  const handleRecommendationPress = async (prod: any) => {
    try {
      await axios.post(`${API_BASE_URL}/recommendations/event`, {
        userId: user?._id || null,
        productId: prod._id,
        eventType: "click",
        algorithmVersion: "v1"
      });
    } catch (e) {
      // Ignore click tracking failures
    }
    router.push(`/product/${prod._id}`);
  };

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [product, currentImageIndex]);

  const startAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
    const productImages = (Array.isArray(product?.images) && product.images.length > 0)
      ? product.images
      : ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop"];
    
    autoScrollTimer.current = setInterval(() => {
      if (product && scrollViewRef.current) {
        const nextIndex = (currentImageIndex + 1) % productImages.length;
        const scrollWidth = isTablet ? Math.min(width, 1280) * 0.45 : width; // matches layout image column width
        scrollViewRef.current.scrollTo({
          x: nextIndex * scrollWidth,
          animated: true,
        });
        setCurrentImageIndex(nextIndex);
      }
    }, 3000);
  };

  if (isLoading) {
    return (
      <ResponsiveContainer>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ff3f6c" />
        </View>
      </ResponsiveContainer>
    );
  }

  if (!product) {
    return (
      <ResponsiveContainer>
        <View style={styles.container}>
          <Text style={{ fontSize: scaleFont(16), textAlign: "center", marginTop: 50 }}>Product not found</Text>
        </View>
      </ResponsiveContainer>
    );
  }

  const handleAddwishlist = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/wishlist`, {
        userId: user._id,
        productId: id,
      });
      setiswishlist(true);
      router.push("/wishlist");
    } catch (error) {
      console.log(error);
    }
  };

  const handleAddToBag = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!selectedSize) {
      alert("Please select a size");
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/bag`, {
        userId: user._id,
        productId: id,
        size: selectedSize,
        quantity: 1,
      });
      router.push("/bag");
    } catch (error: any) {
      console.log(error);
      alert(error?.response?.data?.message || "Could not add item to bag. Price or stock might have changed.");
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const scrollWidth = isTablet ? Math.min(width, 1280) * 0.45 : width;
    const imageIndex = Math.round(contentOffset.x / scrollWidth);
    setCurrentImageIndex(imageIndex);
  };

  const imageColWidth = isTablet ? Math.min(width, 1280) * 0.45 : width;

  return (
    <ResponsiveContainer>
      {/* Dynamic layout wrapper */}
      <View style={[styles.mainLayout, { flexDirection: isTablet ? "row" : "column" }]}>
        
        {/* IMAGE CAROUSEL SECTION */}
        <View style={[styles.carouselColumn, isTablet && { width: imageColWidth }]}>
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {((Array.isArray(product?.images) && product.images.length > 0) ? product.images : ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop"]).map((image: any, index: any) => (
                <Image
                  key={index}
                  source={{ uri: resolveImageUri(image) }}
                  style={[styles.productImage, { width: imageColWidth, height: isTablet ? 500 : 400 }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            <View style={styles.pagination}>
              {((Array.isArray(product?.images) && product.images.length > 0) ? product.images : ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop"]).map((_: any, index: any) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    currentImageIndex === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* INFO AND CONTROLS SECTION */}
        <ScrollView style={[styles.infoColumn, { padding: spacing.md }]}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={[styles.brand, { fontSize: scaleFont(16) }]}>{product.brand}</Text>
              <Text style={[styles.name, { fontSize: scaleFont(20) }]} numberOfLines={2}>{product.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={handleAddwishlist}
            >
              <Heart
                size={24}
                color={iswishlist ? "#ff3f6c" : "#ccc"}
                fill={iswishlist ? "#ff3f6c" : "none"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.priceContainer}>
            <Text style={[styles.price, { fontSize: scaleFont(20) }]}>₹{product.price}</Text>
            <Text style={[styles.discount, { fontSize: scaleFont(16) }]}>{product.discount}</Text>
          </View>

          <Text style={[styles.description, { fontSize: scaleFont(15), lineHeight: scaleFont(22) }]}>
            {product.description}
          </Text>

          {/* Size grid selection */}
          <View style={styles.sizeSection}>
            <Text style={[styles.sizeTitle, { fontSize: scaleFont(16) }]}>Select Size</Text>
            <View style={styles.sizeGrid}>
              {product.sizes.map((size: any) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeButton,
                    selectedSize === size && styles.selectedSize,
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      { fontSize: scaleFont(15) },
                      selectedSize === size && styles.selectedSizeText,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Buy buttons inline for Tablet split layouts */}
          {isTablet && (
            <TouchableOpacity
              style={[styles.addToBagButton, { marginTop: spacing.md }]}
              onPress={handleAddToBag}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <ShoppingBag size={20} color="#fff" />
                  <Text style={[styles.addToBagText, { fontSize: scaleFont(16) }]}>ADD TO BAG</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* RECOMMENDATIONS SECTION */}
          {isRecsLoading ? (
            <View style={styles.recsLoaderContainer}>
              <ActivityIndicator size="small" color="#ff3f6c" />
            </View>
          ) : recommendations.length > 0 ? (
            <View style={styles.recsSection}>
              <Text style={[styles.recsTitle, { fontSize: scaleFont(16) }]}>You May Also Like</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recsScroll}
              >
                {recommendations.map((item: any) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.recCard}
                    onPress={() => handleRecommendationPress(item)}
                  >
                    <Image
                      source={{
                        uri: resolveImageUri(item.images?.[0])
                      }}
                      style={styles.recImage}
                      resizeMode="cover"
                    />
                    <View style={styles.recInfo}>
                      <Text style={[styles.recBrand, { fontSize: scaleFont(10) }]} numberOfLines={1}>
                        {item.brand}
                      </Text>
                      <Text style={[styles.recName, { fontSize: scaleFont(12) }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.recPriceRow}>
                        <Text style={[styles.recPrice, { fontSize: scaleFont(12) }]}>₹{item.price}</Text>
                        {item.discount && (
                          <Text style={[styles.recDiscount, { fontSize: scaleFont(10) }]}>{item.discount}</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Floating footer purchase controls for phones */}
      {!isTablet && (
        <View style={[styles.footer, { padding: spacing.sm }]}>
          <TouchableOpacity
            style={styles.addToBagButton}
            onPress={handleAddToBag}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <ShoppingBag size={20} color="#fff" />
                <Text style={[styles.addToBagText, { fontSize: scaleFont(16) }]}>ADD TO BAG</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainLayout: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  carouselColumn: {
    justifyContent: "center",
  },
  carouselContainer: {
    position: "relative",
  },
  productImage: {
    width: "100%",
  },
  pagination: {
    position: "absolute",
    bottom: 16,
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#fff",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  infoColumn: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: {
    color: "#666",
    marginBottom: 5,
  },
  name: {
    fontWeight: "bold",
    color: "#3e3e3e",
    marginBottom: 10,
  },
  wishlistButton: {
    padding: 10,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  price: {
    fontWeight: "bold",
    color: "#3e3e3e",
    marginRight: 10,
  },
  discount: {
    color: "#ff3f6c",
    fontWeight: "600",
  },
  description: {
    color: "#666",
    marginBottom: 20,
  },
  sizeSection: {
    marginBottom: 20,
  },
  sizeTitle: {
    fontWeight: "bold",
    color: "#3e3e3e",
    marginBottom: 10,
  },
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sizeButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedSize: {
    borderColor: "#ff3f6c",
    backgroundColor: "#fff4f4",
  },
  sizeText: {
    color: "#3e3e3e",
  },
  selectedSizeText: {
    color: "#ff3f6c",
    fontWeight: "bold",
  },
  footer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  addToBagButton: {
    backgroundColor: "#ff3f6c",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    gap: 10,
    width: "100%",
  },
  addToBagText: {
    color: "#fff",
    fontWeight: "bold",
  },
  recsLoaderContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  recsSection: {
    marginTop: 25,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 20,
  },
  recsTitle: {
    fontWeight: "bold",
    color: "#3e3e3e",
    marginBottom: 15,
  },
  recsScroll: {
    paddingBottom: 5,
  },
  recCard: {
    width: 140,
    marginRight: 15,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  recImage: {
    width: "100%",
    height: 140,
  },
  recInfo: {
    padding: 8,
  },
  recBrand: {
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  recName: {
    color: "#3e3e3e",
    marginBottom: 4,
  },
  recPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recPrice: {
    fontWeight: "bold",
    color: "#3e3e3e",
  },
  recDiscount: {
    color: "#ff3f6c",
    fontWeight: "600",
  },
});
