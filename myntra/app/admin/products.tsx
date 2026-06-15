import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, View, Image, TextInput, Alert, Modal, Text } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { ArrowLeft, Search, Edit3, ShieldAlert, Archive, CheckCircle, RefreshCcw, X } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { useTheme } from "@/src/theme";
import { API_BASE_URL } from "@/constants/Api";
import { resolveImageUri } from "@/utils/image";
import axios from "axios";

export default function AdminProductsList() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { theme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [modalType, setModalType] = useState<"stock" | "price" | "status" | null>(null);
  const [modalInputValue, setModalInputValue] = useState("");

  const fetchProducts = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      const res = await axios.get(`${API_BASE_URL}/admin/products`, config);
      setProducts(res.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", "Could not fetch products.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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

  const handleOpenModal = (product: any, type: "stock" | "price" | "status") => {
    setActiveProduct(product);
    setModalType(type);
    if (type === "stock") {
      setModalInputValue(product.stock.toString());
    } else if (type === "price") {
      setModalInputValue(product.price.toString());
    } else if (type === "status") {
      setModalInputValue(product.status);
    }
  };

  const handleCloseModal = () => {
    setActiveProduct(null);
    setModalType(null);
    setModalInputValue("");
  };

  const handleUpdateStock = async () => {
    if (!activeProduct) return;
    const value = parseInt(modalInputValue, 10);
    if (isNaN(value) || value < 0) {
      Alert.alert("Validation Error", "Stock must be a non-negative integer.");
      return;
    }

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      await axios.patch(`${API_BASE_URL}/admin/products/${activeProduct._id}/stock`, { stock: value }, config);
      Alert.alert("Success", "Stock updated successfully.");
      fetchProducts();
      handleCloseModal();
    } catch (error: any) {
      console.error("Error updating stock:", error);
      Alert.alert("Error", error?.response?.data?.message || "Could not update stock.");
    }
  };

  const handleUpdatePrice = async () => {
    if (!activeProduct) return;
    const value = parseFloat(modalInputValue);
    if (isNaN(value) || value <= 0) {
      Alert.alert("Validation Error", "Price must be a positive number.");
      return;
    }

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      await axios.patch(`${API_BASE_URL}/admin/products/${activeProduct._id}/price`, { price: value }, config);
      Alert.alert("Success", "Price updated successfully.");
      fetchProducts();
      handleCloseModal();
    } catch (error: any) {
      console.error("Error updating price:", error);
      Alert.alert("Error", error?.response?.data?.message || "Could not update price.");
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!activeProduct) return;
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };
      await axios.patch(`${API_BASE_URL}/admin/products/${activeProduct._id}/status`, { status }, config);
      Alert.alert("Success", `Status updated to ${status} successfully.`);
      fetchProducts();
      handleCloseModal();
    } catch (error: any) {
      console.error("Error updating status:", error);
      Alert.alert("Error", error?.response?.data?.message || "Could not update status.");
    }
  };

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.brand && p.brand.toLowerCase().includes(query))
    );
  });

  const getStatusBadgeStyles = (status: string) => {
    if (status === "active") {
      return { backgroundColor: "#e8f8f0", color: "#2ecc71" };
    } else if (status === "discontinued") {
      return { backgroundColor: "#fdf0ed", color: "#e74c3c" };
    }
    return { backgroundColor: "#f5f5f5", color: "#7f8c8d" };
  };

  return (
    <ThemedView style={styles.container} colorType="background">
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>Manage Products</ThemedText>
      </ThemedView>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search products by brand or name..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText colorType="textMuted">No products found matching filters.</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {filteredProducts.map((p) => {
            const badge = getStatusBadgeStyles(p.status);
            return (
              <ThemedView
                key={p._id}
                style={[styles.productCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                colorType="card"
              >
                <View style={styles.productTop}>
                  <Image source={{ uri: resolveImageUri(p.images?.[0]) }} style={styles.productImage} />
                  <View style={styles.productDetails}>
                    <ThemedText type="default" colorType="textMuted" style={styles.brandName}>{p.brand}</ThemedText>
                    <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.productName}>{p.name}</ThemedText>
                    <ThemedText type="defaultSemiBold" style={[styles.priceText, { color: theme.colors.primary }]}>
                      ₹{p.price}
                    </ThemedText>

                    <View style={styles.statusRow}>
                      <View style={[styles.badgeContainer, { backgroundColor: badge.backgroundColor }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{p.status.toUpperCase()}</Text>
                      </View>
                      <ThemedText type="default" colorType="textMuted" style={styles.stockText}>
                        Stock: {p.stock} units
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Card Actions */}
                <View style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/admin/edit-product?id=${p._id}`)}
                  >
                    <Edit3 size={16} color={theme.colors.text} />
                    <ThemedText type="defaultSemiBold" style={styles.actionText}>Edit</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleOpenModal(p, "stock")}
                  >
                    <RefreshCcw size={16} color={theme.colors.text} />
                    <ThemedText type="defaultSemiBold" style={styles.actionText}>Stock</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleOpenModal(p, "price")}
                  >
                    <RefreshCcw size={16} color={theme.colors.text} />
                    <ThemedText type="defaultSemiBold" style={styles.actionText}>Price</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleOpenModal(p, "status")}
                  >
                    <ShieldAlert size={16} color={theme.colors.text} />
                    <ThemedText type="defaultSemiBold" style={styles.actionText}>Status</ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            );
          })}
        </ScrollView>
      )}

      {/* Adjustment Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalType !== null}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} colorType="card">
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">
                {modalType === "stock" && "Update Stock"}
                {modalType === "price" && "Update Price"}
                {modalType === "status" && "Update Status"}
              </ThemedText>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {activeProduct && (
              <ThemedText type="defaultSemiBold" style={styles.modalProductName}>
                {activeProduct.brand} - {activeProduct.name}
              </ThemedText>
            )}

            {modalType === "status" ? (
              <View style={styles.statusOptions}>
                {(["active", "inactive", "discontinued"] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusSelectCard,
                      { borderColor: theme.colors.border },
                      modalInputValue === st && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => handleUpdateStatus(st)}
                  >
                    <ThemedText
                      type="defaultSemiBold"
                      style={[styles.statusSelectText, modalInputValue === st && { color: "#ffffff" }]}
                    >
                      {st.toUpperCase()}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View>
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                  <TextInput
                    style={[styles.modalInput, { color: theme.colors.text, borderColor: theme.colors.border, paddingRight: 40 }]}
                    keyboardType="numeric"
                    value={modalInputValue}
                    onChangeText={setModalInputValue}
                    placeholder={modalType === "stock" ? "Enter units" : "Enter amount in ₹"}
                    placeholderTextColor={theme.colors.textMuted}
                    selectTextOnFocus={true}
                  />
                  {modalInputValue.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setModalInputValue("")}
                      style={{ position: 'absolute', right: 12, top: 14 }}
                    >
                      <X size={18} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <ThemedButton
                  title="Save Adjustment"
                  onPress={modalType === "stock" ? handleUpdateStock : handleUpdatePrice}
                  style={styles.modalSaveButton}
                />
              </View>
            )}
          </ThemedView>
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
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  productCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  productTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 11,
    marginBottom: 2,
  },
  productName: {
    fontSize: 14,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 15,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeContainer: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  stockText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  actionText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalProductName: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  modalSaveButton: {
    height: 48,
  },
  statusOptions: {
    gap: 12,
  },
  statusSelectCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusSelectText: {
    fontSize: 13,
  },
});
