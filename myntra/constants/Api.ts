import { Platform } from "react-native";

// Detect if we are running in a browser
const isWeb = Platform.OS === "web";

// Use local machine IP for emulators/devices, localhost for web
export const API_BASE_URL = isWeb 
  ? "http://localhost:5000" 
  : "http://192.168.31.23:5000";
