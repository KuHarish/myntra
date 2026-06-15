import { createContext, useContext, useEffect, useState } from "react";
import { getUserData, saveUserData, clearUserData } from "@/utils/storage";
import React from "react";
import axios from "axios";
import { API_BASE_URL } from "@/constants/Api";

type UserType = {
  _id: string;
  name: string;
  email: string;
  role: string;
  token: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  user: UserType | null;
  isLoading: boolean;
  Signup: (fullName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUserData();
        if (data._id && data.name && data.email) {
          setUser({
            _id: data._id,
            name: data.name,
            email: data.email,
            role: data.role || "user",
            token: data.token || "",
          });
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Error rehydrating user session:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API_BASE_URL}/user/login`, {
      email,
      password,
    });

    const data = await res.data.user;
    if (data.fullName) {
      const role = data.role || "user";
      const token = data.token || "";
      await saveUserData(data._id, data.fullName, data.email, role, token);
      setUser({
        _id: data._id,
        name: data.fullName,
        email: data.email,
        role: role,
        token: token,
      });
      setIsAuthenticated(true);
    } else {
      throw new Error(data.message || "Login failed");
    }
  };

  const Signup = async (fullName: string, email: string, password: string) => {
    const res = await axios.post(`${API_BASE_URL}/user/signup`, {
      fullName,
      email,
      password,
    });
    const data = await res.data.user;
    if (data.fullName) {
      const role = data.role || "user";
      const token = data.token || "";
      await saveUserData(data._id, data.fullName, data.email, role, token);
      setUser({
        _id: data._id,
        name: data.fullName,
        email: data.email,
        role: role,
        token: token,
      });
      setIsAuthenticated(true);
    } else {
      throw new Error(data.message || "Login failed");
    }
  };

  const logout = async () => {
    await clearUserData();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, isLoading, Signup, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
