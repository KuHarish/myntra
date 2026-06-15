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
      setItems(local);
      if (user?._id) {
        await syncRecentlyViewed(user._id);
        const refreshed = await getRecentlyViewed();
        setItems(refreshed);
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
