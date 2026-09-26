import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  ActivityIndicator,
} from 'react-native';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { StatusBadge } from '../components/StatusBadge';

export const ReceiptScreen = () => {
  const { isAuthenticated } = useAuthStore();
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form state for creating a receipt
  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    partner_name: '',
    contact_email: '',
    reference_code: '',
    schedule_date: '',
  });

  // Fetch receipts (movements of type RECEIPT)
  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/operations/movements', {
        params: { document_type: 'receipt' },
      });
      setReceipts(response.data);
    } catch (error: any) {
      console.error('Failed to fetch receipts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch products for dropdown
  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products/');
      setProducts(response.data);
    } catch (error: any) {
      console.error('Failed to fetch products:', error);
    }
  };

  // Create a new receipt
  const createReceipt = async () => {
    setCreateLoading(true);
    try {
      const response = await apiClient.post('/operations/receipts', {
        product_id: Number(form.product_id),
        quantity: parseFloat(form.quantity),
        partner_name: form.partner_name,
        contact_email: form.contact_email,
        reference_code: form.reference_code,
        schedule_date: form.schedule_date || undefined,
      });
      // Add the new receipt to the list
      setReceipts(prev => [response.data, ...prev]);
      // Reset form
      setForm({
        product_id: '',
        quantity: '',
        partner_name: '',
        contact_email: '',
        reference_code: '',
        schedule_date: '',
      });
      setCreateModalVisible(false);
    } catch (error: any) {
      console.error('Failed to create receipt:', error);
      // TODO: Show error message
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReceipts();
      fetchProducts();
    }
  }, [isAuthenticated]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReceipts();
  };

  const renderReceipt = ({ item }: { item: any }) => (
    <View style={styles.receiptItem}>
      <View style={styles.receiptInfo}>
        <Text style={styles.receiptReference}>Reference: {item.reference}</Text>
        <Text style={styles.receiptInfoText}>
          Product: {item.product?.name || 'Unknown'} ({item.quantity} {item.product?.unit_of_measure || ''})
        </Text>
        <Text style={styles.receiptInfoText}>
          Partner: {item.partner_name} ({item.contact_email})
        </Text>
        <Text style={styles.receiptInfoText}>
          Reference Code: {item.reference_code || 'N/A'}
        </Text>
        <Text style={styles.receiptInfoText}>
          Scheduled: {item.schedule_date ? new Date(item.schedule_date).toLocaleString() : 'Not scheduled'}
        </Text>
      </View>
      <View style={styles.receiptStatus}>
        <StatusBadge status={item.status} />
      </View>
    </View>
  );

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Receipts (Incoming Stock)</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.addButtonText}>+ New Receipt</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={receipts}
        renderItem={renderReceipt}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No receipts found</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.listFooter} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* Create Receipt Modal */}
      <Modal
        transparent
        visible={createModalVisible}
        animationType="slide"
      >
        <View style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>New Receipt</Text>
          <View style={styles.modalForm}>
            {/* Product dropdown */}
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Product:</Text>
              {/* Simple dropdown for products - in a real app, use a proper dropdown */}
              <View style={styles.dropdown}>
                {products.map((product: any) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.dropdownItem,
                      form.product_id === String(product.id) && styles.dropdownItemSelected,
                    ]
                    }
                    onPress={() =>
                      setForm(prev => ({ ...prev, product_id: String(product.id) }))
                    }
                  >
                    <Text style={styles.dropdownItemText}>
                      {product.sku} - {product.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formValue}>
                {products.find((p: any) => String(p.id) === form.product_id)?.name || 'Select product'}
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              keyboardType="numeric"
              value={form.quantity}
              onChangeText={(text) => setForm(prev => ({ ...prev, quantity: text }))}
            />

            <TextInput
              style={styles.input}
              placeholder="Partner Name"
              value={form.partner_name}
              onChangeText={(text) => setForm(prev => ({ ...prev, partner_name: text }))}
            />

            <TextInput
              style={styles.input}
              placeholder="Contact Email"
              keyboardType="email-address"
              value={form.contact_email}
              onChangeText={(text) => setForm(prev => ({ ...prev, contact_email: text }))}
            />

            <TextInput
              style={styles.input}
              placeholder="Reference Code"
              value={form.reference_code}
              onChangeText={(text) => setForm(prev => ({ ...prev, reference_code: text }))}
            />

            <TextInput
              style={styles.input}
              placeholder="Schedule Date (YYYY-MM-DD)"
              value={form.schedule_date}
              onChangeText={(text) => setForm(prev => ({ ...prev, schedule_date: text }))}
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setCreateModalVisible(false)}
              color="#6b7280"
            />
            <Button
              title="Create Receipt"
              onPress={createReceipt}
              disabled={createLoading}
              color="#2563eb"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  receiptItem: {
    backgroundColor: 'white',
    padding: 16,
    margin: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  receiptInfo: {
    flex: 1,
    marginRight: 12,
  },
  receiptReference: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  receiptInfoText: {
    fontSize: 14,
    color: '#4b5563',
    marginVertical: 2,
  },
  receiptStatus: {
    alignItems: 'flex-end',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 18,
  },
  listFooter: {
    height: 80,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
  },
  modalForm: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  formLabel: {
    width: 80,
    fontWeight: '500',
    color: '#374151',
  },
  formValue: {
    flex: 1,
    fontStyle: 'italic',
    color: '#6b7280',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 8,
  },
  dropdownItemSelected: {
    backgroundColor: '#dbeafe',
  },
  dropdownItemText: {
    fontSize: 14,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});