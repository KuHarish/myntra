import * as SecureStore from "expo-secure-store";

// Determine if SecureStore functions are available (web may not support them)
const isWeb = typeof document !== "undefined" && typeof document.createElement === "function";
const hasSecureStore = !isWeb && SecureStore && typeof SecureStore.setItemAsync === "function" && typeof SecureStore.getItemAsync === "function";

export const saveUserData = async (
  _id: string,
  name: string,
  email: string
) => {
  if (hasSecureStore) {
    await SecureStore.setItemAsync("userid", _id);
    await SecureStore.setItemAsync("userName", name);
    await SecureStore.setItemAsync("userEmail", email);
  } else {
    // Fallback to browser localStorage
    localStorage.setItem("userid", _id);
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
  }
};

export const getUserData = async () => {
  if (hasSecureStore) {
    const _id = await SecureStore.getItemAsync("userid");
    const name = await SecureStore.getItemAsync("userName");
    const email = await SecureStore.getItemAsync("userEmail");
    return { _id, name, email };
  } else {
    const _id = localStorage.getItem("userid");
    const name = localStorage.getItem("userName");
    const email = localStorage.getItem("userEmail");
    return { _id, name, email };
  }
};

export const clearUserData = async () => {
  if (hasSecureStore) {
    await SecureStore.deleteItemAsync("userid");
    await SecureStore.deleteItemAsync("userName");
    await SecureStore.deleteItemAsync("userEmail");
  } else {
    localStorage.removeItem("userid");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
  }
};
