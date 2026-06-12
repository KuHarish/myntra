import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useRouter } from "expo-router";
import { CreditCard, MapPin, Truck, Smartphone, Building2, Coins } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/constants/Api";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("Google Pay");
  const [summary, setSummary] = useState({ subtotal: 0, itemCount: 0 });
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      axios.get(`${API_BASE_URL}/cart/summary/${user._id}`)
        .then(res => {
          setSummary(res.data);
        })
        .catch(err => console.error("Error fetching cart summary:", err));
    }
  }, [user]);

  const subtotal = summary.subtotal || 0;
  const shipping = subtotal > 0 ? (subtotal > 999 ? 0 : 99) : 0;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shipping + tax;

  const handleplaceorder = async() => {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/order/create/${user._id}`, {
        shippingAddress: "123 Main Street, Apt 4B, New York, NY, 10001",
        paymentMethod: selectedMethod,
      });
      router.push("/orders");
    } catch (error: any) {
      console.log(error);
      const msg = error?.response?.data?.message || "Order placement failed. Price or stock might have changed.";
      Alert.alert("Checkout Failed", msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={24} color="#ff3f6c" />
            <Text style={styles.sectionTitle}>Shipping Address</Text>
          </View>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              defaultValue="John Doe"
            />
            <TextInput
              style={styles.input}
              placeholder="Address Line 1"
              defaultValue="123 Main Street"
            />
            <TextInput
              style={styles.input}
              placeholder="Address Line 2"
              defaultValue="Apt 4B"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="City"
                defaultValue="New York"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="State"
                defaultValue="NY"
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Postal Code"
                defaultValue="10001"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Country"
                defaultValue="United States"
              />
            </View>
          </View>
        </View>
        {/* Payment Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={24} color="#ff3f6c" />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          
          <View style={styles.paymentSelectorContainer}>
            {/* Google Pay / UPI Option */}
            <TouchableOpacity
              style={[styles.paymentMethodOption, selectedMethod === "Google Pay" && styles.paymentMethodOptionActive]}
              onPress={() => setSelectedMethod("Google Pay")}
            >
              <Smartphone size={20} color={selectedMethod === "Google Pay" ? "#ff3f6c" : "#666"} />
              <View style={styles.paymentMethodDetails}>
                <Text style={[styles.paymentMethodLabel, selectedMethod === "Google Pay" && styles.paymentMethodLabelActive]}>
                  Google Pay (GPay) / UPI
                </Text>
                <Text style={styles.paymentMethodSub}>Pay instantly via Google Pay or other UPI apps</Text>
              </View>
              <View style={[styles.radioCircle, selectedMethod === "Google Pay" && styles.radioCircleActive]}>
                {selectedMethod === "Google Pay" && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            {/* Credit / Debit Card Option */}
            <TouchableOpacity
              style={[styles.paymentMethodOption, selectedMethod === "Card" && styles.paymentMethodOptionActive]}
              onPress={() => setSelectedMethod("Card")}
            >
              <CreditCard size={20} color={selectedMethod === "Card" ? "#ff3f6c" : "#666"} />
              <View style={styles.paymentMethodDetails}>
                <Text style={[styles.paymentMethodLabel, selectedMethod === "Card" && styles.paymentMethodLabelActive]}>
                  Credit / Debit Card
                </Text>
                <Text style={styles.paymentMethodSub}>Visa, MasterCard, RuPay, Maestro</Text>
              </View>
              <View style={[styles.radioCircle, selectedMethod === "Card" && styles.radioCircleActive]}>
                {selectedMethod === "Card" && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            {/* Card Inputs (Visible only if Card is selected) */}
            {selectedMethod === "Card" && (
              <View style={styles.cardForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Card Number"
                  defaultValue="**** **** **** 4242"
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Expiry Date"
                    defaultValue="12/25"
                  />
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="CVV"
                    defaultValue="***"
                  />
                </View>
              </View>
            )}

            {/* Net Banking Option */}
            <TouchableOpacity
              style={[styles.paymentMethodOption, selectedMethod === "NetBanking" && styles.paymentMethodOptionActive]}
              onPress={() => setSelectedMethod("NetBanking")}
            >
              <Building2 size={20} color={selectedMethod === "NetBanking" ? "#ff3f6c" : "#666"} />
              <View style={styles.paymentMethodDetails}>
                <Text style={[styles.paymentMethodLabel, selectedMethod === "NetBanking" && styles.paymentMethodLabelActive]}>
                  Net Banking
                </Text>
                <Text style={styles.paymentMethodSub}>Pay using any of the major Indian Banks</Text>
              </View>
              <View style={[styles.radioCircle, selectedMethod === "NetBanking" && styles.radioCircleActive]}>
                {selectedMethod === "NetBanking" && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>

            {/* Cash on Delivery Option */}
            <TouchableOpacity
              style={[styles.paymentMethodOption, selectedMethod === "COD" && styles.paymentMethodOptionActive]}
              onPress={() => setSelectedMethod("COD")}
            >
              <Coins size={20} color={selectedMethod === "COD" ? "#ff3f6c" : "#666"} />
              <View style={styles.paymentMethodDetails}>
                <Text style={[styles.paymentMethodLabel, selectedMethod === "COD" && styles.paymentMethodLabelActive]}>
                  Cash on Delivery (COD)
                </Text>
                <Text style={styles.paymentMethodSub}>Pay cash at the time of delivery</Text>
              </View>
              <View style={[styles.radioCircle, selectedMethod === "COD" && styles.radioCircleActive]}>
                {selectedMethod === "COD" && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>
        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Truck size={24} color="#ff3f6c" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>₹{shipping}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (18%)</Text>
              <Text style={styles.summaryValue}>₹{tax}</Text>
            </View>
            <View style={[styles.summaryRow, styles.total]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handleplaceorder}
          disabled={loading || subtotal === 0}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.placeOrderButtonText}>PLACE ORDER</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 15,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3e3e3e",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3e3e3e",
    marginLeft: 10,
  },
  form: {
    gap: 10,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  summary: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#666",
  },
  summaryValue: {
    fontSize: 16,
    color: "#3e3e3e",
  },
  total: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 10,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3e3e3e",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff3f6c",
  },
  footer: {
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  placeOrderButton: {
    backgroundColor: "#ff3f6c",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  placeOrderButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  paymentSelectorContainer: {
    gap: 12,
  },
  paymentMethodOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eaeaec",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafb",
  },
  paymentMethodOptionActive: {
    borderColor: "#ff3f6c",
    backgroundColor: "#fff8f9",
  },
  paymentMethodDetails: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3e3e3e",
  },
  paymentMethodLabelActive: {
    color: "#ff3f6c",
  },
  paymentMethodSub: {
    fontSize: 11,
    color: "#9496a2",
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#9496a2",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#ff3f6c",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ff3f6c",
  },
  cardForm: {
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 10,
    gap: 10,
  },
});
