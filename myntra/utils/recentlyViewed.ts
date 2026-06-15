import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

/**
 * Interface representing a viewed product stored locally and displayed in the UI.
 */
export interface ViewedProduct {
  productId: string;
  name: string;
  price: number;
  image: string;
  viewedAt: string; // ISO string
  rating?: number;  // Display rating
}

import { API_BASE_URL } from "../constants/Api";

const STORAGE_KEY = "recently_viewed_products";
const API_BASE = `${API_BASE_URL}/recently-viewed`; // matches backend route
const MAX_ITEMS = 50;

/**
 * Helper function to map server-side populated responses to the local ViewedProduct interface.
 */
const mapServerItemToLocal = (serverItem: any): ViewedProduct => {
  const isPopulated = serverItem.productId && typeof serverItem.productId === "object";
  const prodId = isPopulated ? serverItem.productId._id : serverItem.productId;
  const name = isPopulated ? serverItem.productId.name : (serverItem.name || "");
  const price = isPopulated ? serverItem.productId.price : (serverItem.price || 0);
  const image = isPopulated ? (serverItem.productId.images?.[0] || "") : (serverItem.image || "");
  
  return {
    productId: prodId,
    name,
    price: Number(price),
    image,
    viewedAt: serverItem.viewedAt || serverItem.createdAt || new Date().toISOString(),
    rating: serverItem.rating || 4.2, // Default rating fallback if not in DB
  };
};

/** Retrieve the locally stored recently viewed list */
export async function getRecentlyViewed(): Promise<ViewedProduct[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      const items = JSON.parse(json) as ViewedProduct[];
      return items.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
    }
    return [];
  } catch (e) {
    console.error("Error reading recently viewed from storage", e);
    return [];
  }
}

/** Add a product to the local list and notify the backend if a user is logged in */
export async function addRecentlyViewed(
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
  },
  userId?: string
): Promise<void> {
  try {
    const current = await getRecentlyViewed();
    const newEntry: ViewedProduct = {
      productId: product._id,
      name: product.name,
      price: Number(product.price),
      image: product.images?.[0] ?? "",
      viewedAt: new Date().toISOString(),
      rating: 4.2, // Default visual rating
    };

    // Prepend, remove duplicate, slice to max 10
    const merged = [newEntry, ...current.filter(p => p.productId !== newEntry.productId)];
    const trimmed = merged.slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    // If user is authenticated, sync with the server
    if (userId) {
      await axios.post(
        API_BASE,
        { productId: newEntry.productId },
        { headers: { "x-user-id": userId } }
      );
    }
  } catch (e) {
    console.error("Failed to add recently viewed", e);
  }
}

/** Sync local list with the server for a given user */
export async function syncRecentlyViewed(userId: string): Promise<void> {
  if (!userId) return;
  try {
    // Fetch server list
    const { data: serverItems }: { data: any[] } = await axios.get(
      `${API_BASE}/${userId}`
    );

    const mappedServer = serverItems.map(mapServerItemToLocal);
    const local = await getRecentlyViewed();

    // Create a map of server details to override local stale details (like broken/old images)
    const serverMap = new Map<string, ViewedProduct>();
    mappedServer.forEach(s => serverMap.set(s.productId, s));

    // Merge: map by productId, keep the newer viewedAt, but use fresh server details
    const map = new Map<string, ViewedProduct>();
    [...mappedServer, ...local].forEach(item => {
      const existing = map.get(item.productId);
      const serverDetails = serverMap.get(item.productId);
      
      const mergedItem = {
        ...item,
        // Always override visual details with server data if available
        name: serverDetails ? serverDetails.name : item.name,
        price: serverDetails ? serverDetails.price : item.price,
        image: serverDetails ? serverDetails.image : item.image,
      };

      if (!existing || new Date(mergedItem.viewedAt) > new Date(existing.viewedAt)) {
        map.set(item.productId, mergedItem);
      }
    });

    const merged = Array.from(map.values())
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
      .slice(0, MAX_ITEMS);

    // Save merged list locally
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

    // Send bulk sync to backend
    const syncPayload = merged.map(item => ({
      productId: item.productId,
      viewedAt: item.viewedAt,
    }));
    await axios.post(
      `${API_BASE}/sync`,
      { items: syncPayload },
      { headers: { "x-user-id": userId } }
    );
  } catch (e) {
    console.error("Failed to sync recently viewed", e);
  }
}
