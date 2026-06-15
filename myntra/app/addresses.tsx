import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Plus, Trash2, X } from 'lucide-react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/ThemedButton';
import { useTheme } from '@/src/theme';

export default function AddressesScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [addresses, setAddresses] = useState([
    {
      id: '1',
      tag: 'Home',
      name: 'Karan Kumar',
      addressLine: '123, Fashion Street, Sector 4',
      cityState: 'New Delhi, Delhi - 110001',
      phone: '9876543210',
      isDefault: true,
    },
    {
      id: '2',
      tag: 'Office',
      name: 'Karan Kumar',
      addressLine: 'Tech Park, Tower B, Phase 2',
      cityState: 'Bangalore, Karnataka - 560001',
      phone: '9876543211',
      isDefault: false,
    },
  ]);

  // Modal and Form States
  const [modalVisible, setModalVisible] = useState(false);
  const [tag, setTag] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [cityState, setCityState] = useState('');
  const [phone, setPhone] = useState('');

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
  };

  const handleSaveAddress = () => {
    if (!name.trim() || !addressLine.trim() || !cityState.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    
    // Basic phone number validation
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const newAddress = {
      id: Date.now().toString(),
      tag,
      name: name.trim(),
      addressLine: addressLine.trim(),
      cityState: cityState.trim(),
      phone: cleanPhone,
      isDefault: addresses.length === 0,
    };

    setAddresses([...addresses, newAddress]);

    // Reset Form
    setName('');
    setAddressLine('');
    setCityState('');
    setPhone('');
    setTag('Home');
    setModalVisible(false);
  };

  return (
    <ThemedView style={styles.container} colorType="background">
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.colors.border }]} colorType="background">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>Saved Addresses</ThemedText>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.content}>
        {addresses.map((address) => (
          <ThemedView
            key={address.id}
            style={[styles.addressCard, { borderColor: theme.colors.border }]}
            colorType="card"
          >
            <ThemedView style={styles.cardHeader} colorType="card">
              <ThemedView style={styles.tagContainer} colorType="surface">
                <ThemedText style={styles.tagText} type="defaultSemiBold">{address.tag}</ThemedText>
              </ThemedView>
              {address.isDefault && (
                <ThemedText style={{ color: theme.colors.primary, fontSize: 12 }} type="defaultSemiBold">
                  DEFAULT
                </ThemedText>
              )}
            </ThemedView>

            <ThemedText type="defaultSemiBold" style={styles.nameText}>{address.name}</ThemedText>
            <ThemedText type="default" colorType="textMuted" style={styles.addressText}>
              {address.addressLine}
            </ThemedText>
            <ThemedText type="default" colorType="textMuted" style={styles.addressText}>
              {address.cityState}
            </ThemedText>
            <ThemedText type="default" colorType="textMuted" style={styles.phoneText}>
              Mobile: {address.phone}
            </ThemedText>

            <ThemedView style={[styles.cardFooter, { borderTopColor: theme.colors.border }]} colorType="card">
              <TouchableOpacity onPress={() => handleDelete(address.id)} style={styles.actionButton}>
                <Trash2 size={16} color={theme.colors.error} />
                <ThemedText type="defaultSemiBold" style={[styles.actionText, { color: theme.colors.error }]}>
                  Remove
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        ))}

        <ThemedButton
          title="Add New Address"
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
        />
      </ScrollView>

      {/* Add New Address Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <ThemedView style={styles.modalOverlay} colorType="background">
          <ThemedView style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} colorType="card">
            <ThemedView style={styles.modalHeader} colorType="card">
              <ThemedText type="subtitle">Add New Address</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </ThemedView>

            <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Address Type</ThemedText>
              <ThemedView style={styles.chipContainer} colorType="card">
                {(['Home', 'Office', 'Other'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      tag === type && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setTag(type)}
                  >
                    <ThemedText
                      type="defaultSemiBold"
                      style={[styles.chipText, tag === type && { color: '#ffffff' }]}
                    >
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>

              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Full Name</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Enter recipient's name"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Address Line</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Flat / House no., Street, Sector"
                placeholderTextColor={theme.colors.textMuted}
                value={addressLine}
                onChangeText={setAddressLine}
              />

              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>City, State & PIN Code</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="e.g. Bangalore, Karnataka - 560001"
                placeholderTextColor={theme.colors.textMuted}
                value={cityState}
                onChangeText={setCityState}
              />

              <ThemedText type="defaultSemiBold" style={styles.inputLabel}>Mobile Number</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="10-digit mobile number"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />

              <ThemedButton
                title="Save Address"
                onPress={handleSaveAddress}
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
  addressCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
  },
  nameText: {
    fontSize: 15,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },
  phoneText: {
    fontSize: 14,
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  actionText: {
    marginLeft: 6,
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
  saveButton: {
    marginTop: 24,
  },
});
