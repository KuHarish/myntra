import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { ShoppingBag, Minus, Plus, Trash2, AlertTriangle, Bookmark } from "lucide-react-native";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/src/theme";
import { API_BASE_URL } from "@/constants/Api";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useResponsive } from "@/src/hooks/useResponsive";
import ResponsiveContainer from "@/src/components/responsive/ResponsiveContainer";
import ResponsiveModal from "@/src/components/responsive/ResponsiveModal";

export default function Bag() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [activeItems, setActiveItems] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null); // tracks which saved item is being moved

  // Validation state
  const [validationItems, setValidationItems] = useState<any[]>([]);
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  const { scaleFont, spacing, isTablet } = useResponsive();

  const fetchCart = useCallback(async (showLoader = true) => {
    if (!user) return;
    try {
      if (showLoader) setIsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/cart/${user._id}`);
      setActiveItems(res.data.activeItems || []);
      setSavedItems(res.data.savedItems || []);
      setValidationItems([]);
      setValidationMessage("");
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchCart(false);
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number, currentVersion: number, retryCount = 0) => {
    if (newQuantity < 1) return;
    
    // Optimistic UI Update
    setActiveItems(prev =>
      prev.map(item => (item._id === itemId ? { ...item, quantity: newQuantity } : item))
    );

    try {
      await axios.put(`${API_BASE_URL}/cart/items/${itemId}`, {
        quantity: newQuantity,
        version: currentVersion
      });
      fetchCart(false);
    } catch (error: any) {
      console.warn("Quantity update error:", error?.response?.data);
      if (error?.response?.status === 409) {
        const errMsg = error?.response?.data?.message || "Stock limit or conflict.";
        if (error?.response?.data?.conflict && retryCount < 1) {
          try {
            const freshCart = await axios.get(`${API_BASE_URL}/cart/${user?._id}`);
            const freshItem = freshCart.data.activeItems.find((i: any) => i._id === itemId);
            if (freshItem) {
              handleUpdateQuantity(itemId, newQuantity, freshItem.version, retryCount + 1);
              return;
            }
          } catch (retryErr) {
            console.error("Retry failed:", retryErr);
          }
        }
        Alert.alert("Conflict or Stock Limit", errMsg);
      } else {
        Alert.alert("Error", "Could not update item quantity.");
      }
      fetchCart(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/cart/items/${itemId}`);
      fetchCart(false);
    } catch (error) {
      console.error("Error removing item:", error);
      Alert.alert("Error", "Could not remove item from cart.");
    }
  };

  const handleRemoveSavedItem = (itemId: string) => {
    Alert.alert(
      "Confirm Removal",
      "Remove this item from Save for Later?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => performRemoveSavedItem(itemId),
        },
      ]
    );
  };

  const performRemoveSavedItem = async (itemId: string) => {
    try {
      // Optimistically remove from saved items
      setSavedItems(prev => prev.filter(i => i._id !== itemId));
      await axios.delete(`${API_BASE_URL}/cart/items/${itemId}`);
      fetchCart(false);
    } catch (error) {
      console.error("Error removing saved item:", error);
      Alert.alert("Error", "Could not remove item from Save for Later.");
      fetchCart(false);
    }
  };

  const handleSaveForLater = async (itemId: string) => {
    try {
      await axios.post(`${API_BASE_URL}/cart/items/${itemId}/save`);
      fetchCart(false);
    } catch (error) {
      console.error("Error saving for later:", error);
      Alert.alert("Error", "Could not save item for later.");
    }
  };

  const handleMoveToCart = async (itemId: string) => {
    try {
      setMovingItemId(itemId);
      // Optimistic UI: immediately remove from saved list so user sees instant response
      setSavedItems(prev => prev.filter(i => i._id !== itemId));
      await axios.post(`${API_BASE_URL}/cart/saved/${itemId}/move-to-cart`);
      // Sync real state from server (will also update active items)
      fetchCart(false);
    } catch (error: any) {
      console.warn("Move to cart error:", error?.response?.data);
      // Revert optimistic removal on failure
      fetchCart(false);
      Alert.alert(
        "Could Not Move Item",
        error?.response?.data?.message || "Could not move item back to bag. Please try again."
      );
    } finally {
      setMovingItemId(null);
    }
  };

  const handleAcceptPriceChanges = async () => {
    if (!user) return;
    try {
      await axios.post(`${API_BASE_URL}/cart/accept-prices`, { userId: user._id });
      setShowPriceModal(false);
      handleCheckoutValidation();
    } catch (error) {
      console.error("Error accepting price changes:", error);
      Alert.alert("Error", "Could not accept price updates.");
    }
  };

  const handleCheckoutValidation = async () => {
    if (!user) return;
    try {
      setIsValidationLoading(true);
      setValidationMessage("");
      
      const res = await axios.get(`${API_BASE_URL}/cart/validate?userId=${user._id}`);
      const { isValid, items } = res.data;
      
      setValidationItems(items || []);

      if (isValid) {
        const hasPriceChange = items.some((item: any) => item.status === "price_changed");
        if (hasPriceChange) {
          setIsValidationLoading(false);
          setShowPriceModal(true);
          return;
        }
        setIsValidationLoading(false);
        router.push("/checkout");
      } else {
        setIsValidationLoading(false);
        const errors = items
          .filter((item: any) => item.status === "discontinued" || item.status === "out_of_stock")
          .map((item: any) => `${item.productName} (${item.status === "discontinued" ? "Discontinued" : "Out of stock"})`);
        
        setValidationMessage(`Please resolve the items with errors: \n• ${errors.join("\n• ")}`);
        Alert.alert("Validation Failed", "Some items in your cart are no longer available or have insufficient stock.");
      }
    } catch (error) {
      console.error("Validation error:", error);
      setIsValidationLoading(false);
      Alert.alert("Error", "Checkout validation failed. Please try again.");
    }
  };

  if (!user) {
    return (
      <ResponsiveContainer>
        <ThemedView style={styles.container} colorType="background">
          <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border, padding: spacing.md }]} colorType="background">
            <ThemedText type="title" style={[styles.headerTitle, { fontSize: scaleFont(22) }]}>Shopping Bag</ThemedText>
          </ThemedView>
          <ThemedView style={styles.emptyState} colorType="background">
            <ShoppingBag size={64} color={theme.colors.primary} />
            <ThemedText type="subtitle" style={[styles.emptyTitle, { fontSize: scaleFont(18) }]}>Please login to view your bag</ThemedText>
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push("/login")}
            >
              <ThemedText style={[styles.loginButtonText, { fontSize: scaleFont(16) }]} type="defaultSemiBold">LOGIN</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ResponsiveContainer>
    );
  }

  // Calculate totals
  const subtotal = activeItems.reduce(
    (sum: number, item: any) => sum + item.priceAtAdded * item.quantity,
    0
  );

  const renderCartItemsList = () => (
    <>
      <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { fontSize: scaleFont(16), paddingHorizontal: spacing.sm }]}>
        Active Bag ({activeItems.length})
      </ThemedText>

      {activeItems.length === 0 ? (
        <View style={[styles.inlineEmptyState, { margin: spacing.sm }]}>
          <ShoppingBag size={40} color={theme.colors.textMuted} />
          <ThemedText type="default" colorType="textMuted" style={[styles.emptyText, { fontSize: scaleFont(14) }]}>
            Your active shopping bag is empty.
          </ThemedText>
        </View>
      ) : (
        activeItems.map((item: any) => {
          const vItem = validationItems.find((v: any) => v.itemId === item._id);
          const isDiscontinued = vItem?.status === "discontinued" || item.productId?.isDiscontinued;
          const isOutOfStock = vItem?.status === "out_of_stock";
          const isPriceChanged = vItem?.status === "price_changed";
          const lowStock = item.productId && item.productId.stock > 0 && item.productId.stock <= 5;
          const availableStock = item.productId ? item.productId.stock : 0;

          return (
            <ThemedView
              key={item._id}
              style={[
                styles.bagItem,
                { backgroundColor: theme.colors.card, shadowColor: theme.colors.text },
                (isDiscontinued || isOutOfStock) && styles.invalidItemBorder
              ]}
              colorType="card"
            >
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: item.productImageAtAdded || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop" }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                {isDiscontinued && (
                  <View style={styles.statusOverlay}>
                    <Text style={styles.statusOverlayText}>DISCONTINUED</Text>
                  </View>
                )}
                {isOutOfStock && (
                  <View style={styles.statusOverlay}>
                    <Text style={styles.statusOverlayText}>OUT OF STOCK</Text>
                  </View>
                )}
              </View>

              <ThemedView style={styles.itemInfo} colorType="card">
                <ThemedText type="default" colorType="textMuted" style={[styles.brandName, { fontSize: scaleFont(11) }]}>
                  {item.brandAtAdded}
                </ThemedText>
                <ThemedText type="defaultSemiBold" numberOfLines={1} style={[styles.itemName, { fontSize: scaleFont(14) }]}>
                  {item.productNameAtAdded}
                </ThemedText>
                <ThemedText type="default" colorType="textMuted" style={[styles.itemSize, { fontSize: scaleFont(12) }]}>
                  Size: {item.size}
                </ThemedText>

                <View style={styles.priceContainer}>
                  {isPriceChanged ? (
                    <>
                      <Text style={styles.originalPrice}>₹{item.priceAtAdded}</Text>
                      <Text style={styles.newPrice}>₹{vItem.currentPrice}</Text>
                    </>
                  ) : (
                    <ThemedText type="defaultSemiBold" style={[styles.itemPrice, { fontSize: scaleFont(14) }]}>
                      ₹{item.priceAtAdded}
                    </ThemedText>
                  )}
                </View>

                {lowStock && !isOutOfStock && !isDiscontinued && (
                  <Text style={[styles.stockWarning, { fontSize: scaleFont(11) }]}>
                    Only {availableStock} left!
                  </Text>
                )}

                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[styles.quantityButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handleUpdateQuantity(item._id, item.quantity - 1, item.version)}
                    disabled={item.quantity <= 1 || isDiscontinued}
                  >
                    <Minus size={16} color={theme.colors.text} />
                  </TouchableOpacity>
                  
                  <ThemedText style={[styles.quantity, { fontSize: scaleFont(14) }]} type="defaultSemiBold">
                    {item.quantity}
                  </ThemedText>
                  
                  <TouchableOpacity
                    style={[styles.quantityButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handleUpdateQuantity(item._id, item.quantity + 1, item.version)}
                    disabled={isDiscontinued || isOutOfStock}
                  >
                    <Plus size={16} color={theme.colors.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleSaveForLater(item._id)}
                  >
                    <Bookmark size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(item._id)}
                  >
                    <Trash2 size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </ThemedView>
          );
        })
      )}

      {/* SAVE FOR LATER SECTION */}
      <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { fontSize: scaleFont(16), marginTop: spacing.md, paddingHorizontal: spacing.sm }]}>
        Saved For Later ({savedItems.length})
      </ThemedText>

      {savedItems.length === 0 ? (
        <View style={[styles.inlineEmptyState, { margin: spacing.sm }]}>
          <Bookmark size={40} color={theme.colors.textMuted} />
          <ThemedText type="default" colorType="textMuted" style={[styles.emptyText, { fontSize: scaleFont(14) }]}>
            No items saved for later.
          </ThemedText>
        </View>
      ) : (
        savedItems.map((item: any) => {
          const product = item.productId;
          // Guard: if product not populated, treat as unavailable
          const isProductMissing = !product || typeof product !== 'object';
          const outOfStock = isProductMissing || product.stock === 0;
          const discontinued = isProductMissing ? false : !!product.isDiscontinued;
          const isMoving = movingItemId === item._id;
          const isDisabled = discontinued || outOfStock || isMoving;

          // Safe image URI — guard against null product or empty images array
          const imageUri =
            !isProductMissing && Array.isArray(product.images) && product.images[0]
              ? product.images[0]
              : "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop";

          return (
            <ThemedView
              key={item._id}
              style={[
                styles.bagItem,
                { backgroundColor: theme.colors.card },
                isMoving && { opacity: 0.5 },
              ]}
              colorType="card"
            >
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              </View>

              <ThemedView style={styles.itemInfo} colorType="card">
                <ThemedText type="default" colorType="textMuted" style={[styles.brandName, { fontSize: scaleFont(11) }]}>
                  {isProductMissing ? "—" : product.brand}
                </ThemedText>
                <ThemedText type="defaultSemiBold" numberOfLines={1} style={[styles.itemName, { fontSize: scaleFont(14) }]}>
                  {isProductMissing ? "Product unavailable" : product.name}
                </ThemedText>
                <ThemedText type="default" colorType="textMuted" style={[styles.itemSize, { fontSize: scaleFont(12) }]}>
                  Size: {item.size}
                </ThemedText>
                {!isProductMissing && (
                  <ThemedText type="defaultSemiBold" style={[styles.itemPrice, { fontSize: scaleFont(14) }]}>
                    ₹{product.price}
                  </ThemedText>
                )}

                {isProductMissing ? (
                  <Text style={[styles.errorText, { fontSize: scaleFont(12) }]}>Product no longer available</Text>
                ) : discontinued ? (
                  <Text style={[styles.errorText, { fontSize: scaleFont(12) }]}>Product Discontinued</Text>
                ) : outOfStock ? (
                  <Text style={[styles.errorText, { fontSize: scaleFont(12) }]}>Out of stock</Text>
                ) : null}

                <View style={styles.savedActions}>
                  <TouchableOpacity
                    style={[
                      styles.moveToBagButton,
                      { borderColor: isDisabled ? "#ccc" : theme.colors.primary },
                      isDisabled && styles.disabledMoveButton,
                    ]}
                    onPress={() => handleMoveToCart(item._id)}
                    disabled={isDisabled}
                  >
                    {isMoving ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <ThemedText
                        style={[
                          styles.moveToBagText,
                          { color: isDisabled ? "#ccc" : theme.colors.primary, fontSize: scaleFont(11) },
                        ]}
                      >
                        MOVE TO BAG
                      </ThemedText>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.removeSavedTextButton,
                      { borderColor: isMoving ? "#ccc" : "#999", marginLeft: spacing.sm },
                      isMoving && styles.disabledRemoveButton,
                    ]}
                    onPress={() => handleRemoveSavedItem(item._id)}
                    disabled={isMoving}
                  >
                    <ThemedText
                      style={[
                        styles.removeSavedText,
                        { color: isMoving ? "#ccc" : "#999", fontSize: scaleFont(11) },
                      ]}
                    >
                      REMOVE
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </ThemedView>
          );
        })
      )}
    </>
  );

  const renderSummaryCard = () => (
    <ThemedView style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, padding: spacing.md }]} colorType="card">
      <ThemedText type="subtitle" style={[styles.summaryTitle, { fontSize: scaleFont(16) }]}>COUPONS & DETAILS</ThemedText>
      
      <View style={styles.divider} />
      
      <View style={styles.summaryRow}>
        <ThemedText type="default" colorType="textMuted" style={{ fontSize: scaleFont(14) }}>Subtotal</ThemedText>
        <ThemedText type="defaultSemiBold" style={{ fontSize: scaleFont(14) }}>₹{subtotal}</ThemedText>
      </View>
      <View style={styles.summaryRow}>
        <ThemedText type="default" colorType="textMuted" style={{ fontSize: scaleFont(14) }}>Shipping Fee</ThemedText>
        <ThemedText type="defaultSemiBold" style={{ fontSize: scaleFont(14), color: "green" }}>FREE</ThemedText>
      </View>
      
      <View style={[styles.divider, { marginVertical: 10 }]} />
      
      <View style={styles.summaryRow}>
        <ThemedText type="subtitle" style={{ fontSize: scaleFont(16) }}>Total Amount</ThemedText>
        <ThemedText type="subtitle" style={{ fontSize: scaleFont(16), color: theme.colors.primary }}>₹{subtotal}</ThemedText>
      </View>

      <TouchableOpacity
        style={[styles.checkoutButton, { backgroundColor: theme.colors.primary, marginTop: spacing.md }]}
        onPress={handleCheckoutValidation}
        disabled={isValidationLoading || activeItems.length === 0}
      >
        {isValidationLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText style={[styles.checkoutButtonText, { fontSize: scaleFont(16) }]} type="defaultSemiBold">
            PLACE ORDER
          </ThemedText>
        )}
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <ResponsiveContainer>
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border, padding: spacing.md }]} colorType="background">
        <ThemedText type="title" style={[styles.headerTitle, { fontSize: scaleFont(22) }]}>Shopping Bag</ThemedText>
      </ThemedView>

      {validationMessage ? (
        <View style={styles.validationBanner}>
          <AlertTriangle size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.validationBannerText}>{validationMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {isTablet ? (
            /* Tablet Split Columns Layout */
            <View style={[styles.splitLayout, { padding: spacing.md }]}>
              <ScrollView 
                style={styles.leftColumn}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
                }
              >
                {renderCartItemsList()}
              </ScrollView>
              
              <View style={styles.rightColumn}>
                {renderSummaryCard()}
              </View>
            </View>
          ) : (
            /* Phone Stacked Scrolling Layout */
            <View style={{ flex: 1 }}>
              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
                }
              >
                <View style={{ padding: spacing.sm }}>
                  {renderCartItemsList()}
                </View>
              </ScrollView>

              {activeItems.length > 0 && (
                <ThemedView style={[styles.footer, { borderTopColor: theme.colors.border, padding: spacing.sm }]} colorType="card">
                  <View style={styles.totalContainer}>
                    <ThemedText type="default" colorType="textMuted" style={{ fontSize: scaleFont(14) }}>
                      Total Amount
                    </ThemedText>
                    <ThemedText type="subtitle" style={{ fontSize: scaleFont(18) }}>
                      ₹{subtotal}
                    </ThemedText>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.checkoutButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleCheckoutValidation}
                    disabled={isValidationLoading}
                  >
                    {isValidationLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <ThemedText style={[styles.checkoutButtonText, { fontSize: scaleFont(16) }]} type="defaultSemiBold">
                        PLACE ORDER
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </ThemedView>
              )}
            </View>
          )}
        </View>
      )}

      {/* Responsive Price Modal Warning */}
      <ResponsiveModal
        visible={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        title="Price Change Detected"
      >
        <Text style={[styles.modalBody, { fontSize: scaleFont(14) }]}>
          Prices for some items in your active shopping bag have changed. Please accept the price changes to proceed with checkout.
        </Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalCancel]}
            onPress={() => setShowPriceModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleAcceptPriceChanges}
          >
            <Text style={styles.modalAcceptText}>Accept Changes</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveModal>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: "bold",
  },
  validationBanner: {
    backgroundColor: "#d9534f",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  validationBannerText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 10,
    fontWeight: "bold",
  },
  skeletonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ccc",
    marginBottom: 15,
  },
  emptyText: {
    marginTop: 10,
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
  },
  bagItem: {
    flexDirection: "row",
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    overflow: "hidden",
    position: "relative",
  },
  invalidItemBorder: {
    borderWidth: 1.5,
    borderColor: "#d9534f",
  },
  imageWrapper: {
    width: 100,
    height: 130,
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  statusOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusOverlayText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  itemInfo: {
    flex: 1,
    padding: 12,
  },
  brandName: {
    marginBottom: 2,
  },
  itemName: {
    marginBottom: 5,
  },
  itemSize: {
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemPrice: {},
  originalPrice: {
    textDecorationLine: "line-through",
    color: "#999",
    fontSize: 12,
    marginRight: 8,
  },
  newPrice: {
    color: "#d9534f",
    fontSize: 13,
    fontWeight: "bold",
  },
  stockWarning: {
    color: "#f0ad4e",
    fontWeight: "600",
    marginBottom: 8,
  },
  errorText: {
    color: "#d9534f",
    fontWeight: "600",
    marginTop: 5,
    marginBottom: 5,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  quantity: {
    marginHorizontal: 12,
  },
  actionIconButton: {
    marginLeft: 15,
    padding: 5,
  },
  removeButton: {
    marginLeft: "auto",
    padding: 5,
  },
  savedActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  moveToBagButton: {
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  disabledMoveButton: {
    borderColor: "#ccc",
    opacity: 0.5,
  },
  moveToBagText: {
    fontWeight: "bold",
  },
  removeSavedTextButton: {
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  disabledRemoveButton: {
    borderColor: "#ccc",
    opacity: 0.5,
  },
  removeSavedText: {
    fontWeight: "bold",
  },
  footer: {
    borderTopWidth: 1,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  checkoutButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#fff",
  },
  // Split layouts
  splitLayout: {
    flex: 1,
    flexDirection: "row",
    gap: 20,
  },
  leftColumn: {
    flex: 1.5,
  },
  rightColumn: {
    flex: 1,
    maxWidth: 400,
  },
  summaryCard: {
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryTitle: {
    fontWeight: "bold",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  // Modal buttons
  modalBody: {
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  modalCancel: {
    backgroundColor: "#eee",
  },
  modalCancelText: {
    color: "#555",
    fontWeight: "600",
  },
  modalAcceptText: {
    color: "#fff",
    fontWeight: "600",
  },
});
