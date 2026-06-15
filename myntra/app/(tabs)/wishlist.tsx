import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Heart, Trash2 } from "lucide-react-native";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/src/theme";
import { API_BASE_URL } from "@/constants/Api";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { resolveImageUri } from "@/utils/image";

export default function Wishlist() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [wishlist, setwishlist] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchproduct();
  }, [user]);

  const fetchproduct = async () => {
    if (user) {
      try {
        setIsLoading(true);
        const bag = await axios.get(
          `${API_BASE_URL}/wishlist/${user._id}`
        );
        setwishlist(bag.data);
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
      await axios.delete(`${API_BASE_URL}/wishlist/${itemid}`);
      fetchproduct();
    } catch (error) {
      console.log(error);
    }
  };

  if (!user) {
    return (
      <ThemedView style={styles.container} colorType="background">
        <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
          <ThemedText type="title" style={styles.headerTitle}>Wishlist</ThemedText>
        </ThemedView>
        <ThemedView style={styles.emptyState} colorType="background">
          <Heart size={64} color={theme.colors.primary} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            Please login to view your wishlist
          </ThemedText>
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

  return (
    <ThemedView style={styles.container} colorType="background">
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <ThemedText type="title" style={styles.headerTitle}>Wishlist</ThemedText>
      </ThemedView>

      <ScrollView style={styles.content}>
        {wishlist?.map((item: any) => {
          if (!item.productId || typeof item.productId !== "object") return null;
          return (
            <ThemedView
              key={item._id}
              style={[styles.wishlistItem, { backgroundColor: theme.colors.card, shadowColor: theme.colors.text }]}
              colorType="card"
            >
              <Image
                source={{
                  uri: item.productId.images?.[0] ||
                    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop"
                }}
                style={styles.itemImage}
              />
              <ThemedView style={styles.itemInfo} colorType="card">
                <ThemedText type="default" colorType="textMuted" style={styles.brandName}>{item.productId.brand}</ThemedText>
                <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.itemName}>{item.productId.name}</ThemedText>
                <View style={styles.priceContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.price}>{item.productId.price}</ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: theme.colors.primary }}>{item.productId.discount}</ThemedText>
                </View>
              </ThemedView>
              <TouchableOpacity style={styles.removeButton} onPress={() => handledelete(item._id)}>
                <Trash2 size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            </ThemedView>
          );
        })}
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
  wishlistItem: {
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
    marginBottom: 5,
  },
  itemName: {
    fontSize: 14,
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: {
    fontSize: 14,
    marginRight: 10,
  },
  removeButton: {
    padding: 15,
    justifyContent: "center",
  },
});
