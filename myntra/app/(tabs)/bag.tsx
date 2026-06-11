import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ShoppingBag, Minus, Plus, Trash2 } from "lucide-react-native";
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
  const [bag, setbag] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchproduct();
  }, [user]);

  const fetchproduct = async () => {
    if (user) {
      try {
        setIsLoading(true);
        const bag = await axios.get(
          `${API_BASE_URL}/bag/${user._id}`
        );
        setbag(bag.data);
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handledelete = async (itemid: any) => {
    try {
      await axios.delete(`${API_BASE_URL}/bag/${itemid}`);
      fetchproduct();
    } catch (error) {
      console.log(error);
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

  if (isLoading) {
    return (
      <ThemedView style={styles.loaderContainer} colorType="background">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ThemedView>
    );
  }

  const total = bag?.reduce(
    (sum: any, item: any) => sum + item.productId.price * item.quantity,
    0
  );

  return (
    <ThemedView style={styles.container} colorType="background">
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <ThemedText type="title" style={styles.headerTitle}>Shopping Bag</ThemedText>
      </ThemedView>

      <ScrollView style={styles.content}>
        {bag?.map((item: any) => (
          <ThemedView
            key={item._id}
            style={[styles.bagItem, { backgroundColor: theme.colors.card, shadowColor: theme.colors.text }]}
            colorType="card"
          >
            <Image
              source={{ uri: item.productId.images[0] }}
              style={styles.itemImage}
            />
            <ThemedView style={styles.itemInfo} colorType="card">
              <ThemedText type="default" colorType="textMuted" style={styles.brandName}>{item.productId.brand}</ThemedText>
              <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.itemName}>{item.productId.name}</ThemedText>
              <ThemedText type="default" colorType="textMuted" style={styles.itemSize}>Size: {item.size}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.itemPrice}>₹{item.productId.price}</ThemedText>

              <View style={styles.quantityContainer}>
                <TouchableOpacity style={[styles.quantityButton, { backgroundColor: theme.colors.surface }]}>
                  <Minus size={18} color={theme.colors.text} />
                </TouchableOpacity>
                <ThemedText style={styles.quantity} type="defaultSemiBold">{item.quantity}</ThemedText>
                <TouchableOpacity style={[styles.quantityButton, { backgroundColor: theme.colors.surface }]}>
                  <Plus size={18} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeButton} onPress={() => handledelete(item._id)}>
                  <Trash2 size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </ThemedView>
          </ThemedView>
        ))}
      </ScrollView>

      <ThemedView style={[styles.footer, { borderTopColor: theme.colors.border }]} colorType="card">
        <View style={styles.totalContainer}>
          <ThemedText type="default" colorType="textMuted" style={styles.totalLabel}>Total Amount</ThemedText>
          <ThemedText type="subtitle" style={styles.totalAmount}>₹{total}</ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.checkoutButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push("/checkout")}
        >
          <ThemedText style={styles.checkoutButtonText} type="defaultSemiBold">PLACE ORDER</ThemedText>
        </TouchableOpacity>
      </ThemedView>
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
  content: {
    flex: 1,
    padding: 15,
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
  },
  itemImage: {
    width: 100,
    height: 120,
  },
  itemInfo: {
    flex: 1,
    padding: 15,
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
  itemPrice: {
    fontSize: 14,
    marginBottom: 10,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  quantity: {
    marginHorizontal: 15,
    fontSize: 15,
  },
  removeButton: {
    marginLeft: "auto",
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
});
