import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, View, TextInput, Alert } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/ThemedButton";
import { useTheme } from "@/src/theme";
import { API_BASE_URL } from "@/constants/Api";
import axios from "axios";

export default function AddProduct() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { theme } = useTheme();

  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const res = await axios.get(`${API_BASE_URL}/category`);
      const cats = res.data || [];
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategory(cats[0]._id);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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
    if (!name.trim() || !brand.trim() || !description.trim() || !selectedCategory || !price.trim() || !stock.trim() || !imageUrl.trim()) {
      Alert.alert("Validation Error", "All fields are required.");
      return;
    }

    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal <= 0) {
      Alert.alert("Validation Error", "Price must be a positive number.");
      return;
    }

    const stockVal = parseInt(stock, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      Alert.alert("Validation Error", "Stock must be a non-negative number.");
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
        price: priceVal,
        stock: stockVal,
        images: [imageUrl.trim()],
      };

      await axios.post(`${API_BASE_URL}/admin/products`, payload, config);
      Alert.alert("Success", "Product added successfully!", [
        { text: "OK", onPress: () => router.push("/admin/products") }
      ]);
    } catch (error: any) {
      console.error("Error creating product:", error);
      Alert.alert("Error", error?.response?.data?.message || "Could not add product.");
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
        <ThemedText type="subtitle" style={styles.headerTitle}>Add Product</ThemedText>
      </ThemedView>

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
        {isLoadingCategories ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
        ) : (
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
        )}

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Price (₹)</ThemedText>
            <TextInput
              style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="e.g. 799"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          <View style={styles.halfInput}>
            <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Stock Units</ThemedText>
            <TextInput
              style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="e.g. 150"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
          </View>
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
          title="Create Product"
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>
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
  loader: {
    marginVertical: 12,
    alignSelf: 'flex-start',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  submitButton: {
    height: 48,
    marginTop: 32,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
