import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, View, TextInput, Alert } from "react-native";
import { useRouter, Redirect, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { useTheme } from "@/src/theme";
import { API_BASE_URL } from "@/constants/Api";
import axios from "axios";

export default function EditProduct() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    if (!id || !user) return;
    try {
      setIsLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };

      const prodRes = await axios.get(`${API_BASE_URL}/admin/products/${id}`, config);
      const catRes = await axios.get(`${API_BASE_URL}/category`);

      const product = prodRes.data;
      if (product) {
        setName(product.name || "");
        setBrand(product.brand || "");
        setDescription(product.description || "");
        setSelectedCategory(product.categories?.[0] || "");
        setImageUrl(product.images?.[0] || "");
      }

      setCategories(catRes.data || []);
    } catch (error) {
      console.error("Error fetching product data:", error);
      Alert.alert("Error", "Could not fetch product details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, user]);

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

  const handleSubmit = async () => {
    if (!name.trim() || !brand.trim() || !description.trim() || !selectedCategory || !imageUrl.trim()) {
      Alert.alert("Validation Error", "All fields are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
      };

      const payload = {
        name: name.trim(),
        brand: brand.trim(),
        description: description.trim(),
        category: selectedCategory,
        images: [imageUrl.trim()],
      };

      await axios.put(`${API_BASE_URL}/admin/products/${id}`, payload, config);
      Alert.alert("Success", "Product updated successfully!", [
        { text: "OK", onPress: () => router.push("/admin/products") }
      ]);
    } catch (error: any) {
      console.error("Error updating product:", error);
      Alert.alert("Error", error?.response?.data?.message || "Could not update product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container} colorType="background">
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>Edit Product</ThemedText>
      </ThemedView>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Brand Name</ThemedText>
          <TextInput
            style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="e.g. Nike, H&M"
            placeholderTextColor={theme.colors.textMuted}
            value={brand}
            onChangeText={setBrand}
          />

          <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Product Name</ThemedText>
          <TextInput
            style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="e.g. Cotton Slim Fit Shirt"
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Description</ThemedText>
          <TextInput
            style={[styles.textAreaInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Enter product specifications and details..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Category</ThemedText>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={[
                  styles.categoryChip,
                  { borderColor: theme.colors.border },
                  selectedCategory === cat._id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => setSelectedCategory(cat._id)}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.categoryChipText, selectedCategory === cat._id && { color: "#ffffff" }]}
                >
                  {cat.name.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Image URL</ThemedText>
          <TextInput
            style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Paste high-res image address"
            placeholderTextColor={theme.colors.textMuted}
            value={imageUrl}
            onChangeText={setImageUrl}
          />

          <ThemedButton
            title="Save Changes"
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </ScrollView>
      )}
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  textAreaInput: {
    height: 96,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  submitButton: {
    height: 48,
    marginTop: 32,
  },
});
