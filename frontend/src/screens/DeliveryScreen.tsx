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
  Pressable,
  RefreshControl,
} from 'react-native';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { StatusBadge } from '../components/StatusBadge';

export const DeliveryScreen = () => {
  const { isAuthenticated } = useAuthStore();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form state for creating a delivery
  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    partner_name: '',
    contact_email: '',
    reference_code: '',
    schedule_date: '',
  });

  // Fetch deliveries (movements of type DELIVERY)
  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/operations/movements', {
        params: { document_type: 'delivery' },
      });
      setDeliveries(response.data);
    } catch (error: any) {
      console.error('Failed to fetch deliveries:', error);
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

  // Create a new delivery
  const createDelivery = async () => {
    setCreateLoading(true);
    try {
      const response = await apiClient.post('/operations/deliveries', {
        product_id: Number(form.product_id),
        quantity: parseFloat(form.quantity),
        partner_name: form.partner_name,
        contact_email: form.contact_email,
        reference_code: form.reference_code,
        schedule_date: form.schedule_date || undefined,
      });
      // Add the new delivery to the list
      setDeliveries(prev => [response.data, ...prev]);
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
      console.error('Failed to create delivery:', error);
      // TODO: Show error message
    } finally {
      setCreateLoading(false);
    }
  };

  // Transition delivery status
  const transitionDelivery = async (deliveryId: number, newStatus: string) => {
    try {
      let endpoint = '';
      switch (newStatus) {
        case 'waiting':
          endpoint = `/operations/deliveries/${deliveryId}/waiting`;
          break;
        case 'ready':
          endpoint = `/operations/deliveries/${deliveryId}/ready`;
          break;
        case 'done':
          endpoint = `/operations/deliveries/${deliveryId}/done`;
          break;
        case 'canceled':
          endpoint = `/operations/deliveries/${deliveryId}/canceled`;
          break;
        default:
          return;
      }

      await apiClient.post(endpoint);
      // Update the delivery in the list
      setDeliveries(prev =>
        prev.map((delivery: any) =>
          delivery.id === deliveryId
            ? { ...delivery, status: newStatus }
            : delivery
        )
      );
    } catch (error: any) {
      console.error(`Failed to transition delivery to ${newStatus}:`, error);
      // TODO: Show error message
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeliveries();
      fetchProducts();
    }
  }, [isAuthenticated]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const renderDelivery = ({ item }: { item: any }) => (
    <View style={styles.deliveryItem}>
      <View style={styles.deliveryInfo}>
        <Text style={styles.deliveryReference}>Reference: {item.reference}</Text>
        <Text style={styles.deliveryInfoText}>
          Product: {item.product?.name || 'Unknown'} ({item.quantity} {item.product?.unit_of_measure || ''})
        </Text>
        <Text style={styles.deliveryInfoText}>
          Partner: {item.partner_name} ({item.contact_email})
        </Text>
        <Text style={styles.deliveryInfoText}>
          Reference Code: {item.reference_code || 'N/A'}
        </Text>
        <Text style={styles.deliveryInfoText}>
          Scheduled: {item.schedule_date ? new Date(item.schedule_date).toLocaleString() : 'Not scheduled'}
        </Text>
      </View>
      <View style={styles.deliveryActions}>
        <StatusBadge status={item.status} />
        {/* Status transition buttons based on current status */}
        {item.status === 'draft' && (
          <View style={styles.buttonGroup}>
            <Button
              title="To Waiting"
              onPress={() => transitionDelivery(item.id, 'waiting')}
              color="#f59e0b"
            />
          </View>
        )}
        {item.status === 'waiting' && (
          <View style={styles.buttonGroup}>
            <Button
              title="To Ready"
              onPress={() => transitionDelivery(item.id, 'ready')}
              color="#3b82f6"
            />
          </View>
        )}
        {item.status === 'ready' && (
          <View style={styles.buttonGroup}>
            <Button
              title="Mark as Done"
              onPress={() => transitionDelivery(item.id, 'done')}
              color="#10b981"
            />
            <Button
              title="Cancel"
              onPress={() => transitionDelivery(item.id, 'canceled')}
              color="#ef4444"
            />
          </View>
        )}
        {item.status === 'done' && (
          <View style={styles.buttonGroup}>
            <Button
              title="View Details"
              // TODO: Implement view details
              color="#6b7280"
            />
          </View>
        )}
        {item.status === 'canceled' && (
          <View style={styles.buttonGroup}>
            <Button
              title="View Details"
              // TODO: Implement view details
              color="#6b7280"
            />
          </View>
        )}
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
        <Text style={styles.title}>Deliveries (Outgoing Stock)</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.addButtonText}>+ New Delivery</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={deliveries}
        renderItem={renderDelivery}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No deliveries found</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.listFooter} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* Create Delivery Modal */}
      <Modal
        transparent
        visible={createModalVisible}
        animationType="slide"
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>New Delivery</Text>
          <View style={styles.modalForm}>
            {/* Product dropdown */}
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Product:</Text>
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
              title="Create Delivery"
              onPress={createDelivery}
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
  deliveryItem: {
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
  deliveryInfo: {
    flex: 1,
    marginRight: 12,
  },
  deliveryReference: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  deliveryInfoText: {
    fontSize: 14,
    color: '#4b5563',
    marginVertical: 2,
  },
  deliveryActions: {
    alignItems: 'flex-end',
  },
  buttonGroup: {
    marginTop: 8,
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