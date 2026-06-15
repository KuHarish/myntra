import * as SecureStore from "expo-secure-store";

// Determine if SecureStore functions are available (web may not support them)
const isWeb = typeof document !== "undefined" && typeof document.createElement === "function";
const hasSecureStore = !isWeb && SecureStore && typeof SecureStore.setItemAsync === "function" && typeof SecureStore.getItemAsync === "function";

export const saveUserData = async (
  _id: string,
  name: string,
  email: string,
  role: string,
  token: string
) => {
  if (hasSecureStore) {
    await SecureStore.setItemAsync("userid", _id);
    await SecureStore.setItemAsync("userName", name);
    await SecureStore.setItemAsync("userEmail", email);
    await SecureStore.setItemAsync("userRole", role);
    await SecureStore.setItemAsync("userToken", token);
  } else {
    // Fallback to browser localStorage
    localStorage.setItem("userid", _id);
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userRole", role);
    localStorage.setItem("userToken", token);
  }
};

export const getUserData = async () => {
  if (hasSecureStore) {
    const _id = await SecureStore.getItemAsync("userid");
    const name = await SecureStore.getItemAsync("userName");
    const email = await SecureStore.getItemAsync("userEmail");
    const role = await SecureStore.getItemAsync("userRole");
    const token = await SecureStore.getItemAsync("userToken");
    return { _id, name, email, role, token };
  } else {
    const _id = localStorage.getItem("userid");
    const name = localStorage.getItem("userName");
    const email = localStorage.getItem("userEmail");
    const role = localStorage.getItem("userRole");
    const token = localStorage.getItem("userToken");
    return { _id, name, email, role, token };
  }
};

export const clearUserData = async () => {
  if (hasSecureStore) {
    await SecureStore.deleteItemAsync("userid");
    await SecureStore.deleteItemAsync("userName");
    await SecureStore.deleteItemAsync("userEmail");
    await SecureStore.deleteItemAsync("userRole");
    await SecureStore.deleteItemAsync("userToken");
  } else {
    localStorage.removeItem("userid");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userToken");
  }
};
