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
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ShoppingBag, Minus, Plus, Trash2, AlertTriangle, RefreshCw, Bookmark } from "lucide-react-native";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/src/theme";
import { API_BASE_URL } from "@/constants/Api";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";

export default function Bag() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [activeItems, setActiveItems] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Validation state
  const [validationItems, setValidationItems] = useState<any[]>([]);
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  const fetchCart = useCallback(async (showLoader = true) => {
    if (!user) return;
    try {
      if (showLoader) setIsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/cart/${user._id}`);
      setActiveItems(res.data.activeItems || []);
      setSavedItems(res.data.savedItems || []);
      
      // Clear validation items on fresh fetch
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

  // Optimistic quantity updates with retry logic
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
      // Refresh silently to sync any backend calculations or snapshots
      fetchCart(false);
    } catch (error: any) {
      console.warn("Quantity update error:", error?.response?.data);
      
      if (error?.response?.status === 409) {
        // Concurrency conflict / stock limit error
        const errMsg = error?.response?.data?.message || "Stock limit or conflict.";
        
        if (error?.response?.data?.conflict && retryCount < 1) {
          // Automatic retry once on version conflict by fetching latest first
          console.log("Retrying quantity update once...");
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
      // Revert optimistic change on failure
      fetchCart(false);
    }
  };

  // Remove Item Handler
  const handleRemoveItem = async (itemId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/cart/items/${itemId}`);
      fetchCart(false);
    } catch (error) {
      console.error("Error removing item:", error);
      Alert.alert("Error", "Could not remove item from cart.");
    }
  };

  // Move to Save for Later
  const handleSaveForLater = async (itemId: string) => {
    try {
      await axios.post(`${API_BASE_URL}/cart/items/${itemId}/save`);
      fetchCart(false);
    } catch (error) {
      console.error("Error saving for later:", error);
      Alert.alert("Error", "Could not save item for later.");
    }
  };

  // Move Back to Cart
  const handleMoveToCart = async (itemId: string) => {
    try {
      await axios.post(`${API_BASE_URL}/cart/saved/${itemId}/move-to-cart`);
      fetchCart(false);
    } catch (error: any) {
      console.warn("Move to cart error:", error?.response?.data);
      Alert.alert("Stock / Move Limit", error?.response?.data?.message || "Could not move item back to bag.");
      fetchCart(false);
    }
  };

  // Accept Price Changes
  const handleAcceptPriceChanges = async () => {
    if (!user) return;
    try {
      await axios.post(`${API_BASE_URL}/cart/accept-prices`, { userId: user._id });
      setShowPriceModal(false);
      // Re-run checkout validation
      handleCheckoutValidation();
    } catch (error) {
      console.error("Error accepting price changes:", error);
      Alert.alert("Error", "Could not accept price updates.");
    }
  };

  // Place Order checkout validation
  const handleCheckoutValidation = async () => {
    if (!user) return;
    try {
      setIsValidationLoading(true);
      setValidationMessage("");
      
      const res = await axios.get(`${API_BASE_URL}/cart/validate?userId=${user._id}`);
      const { isValid, items } = res.data;
      
      setValidationItems(items || []);

      if (isValid) {
        // Double check if there's any price change in items list
        const hasPriceChange = items.some((item: any) => item.status === "price_changed");
        if (hasPriceChange) {
          setIsValidationLoading(false);
          setShowPriceModal(true);
          return;
        }
        
        // Everything clean, navigate to checkout
        setIsValidationLoading(false);
        router.push("/checkout");
      } else {
        setIsValidationLoading(false);
        // Formulate errors list
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
      <ThemedView style={styles.container} colorType="background">
        <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
          <ThemedText type="title" style={styles.headerTitle}>Shopping Bag</ThemedText>
        </ThemedView>
        <ThemedView style={styles.emptyState} colorType="background">
          <ShoppingBag size={64} color={theme.colors.primary} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>Please login to view your bag</ThemedText>
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

  // Calculate Subtotals based on prices snapped
  const subtotal = activeItems.reduce(
    (sum: number, item: any) => sum + item.priceAtAdded * item.quantity,
    0
  );

  return (
    <ThemedView style={styles.container} colorType="background">
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <ThemedText type="title" style={styles.headerTitle}>Shopping Bag</ThemedText>
      </ThemedView>

      {/* Validation Warning Alert */}
      {validationMessage ? (
        <View style={styles.validationBanner}>
          <AlertTriangle size={18} color="#fff" />
          <Text style={styles.validationBannerText}>{validationMessage}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
          </View>
        ) : (
          <>
            {/* ACTIVE SHOPPING BAG SECTION */}
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Active Bag ({activeItems.length})
            </ThemedText>

            {activeItems.length === 0 ? (
              <View style={styles.inlineEmptyState}>
                <ShoppingBag size={40} color={theme.colors.textMuted} />
                <ThemedText type="default" colorType="textMuted" style={styles.emptyText}>
                  Your active shopping bag is empty.
                </ThemedText>
              </View>
            ) : (
              activeItems.map((item: any) => {
                // Determine item validation details
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
                    <Image
                      source={{ uri: item.productImageAtAdded || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop" }}
                      style={styles.itemImage}
                    />
                    
                    {/* Discontinued / Out of stock overlays */}
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

                    <ThemedView style={styles.itemInfo} colorType="card">
                      <ThemedText type="default" colorType="textMuted" style={styles.brandName}>
                        {item.brandAtAdded}
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.itemName}>
                        {item.productNameAtAdded}
                      </ThemedText>
                      <ThemedText type="default" colorType="textMuted" style={styles.itemSize}>
                        Size: {item.size}
                      </ThemedText>

                      {/* Price rendering with change validation warning */}
                      <View style={styles.priceContainer}>
                        {isPriceChanged ? (
                          <>
                            <Text style={styles.originalPrice}>₹{item.priceAtAdded}</Text>
                            <Text style={styles.newPrice}>₹{vItem.currentPrice} *Price updated*</Text>
                          </>
                        ) : (
                          <ThemedText type="defaultSemiBold" style={styles.itemPrice}>
                            ₹{item.priceAtAdded}
                          </ThemedText>
                        )}
                      </View>

                      {/* Stock limit badges */}
                      {lowStock && !isOutOfStock && !isDiscontinued && (
                        <Text style={styles.stockWarning}>
                          Only {availableStock} left in stock!
                        </Text>
                      )}

                      <View style={styles.quantityContainer}>
                        {/* Decrement Button */}
                        <TouchableOpacity
                          style={[styles.quantityButton, { backgroundColor: theme.colors.surface }]}
                          onPress={() => handleUpdateQuantity(item._id, item.quantity - 1, item.version)}
                          disabled={item.quantity <= 1 || isDiscontinued}
                        >
                          <Minus size={16} color={theme.colors.text} />
                        </TouchableOpacity>
                        
                        <ThemedText style={styles.quantity} type="defaultSemiBold">
                          {item.quantity}
                        </ThemedText>
                        
                        {/* Increment Button */}
                        <TouchableOpacity
                          style={[styles.quantityButton, { backgroundColor: theme.colors.surface }]}
                          onPress={() => handleUpdateQuantity(item._id, item.quantity + 1, item.version)}
                          disabled={isDiscontinued || isOutOfStock}
                        >
                          <Plus size={16} color={theme.colors.text} />
                        </TouchableOpacity>

                        {/* Save for later icon button */}
                        <TouchableOpacity
                          style={styles.actionIconButton}
                          onPress={() => handleSaveForLater(item._id)}
                        >
                          <Bookmark size={20} color={theme.colors.textMuted} />
                        </TouchableOpacity>

                        {/* Trash Button */}
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
            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { marginTop: 30 }]}>
              Saved For Later ({savedItems.length})
            </ThemedText>

            {savedItems.length === 0 ? (
              <View style={styles.inlineEmptyState}>
                <Bookmark size={40} color={theme.colors.textMuted} />
                <ThemedText type="default" colorType="textMuted" style={styles.emptyText}>
                  No items saved for later.
                </ThemedText>
              </View>
            ) : (
              savedItems.map((item: any) => {
                const product = item.productId;
                const outOfStock = product && product.stock === 0;
                const discontinued = product && product.isDiscontinued;

                return (
                  <ThemedView
                    key={item._id}
                    style={[styles.bagItem, { backgroundColor: theme.colors.card, opacity: 0.8 }]}
                    colorType="card"
                  >
                    <Image
                      source={{ uri: product?.images[0] || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop" }}
                      style={styles.itemImage}
                    />
                    
                    <ThemedView style={styles.itemInfo} colorType="card">
                      <ThemedText type="default" colorType="textMuted" style={styles.brandName}>
                        {product?.brand}
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.itemName}>
                        {product?.name}
                      </ThemedText>
                      <ThemedText type="default" colorType="textMuted" style={styles.itemSize}>
                        Size: {item.size}
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.itemPrice}>
                        ₹{product?.price}
                      </ThemedText>

                      {/* Stock availability overlays */}
                      {discontinued ? (
                        <Text style={styles.errorText}>Product Discontinued</Text>
                      ) : outOfStock ? (
                        <Text style={styles.errorText}>Out of stock</Text>
                      ) : null}

                      <View style={styles.savedActions}>
                        <TouchableOpacity
                          style={[
                            styles.moveToBagButton, 
                            { borderColor: theme.colors.primary },
                            (discontinued || outOfStock) && styles.disabledMoveButton
                          ]}
                          onPress={() => handleMoveToCart(item._id)}
                          disabled={discontinued || outOfStock}
                        >
                          <ThemedText style={[styles.moveToBagText, { color: theme.colors.primary }]}>
                            MOVE TO BAG
                          </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeSavedButton}
                          onPress={() => handleRemoveItem(item._id)}
                        >
                          <Trash2 size={20} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </ThemedView>
                  </ThemedView>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* FOOTER & PLACE ORDER BUTTON */}
      {activeItems.length > 0 && !isLoading && (
        <ThemedView style={[styles.footer, { borderTopColor: theme.colors.border }]} colorType="card">
          <View style={styles.totalContainer}>
            <ThemedText type="default" colorType="textMuted" style={styles.totalLabel}>
              Total Amount
            </ThemedText>
            <ThemedText type="subtitle" style={styles.totalAmount}>
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
              <ThemedText style={styles.checkoutButtonText} type="defaultSemiBold">
                PLACE ORDER
              </ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>
      )}

      {/* PRICE CHANGE ALERT MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPriceModal}
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AlertTriangle size={48} color="#f0ad4e" style={{ alignSelf: "center", marginBottom: 15 }} />
            <Text style={styles.modalTitle}>Price Change Detected</Text>
            <Text style={styles.modalBody}>
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
          </View>
        </View>
      </Modal>
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
  validationBanner: {
    backgroundColor: "#d9534f",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  validationBannerText: {
    color: "#fff",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
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
    fontSize: 14,
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
  bagItem: {
    flexDirection: "row",
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
    position: "relative",
  },
  invalidItemBorder: {
    borderWidth: 1.5,
    borderColor: "#d9534f",
  },
  itemImage: {
    width: 100,
    height: 130,
  },
  statusOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 100,
    height: 130,
    backgroundColor: "rgba(0,0,0,0.6)",
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
    fontSize: 11,
    marginBottom: 2,
  },
  itemName: {
    fontSize: 14,
    marginBottom: 5,
  },
  itemSize: {
    fontSize: 12,
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 14,
  },
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
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorText: {
    color: "#d9534f",
    fontSize: 12,
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
    fontSize: 14,
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
    fontSize: 11,
    fontWeight: "bold",
  },
  removeSavedButton: {
    marginLeft: "auto",
    padding: 5,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalAmount: {
    fontSize: 18,
  },
  checkoutButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#333",
  },
  modalBody: {
    fontSize: 14,
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
