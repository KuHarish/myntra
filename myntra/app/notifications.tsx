import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Bell,
  Package,
  CreditCard,
  ShoppingBag,
  Tag,
  ChevronLeft,
  Check,
  Trash2,
  Clock,
} from "lucide-react-native";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/src/theme";
import { API_BASE_URL } from "@/constants/Api";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";

type NotificationType = {
  _id: string;
  title: string;
  body: string;
  type: "real-time" | "scheduled";
  status: string;
  isRead: boolean;
  data?: { screen?: string; type?: string };
  createdAt: string;
};

const getNotificationIcon = (data?: { type?: string }) => {
  const type = data?.type || "general";
  switch (type) {
    case "order":
      return Package;
    case "payment":
      return CreditCard;
    case "cart":
      return ShoppingBag;
    case "promo":
      return Tag;
    default:
      return Bell;
  }
};

const getNotificationColor = (data?: { type?: string }) => {
  const type = data?.type || "general";
  switch (type) {
    case "order":
      return "#4CAF50";
    case "payment":
      return "#2196F3";
    case "cart":
      return "#FF9800";
    case "promo":
      return "#E91E63";
    default:
      return "#ff3f6c";
  }
};

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function Notifications() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/notifications/${user._id}`
      );
      setNotifications(res.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await axios.put(`${API_BASE_URL}/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter((n) => !n.isRead)
        .map((n) => n._id);
      await Promise.all(
        unreadIds.map((id) =>
          axios.put(`${API_BASE_URL}/notifications/${id}/read`)
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationPress = (notification: NotificationType) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    if (notification.data?.screen) {
      router.push(notification.data.screen as any);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!user) {
    return (
      <ThemedView style={styles.container} colorType="background">
        <ThemedView
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
          colorType="background"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Notifications
          </ThemedText>
          <View style={styles.headerRight} />
        </ThemedView>
        <ThemedView style={styles.emptyState} colorType="background">
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Bell size={48} color={theme.colors.textMuted} />
          </View>
          <ThemedText
            type="subtitle"
            style={styles.emptyTitle}
            colorType="text"
          >
            Please login to view notifications
          </ThemedText>
          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => router.push("/login")}
          >
            <ThemedText style={styles.loginButtonText} type="defaultSemiBold">
              LOGIN
            </ThemedText>
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
      {/* Header */}
      <ThemedView
        style={[styles.header, { borderBottomColor: theme.colors.border }]}
        colorType="background"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Notifications
        </ThemedText>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Check size={18} color={theme.colors.primary} />
              <ThemedText
                style={[styles.markAllText, { color: theme.colors.primary }]}
                type="default"
              >
                Read all
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>

      {/* Unread count banner */}
      {unreadCount > 0 && (
        <View
          style={[
            styles.unreadBanner,
            { backgroundColor: theme.colors.primary + "15" },
          ]}
        >
          <View
            style={[
              styles.unreadDot,
              { backgroundColor: theme.colors.primary },
            ]}
          />
          <ThemedText
            style={[styles.unreadText, { color: theme.colors.primary }]}
            type="defaultSemiBold"
          >
            {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </ThemedText>
        </View>
      )}

      {notifications.length === 0 ? (
        <ThemedView style={styles.emptyState} colorType="background">
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Bell size={48} color={theme.colors.textMuted} />
          </View>
          <ThemedText
            type="subtitle"
            style={styles.emptyTitle}
            colorType="text"
          >
            No notifications yet
          </ThemedText>
          <ThemedText
            style={styles.emptySubtitle}
            colorType="textMuted"
            type="default"
          >
            We'll notify you about orders, deals & more
          </ThemedText>
        </ThemedView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {notifications.map((notification) => {
            const IconComponent = getNotificationIcon(notification.data);
            const iconColor = getNotificationColor(notification.data);

            return (
              <TouchableOpacity
                key={notification._id}
                style={[
                  styles.notificationItem,
                  {
                    backgroundColor: notification.isRead
                      ? theme.colors.card
                      : theme.colors.primary + "08",
                    borderBottomColor: theme.colors.border,
                  },
                ]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
              >
                {/* Unread indicator */}
                {!notification.isRead && (
                  <View
                    style={[
                      styles.unreadIndicator,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                )}

                {/* Icon */}
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: iconColor + "18" },
                  ]}
                >
                  <IconComponent size={22} color={iconColor} />
                </View>

                {/* Content */}
                <View style={styles.notificationContent}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={[
                      styles.notificationTitle,
                      !notification.isRead && { fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {notification.title}
                  </ThemedText>
                  <ThemedText
                    type="default"
                    colorType="textMuted"
                    style={styles.notificationBody}
                    numberOfLines={2}
                  >
                    {notification.body}
                  </ThemedText>
                  <View style={styles.metaRow}>
                    <Clock size={12} color={theme.colors.textMuted} />
                    <ThemedText
                      colorType="textMuted"
                      style={styles.timeText}
                      type="default"
                    >
                      {formatTimeAgo(notification.createdAt)}
                    </ThemedText>
                    {notification.type === "scheduled" && (
                      <View
                        style={[
                          styles.typeBadge,
                          { backgroundColor: theme.colors.warning + "20" },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.typeBadgeText,
                            { color: theme.colors.warning },
                          ]}
                          type="default"
                        >
                          Scheduled
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    textAlign: "center",
    flex: 1,
  },
  headerRight: {
    width: 80,
    alignItems: "flex-end",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markAllText: {
    fontSize: 13,
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  unreadText: {
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderBottomWidth: 1,
    position: "relative",
  },
  unreadIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    marginBottom: 3,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
  typeBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    fontSize: 14,
  },
  loginButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  bottomPadding: {
    height: 30,
  },
});
