import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, Plus, Shield, X } from 'lucide-react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/ThemedButton';
import { useTheme } from '@/src/theme';

export default function PaymentsScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [cards, setCards] = useState([
    {
      id: '1',
      bank: 'HDFC Bank Credit Card',
      number: '•••• •••• •••• 4321',
      expiry: '09/29',
      holder: 'KARAN KUMAR',
    },
    {
      id: '2',
      bank: 'ICICI Bank Debit Card',
      number: '•••• •••• •••• 8765',
      expiry: '12/27',
      holder: 'KARAN KUMAR',
    },
  ]);

  // Modal and Form States
  const [modalVisible, setModalVisible] = useState(false);
  const [bank, setBank] = useState('');
  const [cardType, setCardType] = useState<'Credit Card' | 'Debit Card'>('Credit Card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [holder, setHolder] = useState('');

  const handleCardNumberChange = (text: string) => {
    // remove all non-digits
    const clean = text.replace(/[^0-9]/g, '');
    // format with space every 4 digits
    let formatted = '';
    for (let i = 0; i < clean.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += clean[i];
    }
    setCardNumber(formatted);
  };

  const handleExpiryChange = (text: string) => {
    // remove all non-digits
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length > 2) {
      setExpiry(`${clean.slice(0, 2)}/${clean.slice(2, 4)}`);
    } else {
      setExpiry(clean);
    }
  };

  const handleSaveCard = () => {
    if (!bank.trim() || !cardNumber.trim() || !expiry.trim() || !cvv.trim() || !holder.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    const cleanCardNum = cardNumber.replace(/\s/g, '');
    if (cleanCardNum.length !== 16) {
      Alert.alert('Validation Error', 'Please enter a valid 16-digit card number.');
      return;
    }

    const expiryMatch = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!expiryMatch) {
      Alert.alert('Validation Error', 'Please enter a valid expiry date in MM/YY format.');
      return;
    }

    const month = parseInt(expiryMatch[1], 10);
    if (month < 1 || month > 12) {
      Alert.alert('Validation Error', 'Expiry month must be between 01 and 12.');
      return;
    }

    if (cvv.trim().length !== 3) {
      Alert.alert('Validation Error', 'Please enter a valid 3-digit CVV.');
      return;
    }

    const lastFour = cleanCardNum.slice(-4);
    const maskedNumber = `•••• •••• •••• ${lastFour}`;

    const newCard = {
      id: Date.now().toString(),
      bank: `${bank.trim()} ${cardType}`,
      number: maskedNumber,
      expiry: expiry.trim(),
      holder: holder.trim().toUpperCase(),
    };

    setCards([...cards, newCard]);

    // Reset Form
    setBank('');
    setCardType('Credit Card');
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setHolder('');
    setModalVisible(false);
  };

  return (
    <ThemedView style={styles.container} colorType="background">
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>Payment Methods</ThemedText>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Secure badge */}
        <ThemedView style={[styles.securityBadge, { backgroundColor: theme.colors.surface }]} colorType="surface">
          <Shield size={18} color={theme.colors.success} />
          <ThemedText style={styles.securityText} type="defaultSemiBold" colorType="textMuted">
            Your payment details are secured with 256-bit encryption
          </ThemedText>
        </ThemedView>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Saved Cards</ThemedText>

        {cards.map((card) => (
          <ThemedView
            key={card.id}
            style={[styles.cardContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            colorType="card"
          >
            <ThemedView style={styles.cardHeader} colorType="card">
              <CreditCard size={24} color={theme.colors.primary} />
              <ThemedText type="defaultSemiBold" style={styles.bankText}>{card.bank}</ThemedText>
            </ThemedView>

            <ThemedText type="title" style={styles.cardNumber}>{card.number}</ThemedText>

            <ThemedView style={styles.cardDetails} colorType="card">
              <ThemedView colorType="card">
                <ThemedText type="default" colorType="textMuted" style={styles.detailsLabel}>CARDHOLDER</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.detailsValue}>{card.holder}</ThemedText>
              </ThemedView>
              <ThemedView colorType="card" style={{ alignItems: 'flex-end' }}>
                <ThemedText type="default" colorType="textMuted" style={styles.detailsLabel}>EXPIRES</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.detailsValue}>{card.expiry}</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        ))}

        <ThemedButton
          title="Add New Card"
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
        />
      </ScrollView>

      {/* Add New Card Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <ThemedView style={styles.modalOverlay} colorType="background">
          <ThemedView style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} colorType="card">
            <ThemedView style={styles.modalHeader} colorType="card">
              <ThemedText type="subtitle">Add New Card</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </ThemedView>

            <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Bank Name</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="e.g. HDFC Bank, ICICI Bank"
                placeholderTextColor={theme.colors.textMuted}
                value={bank}
                onChangeText={setBank}
              />

              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Card Type</ThemedText>
              <ThemedView style={styles.chipContainer} colorType="card">
                {(['Credit Card', 'Debit Card'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      cardType === type && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setCardType(type)}
                  >
                    <ThemedText
                      type="defaultSemiBold"
                      style={[styles.chipText, cardType === type && { color: '#ffffff' }]}
                    >
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>

              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Card Number</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                maxLength={19}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
              />

              <ThemedView style={styles.row} colorType="card">
                <ThemedView style={styles.halfInputContainer} colorType="card">
                  <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Expiry Date</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="MM/YY"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    maxLength={5}
                    value={expiry}
                    onChangeText={handleExpiryChange}
                  />
                </ThemedView>

                <ThemedView style={styles.halfInputContainer} colorType="card">
                  <ThemedText type="defaultSemiBold" style={styles.inputLabel}>CVV</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="123"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    secureTextEntry={true}
                    maxLength={3}
                    value={cvv}
                    onChangeText={setCvv}
                  />
                </ThemedView>
              </ThemedView>

              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Cardholder Name</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Name as printed on card"
                placeholderTextColor={theme.colors.textMuted}
                value={holder}
                onChangeText={setHolder}
              />

              <ThemedButton
                title="Save Card"
                onPress={handleSaveCard}
                style={styles.saveButton}
              />
            </ScrollView>
          </ThemedView>
        </ThemedView>
      </Modal>
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
    padding: 16,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  securityText: {
    marginLeft: 8,
    fontSize: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  cardContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  bankText: {
    marginLeft: 10,
    fontSize: 15,
  },
  cardNumber: {
    fontSize: 18,
    letterSpacing: 2,
    marginBottom: 20,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  detailsValue: {
    fontSize: 13,
  },
  addButton: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 8,
    marginTop: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  halfInputContainer: {
    flex: 1,
  },
  saveButton: {
    marginTop: 24,
  },
});
