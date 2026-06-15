import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { getRecentlyViewed, syncRecentlyViewed, ViewedProduct } from "../utils/recentlyViewed";
import { useAuth } from "../context/AuthContext";
import { resolveImageUri } from "../utils/image";

const RecentlyViewedSection: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<ViewedProduct[]>([]);

  // Load local data and sync on mount / user change
  useEffect(() => {
    const load = async () => {
      const local = await getRecentlyViewed();
      
      // Cleanup stale/broken cached image URLs
      const cleanedLocal = local.map(item => {
        let img = item.image;
        if (img) {
          if (img.includes("photo-1583391733956-6c78276477e1")) {
            img = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop";
          } else if (img.includes("photo-1618244972963-dbad0c4abf18")) {
            img = "http://localhost:5000/uploads/ribbed_knit_co_ord.png";
          } else if (img.includes("photo-1594938298603-c8148c4b4c0a")) {
            img = "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=500&auto=format&fit=crop";
          } else if (img.includes("photo-1586495777744-4e6232bf2f31")) {
            img = "https://images.unsplash.com/photo-1625093742435-6fa192b6fb10?w=500&auto=format&fit=crop";
          } else if (img.includes("jacket.jpg")) {
            img = "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop";
          }
        }
        return { ...item, image: img };
      });

      setItems(cleanedLocal);
      if (user?._id) {
        await syncRecentlyViewed(user._id);
        const refreshed = await getRecentlyViewed();
        
        // Cleanup refreshed server items too in case of stale DB sync
        const cleanedRefreshed = refreshed.map(item => {
          let img = item.image;
          if (img) {
            if (img.includes("photo-1583391733956-6c78276477e1")) {
              img = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop";
            } else if (img.includes("photo-1618244972963-dbad0c4abf18")) {
              img = "http://localhost:5000/uploads/ribbed_knit_co_ord.png";
            } else if (img.includes("photo-1594938298603-c8148c4b4c0a")) {
              img = "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=500&auto=format&fit=crop";
            } else if (img.includes("photo-1586495777744-4e6232bf2f31")) {
              img = "https://images.unsplash.com/photo-1625093742435-6fa192b6fb10?w=500&auto=format&fit=crop";
            } else if (img.includes("jacket.jpg")) {
              img = "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&auto=format&fit=crop";
            }
          }
          return { ...item, image: img };
        });
        
        setItems(cleanedRefreshed);
      }
    };
    load();
  }, [user]);

  const renderItem = ({ item }: { item: ViewedProduct }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${item.productId}`)}
    >
      <Image
        source={{
          uri: resolveImageUri(item.image)
        }}
        style={styles.image}
      />
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.price}>₹{item.price}</Text>
    </TouchableOpacity>
  );

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recently Viewed</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.productId}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 15 },
  header: { marginHorizontal: 15, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "bold", color: "#3e3e3e" },
  list: { paddingHorizontal: 10 },
  card: { width: 120, marginRight: 12 },
  image: { width: 120, height: 120, borderRadius: 8, marginBottom: 5 },
  name: { fontSize: 14, color: "#3e3e3e" },
  price: { fontSize: 14, color: "#ff3f6c", fontWeight: "500" },
});

export default RecentlyViewedSection;
