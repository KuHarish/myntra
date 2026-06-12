import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  ScrollView,
  Animated,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Download,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  CreditCard,
  RefreshCw,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/src/theme";
import { API_BASE_URL } from "@/constants/Api";
import axios from "axios";

interface Transaction {
  _id: string;
  transactionId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  gateway?: string;
  gatewayTransactionId?: string;
  gatewayResponseCode?: string;
  paymentMethod: string;
  status: "Created" | "Paid" | "Failed" | "Refunded" | "Cancelled";
  dateTime: string;
}

export default function Transactions() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();

  // State Management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 15; // 15 records per page

  // Search State
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // Submitted search query

  // Filter States
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [dateRange, setDateRange] = useState<string>("all"); // "all", "30", "90", "180"

  // Temporary filter states for modal inputs before hitting Apply
  const [tempStatus, setTempStatus] = useState<string>("");
  const [tempMethod, setTempMethod] = useState<string>("");
  const [tempMinAmount, setTempMinAmount] = useState("");
  const [tempMaxAmount, setTempMaxAmount] = useState("");
  const [tempDateRange, setTempDateRange] = useState<string>("all");

  // Sorting States
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState("dateTime");
  const [sortOrder, setSortOrder] = useState("desc");

  // Skeleton Animation Value
  const skeletonAnim = useRef(new Animated.Value(0.3)).current;

  // Pulse effect for loading skeleton
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (loading) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      skeletonAnim.setValue(0.3);
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [loading]);

  // Fetch Transactions from API
  const fetchTransactions = useCallback(async (pageToFetch = currentPage, isRefresh = false) => {
    if (!user) return;

    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      // Build Date Range
      let startDateStr = "";
      let endDateStr = "";
      if (dateRange !== "all") {
        const end = new Date();
        const start = new Date();
        const days = parseInt(dateRange, 10);
        start.setDate(end.getDate() - days);
        startDateStr = start.toISOString();
        endDateStr = end.toISOString();
      }

      // API Request
      const response = await axios.get(`${API_BASE_URL}/transactions`, {
        params: {
          userId: user._id,
          page: pageToFetch,
          limit,
          status: selectedStatus || undefined,
          paymentMethod: selectedMethod || undefined,
          minAmount: minAmount || undefined,
          maxAmount: maxAmount || undefined,
          startDate: startDateStr || undefined,
          endDate: endDateStr || undefined,
          search: searchQuery || undefined,
          sortBy,
          sortOrder,
        },
      });

      if (response.data && response.data.success) {
        setTransactions(response.data.data);
        setCurrentPage(response.data.pagination.currentPage);
        setTotalPages(response.data.pagination.totalPages);
        setTotalRecords(response.data.pagination.totalRecords);
      } else {
        setError("Failed to retrieve transactions.");
      }
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      setError(err?.response?.data?.message || "Something went wrong while connecting to the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedStatus, selectedMethod, minAmount, maxAmount, dateRange, searchQuery, sortBy, sortOrder]);

  // Initial Fetch & Update on dependencies
  useEffect(() => {
    if (user) {
      fetchTransactions(1);
    }
  }, [selectedStatus, selectedMethod, minAmount, maxAmount, dateRange, searchQuery, sortBy, sortOrder, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions(1, true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchTransactions(newPage);
    }
  };

  // Filter application helpers
  const openFilterModal = () => {
    setTempStatus(selectedStatus);
    setTempMethod(selectedMethod);
    setTempMinAmount(minAmount);
    setTempMaxAmount(maxAmount);
    setTempDateRange(dateRange);
    setIsFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSelectedStatus(tempStatus);
    setSelectedMethod(tempMethod);
    setMinAmount(tempMinAmount);
    setMaxAmount(tempMaxAmount);
    setDateRange(tempDateRange);
    setIsFilterModalVisible(false);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setTempStatus("");
    setTempMethod("");
    setTempMinAmount("");
    setTempMaxAmount("");
    setTempDateRange("all");
    
    setSelectedStatus("");
    setSelectedMethod("");
    setMinAmount("");
    setMaxAmount("");
    setDateRange("all");
    setSearchText("");
    setSearchQuery("");
    
    setIsFilterModalVisible(false);
    setCurrentPage(1);
  };

  const activeFilterCount = [
    selectedStatus !== "",
    selectedMethod !== "",
    minAmount !== "",
    maxAmount !== "",
    dateRange !== "all",
    searchQuery !== "",
  ].filter(Boolean).length;

  // Sorting application
  const applySort = (field: string, order: string) => {
    setSortBy(field);
    setSortOrder(order);
    setIsSortModalVisible(false);
    setCurrentPage(1);
  };

  // Download Receipt helper - works on both web and native
  const downloadReceipt = async (transactionId: string) => {
    try {
      const url = `${API_BASE_URL}/transactions/${transactionId}/receipt?userId=${user?._id}`;
      // On web, directly open in new tab. On native, use Linking.
      if (typeof window !== "undefined" && window.open) {
        window.open(url, "_blank");
      } else {
        Linking.openURL(url);
      }
    } catch (err) {
      console.error("Receipt download error:", err);
      Alert.alert("Error", "Something went wrong initiating the PDF download.");
    }
  };

  // Export CSV helper
  const exportTransactions = async () => {
    try {
      let startDateStr = "";
      let endDateStr = "";
      if (dateRange !== "all") {
        const end = new Date();
        const start = new Date();
        const days = parseInt(dateRange, 10);
        start.setDate(end.getDate() - days);
        startDateStr = start.toISOString();
        endDateStr = end.toISOString();
      }

      const params = new URLSearchParams({
        userId: user?._id || "",
        status: selectedStatus,
        paymentMethod: selectedMethod,
        minAmount,
        maxAmount,
        startDate: startDateStr,
        endDate: endDateStr,
        search: searchQuery,
        sortBy,
        sortOrder,
      });

      const url = `${API_BASE_URL}/transactions/export?${params.toString()}`;
      // On web, directly open in new tab. On native, use Linking.
      if (typeof window !== "undefined" && window.open) {
        window.open(url, "_blank");
      } else {
        Linking.openURL(url);
      }
    } catch (err) {
      console.error("CSV export error:", err);
      Alert.alert("Error", "Failed to initiate CSV export.");
    }
  };

  // Layout Rendering for Single Transaction Row
  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const formattedDate = new Date(item.dateTime).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Color Badges Configuration
    let badgeBg = "#f1f3f4";
    let badgeText = "#606468";
    let statusIcon = <AlertCircle size={13} color="#606468" style={{ marginRight: 4 }} />;

    if (item.status === "Paid") {
      badgeBg = "#e6f4ea";
      badgeText = "#03a685";
      statusIcon = <CheckCircle2 size={13} color="#03a685" style={{ marginRight: 4 }} />;
    } else if (item.status === "Failed") {
      badgeBg = "#fce8e6";
      badgeText = "#e81156";
      statusIcon = <XCircle size={13} color="#e81156" style={{ marginRight: 4 }} />;
    } else if (item.status === "Refunded") {
      badgeBg = "#e8f0fe";
      badgeText = "#1070e0";
      statusIcon = <RefreshCw size={12} color="#1070e0" style={{ marginRight: 4, transform: [{ rotate: "45deg" }] }} />;
    } else if (item.status === "Cancelled") {
      badgeBg = "#f1f3f4";
      badgeText = "#606468";
      statusIcon = <XCircle size={13} color="#606468" style={{ marginRight: 4 }} />;
    } else if (item.status === "Created") {
      badgeBg = "#fef7e0";
      badgeText = "#b06000";
    }

    return (
      <View style={[styles.card, { borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.txnId, { color: theme.colors.text }]}>{item.transactionId}</Text>
            <Text style={styles.invoiceId}>Invoice: {item.invoiceId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            {statusIcon}
            <Text style={[styles.statusText, { color: badgeText }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Calendar size={14} color={theme.colors.textMuted} style={styles.iconSpacing} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>{formattedDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <CreditCard size={14} color={theme.colors.textMuted} style={styles.iconSpacing} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {item.paymentMethod} {item.gateway ? `via ${item.gateway}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.amount, { color: theme.colors.text }]}>
            ₹{item.amount.toLocaleString("en-IN")}
          </Text>
          
          <TouchableOpacity
            style={[styles.receiptButton, { borderColor: theme.colors.primary }]}
            onPress={() => downloadReceipt(item._id)}
          >
            <FileText size={14} color={theme.colors.primary} style={styles.receiptIcon} />
            <Text style={[styles.receiptButtonText, { color: theme.colors.primary }]}>Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Rendering skeletons for load state
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, index) => (
      <Animated.View
        key={index}
        style={[
          styles.skeletonCard,
          {
            borderColor: theme.colors.border,
            opacity: skeletonAnim,
          },
        ]}
      >
        <View style={styles.skeletonHeader}>
          <View>
            <View style={styles.skeletonTextLong} />
            <View style={styles.skeletonTextShort} />
          </View>
          <View style={styles.skeletonBadge} />
        </View>
        <View style={styles.skeletonDivider} />
        <View style={styles.skeletonBody}>
          <View style={styles.skeletonRow} />
          <View style={styles.skeletonRow} />
        </View>
        <View style={styles.skeletonFooter}>
          <View style={styles.skeletonAmount} />
          <View style={styles.skeletonBtn} />
        </View>
      </Animated.View>
    ));
  };

  // Login redirect view
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Transactions</Text>
        </View>
        <View style={styles.emptyState}>
          <CreditCard size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Access Denied</Text>
          <Text style={styles.emptySubtitle}>Please login to view your transaction logs.</Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/login" as any)}
          >
            <Text style={styles.loginButtonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Active Sorting Title mapping
  const getSortTitle = () => {
    if (sortBy === "dateTime" && sortOrder === "desc") return "Date: Newest";
    if (sortBy === "dateTime" && sortOrder === "asc") return "Date: Oldest";
    if (sortBy === "amount" && sortOrder === "desc") return "Amount: High to Low";
    if (sortBy === "amount" && sortOrder === "asc") return "Amount: Low to High";
    return "Sorted";
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Transactions</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? "Syncing..." : `${totalRecords} record(s)`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={exportTransactions}
          style={[styles.exportBtn, { borderColor: theme.colors.border }]}
          disabled={loading || totalRecords === 0}
        >
          <Download size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 2. Search Box */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { borderColor: theme.colors.border }]}>
          <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search Txn ID or Invoice ID..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => setSearchQuery(searchText)}
            style={[styles.searchInput, { color: theme.colors.text }]}
          />
          {searchText !== "" && (
            <TouchableOpacity
              onPress={() => {
                setSearchText("");
                setSearchQuery("");
              }}
            >
              <X size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Filter & Sort Tabs */}
      <View style={[styles.filterBar, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilterCount > 0 && { borderColor: theme.colors.primary },
          ]}
          onPress={openFilterModal}
        >
          <Filter size={16} color={activeFilterCount > 0 ? theme.colors.primary : theme.colors.text} />
          <Text
            style={[
              styles.filterTabText,
              { color: activeFilterCount > 0 ? theme.colors.primary : theme.colors.text },
            ]}
          >
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <View style={[styles.badgeCircle, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeCircleText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab]}
          onPress={() => setIsSortModalVisible(true)}
        >
          <ArrowUpDown size={16} color={theme.colors.text} />
          <Text style={[styles.filterTabText, { color: theme.colors.text }]}>
            {getSortTitle()}
          </Text>
        </TouchableOpacity>

        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={resetFilters} style={styles.clearFiltersBtn}>
            <Text style={[styles.clearFiltersText, { color: theme.colors.primary }]}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 4. Transactions List */}
      {error ? (
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <AlertCircle size={48} color={theme.colors.error} />
          <Text style={[styles.errorTextTitle, { color: theme.colors.text }]}>Failed to Sync Transactions</Text>
          <Text style={styles.errorTextSub}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => fetchTransactions(1)}
          >
            <Text style={styles.retryButtonText}>RETRY SYNC</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : loading && !refreshing ? (
        <ScrollView style={styles.listContainer} contentContainerStyle={{ padding: 15 }}>
          {renderSkeletons()}
        </ScrollView>
      ) : transactions.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <CreditCard size={64} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Transactions Found</Text>
              <Text style={styles.emptySubtitle}>
                No billing logs match your filters. Try resetting filters or choosing different parameters.
              </Text>
              <TouchableOpacity
                style={[styles.resetFiltersBtn, { backgroundColor: theme.colors.primary }]}
                onPress={resetFilters}
              >
                <Text style={styles.resetFiltersBtnText}>RESET ALL FILTERS</Text>
              </TouchableOpacity>
            </View>
          }
          style={styles.listContainer}
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          renderItem={renderTransactionItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          style={styles.listContainer}
          ListFooterComponent={
            // Pagination controls
            totalPages > 1 ? (
              <View style={[styles.paginationRow, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={[styles.pageNavBtn, currentPage === 1 && styles.pageNavBtnDisabled]}
                  onPress={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={20} color={currentPage === 1 ? theme.colors.textMuted : theme.colors.text} />
                </TouchableOpacity>

                <Text style={[styles.pageIndicator, { color: theme.colors.text }]}>
                  Page {currentPage} of {totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageNavBtn, currentPage === totalPages && styles.pageNavBtnDisabled]}
                  onPress={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={20} color={currentPage === totalPages ? theme.colors.textMuted : theme.colors.text} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* 5. Sort Sheet Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { backgroundColor: theme.colors.background }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>Sort Transactions</Text>
              <TouchableOpacity onPress={() => setIsSortModalVisible(false)}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetContent}>
              {[
                { label: "Date: Newest First", field: "dateTime", order: "desc" },
                { label: "Date: Oldest First", field: "dateTime", order: "asc" },
                { label: "Amount: High to Low", field: "amount", order: "desc" },
                { label: "Amount: Low to High", field: "amount", order: "asc" },
              ].map((opt, i) => {
                const isSelected = sortBy === opt.field && sortOrder === opt.order;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.sheetOption,
                      isSelected && { backgroundColor: theme.colors.surface },
                    ]}
                    onPress={() => applySort(opt.field, opt.order)}
                  >
                    <Text
                      style={[
                        styles.sheetOptionText,
                        {
                          color: isSelected ? theme.colors.primary : theme.colors.text,
                          fontWeight: isSelected ? "bold" : "normal",
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. Advanced Filters Sheet Modal */}
      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterSheet, { backgroundColor: theme.colors.background }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>Filter Options</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterSheetScroll}>
              {/* Status Section */}
              <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Transaction Status</Text>
              <View style={styles.filterRow}>
                {["Paid", "Failed", "Refunded", "Cancelled", "Created"].map((st) => {
                  const isSelected = tempStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.filterBubble,
                        { borderColor: theme.colors.border },
                        isSelected && {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      onPress={() => setTempStatus(isSelected ? "" : st)}
                    >
                      <Text style={[styles.filterBubbleText, isSelected && { color: "#fff" }]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Payment Methods Section */}
              <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Payment Method</Text>
              <View style={styles.filterRow}>
                {["UPI", "Card", "NetBanking", "COD"].map((pm) => {
                  const isSelected = tempMethod === pm;
                  return (
                    <TouchableOpacity
                      key={pm}
                      style={[
                        styles.filterBubble,
                        { borderColor: theme.colors.border },
                        isSelected && {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      onPress={() => setTempMethod(isSelected ? "" : pm)}
                    >
                      <Text style={[styles.filterBubbleText, isSelected && { color: "#fff" }]}>
                        {pm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Date Presets Section */}
              <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Time Period</Text>
              <View style={styles.filterRow}>
                {[
                  { label: "All Time", value: "all" },
                  { label: "Last 30 Days", value: "30" },
                  { label: "Last 90 Days", value: "90" },
                  { label: "Last 180 Days", value: "180" },
                ].map((dt) => {
                  const isSelected = tempDateRange === dt.value;
                  return (
                    <TouchableOpacity
                      key={dt.value}
                      style={[
                        styles.filterBubble,
                        { borderColor: theme.colors.border },
                        isSelected && {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      onPress={() => setTempDateRange(dt.value)}
                    >
                      <Text style={[styles.filterBubbleText, isSelected && { color: "#fff" }]}>
                        {dt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount Range inputs */}
              <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Amount Range (INR)</Text>
              <View style={styles.amountInputRow}>
                <TextInput
                  placeholder="Min"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  value={tempMinAmount}
                  onChangeText={setTempMinAmount}
                  style={[styles.amountInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                />
                <Text style={[styles.amountTo, { color: theme.colors.text }]}>to</Text>
                <TextInput
                  placeholder="Max"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  value={tempMaxAmount}
                  onChangeText={setTempMaxAmount}
                  style={[styles.amountInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                />
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={[styles.filterSheetFooter, { borderTopColor: theme.colors.border }]}>
              <TouchableOpacity style={[styles.resetBtn, { borderColor: theme.colors.border }]} onPress={resetFilters}>
                <Text style={[styles.resetBtnText, { color: theme.colors.text }]}>Reset All</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.colors.primary }]} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 15,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#9496a2",
    marginTop: 2,
  },
  exportBtn: {
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchSection: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eaeaec",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  badgeCircle: {
    marginLeft: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCircleText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  clearFiltersBtn: {
    marginLeft: "auto",
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  txnId: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  invoiceId: {
    fontSize: 12,
    color: "#9496a2",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#eaeaec",
    marginVertical: 12,
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  iconSpacing: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  receiptButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  receiptIcon: {
    marginRight: 4,
  },
  receiptButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  // Pagination
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 15,
    marginTop: 10,
  },
  pageNavBtn: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#eaeaec",
    borderRadius: 8,
    marginHorizontal: 15,
  },
  pageNavBtnDisabled: {
    opacity: 0.4,
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Skeletons
  skeletonCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  skeletonTextLong: {
    width: 140,
    height: 14,
    backgroundColor: "#eaeaec",
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonTextShort: {
    width: 90,
    height: 11,
    backgroundColor: "#eaeaec",
    borderRadius: 4,
  },
  skeletonBadge: {
    width: 60,
    height: 20,
    backgroundColor: "#eaeaec",
    borderRadius: 6,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: "#eaeaec",
    marginVertical: 12,
  },
  skeletonBody: {
    marginBottom: 12,
  },
  skeletonRow: {
    width: 180,
    height: 12,
    backgroundColor: "#eaeaec",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonAmount: {
    width: 70,
    height: 18,
    backgroundColor: "#eaeaec",
    borderRadius: 4,
  },
  skeletonBtn: {
    width: 80,
    height: 28,
    backgroundColor: "#eaeaec",
    borderRadius: 6,
  },
  // Modals & Sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "50%",
  },
  filterSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaec",
    marginBottom: 15,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  sheetContent: {
    paddingVertical: 5,
  },
  sheetOption: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  sheetOptionText: {
    fontSize: 14,
  },
  filterSheetScroll: {
    flexGrow: 0,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterBubble: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  filterBubbleText: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  amountTo: {
    marginHorizontal: 10,
    fontSize: 13,
  },
  filterSheetFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 15,
    marginTop: 15,
  },
  resetBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  applyBtn: {
    flex: 2,
    borderRadius: 10,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  // Empty states / Errors
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 100,
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9496a2",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  resetFiltersBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  resetFiltersBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
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
    fontWeight: "bold",
  },
  center: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  errorTextTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 6,
  },
  errorTextSub: {
    fontSize: 13,
    color: "#9496a2",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
});
