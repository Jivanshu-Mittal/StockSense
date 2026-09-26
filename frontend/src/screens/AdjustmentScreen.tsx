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

export const AdjustmentScreen = () => {
  const { isAuthenticated } = useAuthStore();
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form state for creating an adjustment
  const [form, setForm] = useState({
    product_id: '',
    quantity: '', // can be positive (increase) or negative (decrease)
    source_location_id: '', // location to decrease from (if decreasing)
    dest_location_id: '', // location to increase to (if increasing)
    // Note: According to schema, one of source_location_id or dest_location_id should be set, or both NULL for general adjustment
  });

  // Fetch adjustments (movements of type ADJUSTMENT)
  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/operations/movements', {
        params: { document_type: 'adjustment' },
      });
      setAdjustments(response.data);
    } catch (error: any) {
      console.error('Failed to fetch adjustments:', error);
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

  // Fetch locations for dropdowns
  const fetchLocations = async () => {
    try {
      const response = await apiClient.get('/locations/');
      setLocations(response.data);
    } catch (error: any) {
      console.error('Failed to fetch locations:', error);
    }
  };

  // Create a new adjustment
  const createAdjustment = async () => {
    setCreateLoading(true);
    try {
      // Validate that either source_location_id or dest_location_id is set, or both are empty (general adjustment)
      const hasSource = form.source_location_id.trim() !== '';
      const hasDest = form.dest_location_id.trim() !== '';
      if (hasSource && hasDest) {
        alert('Adjustment must have either source location or destination location, not both');
        setCreateLoading(false);
        return;
      }

      const response = await apiClient.post('/operations/adjustments', {
        product_id: Number(form.product_id),
        quantity: parseFloat(form.quantity), // can be positive or negative
        source_location_id: hasSource ? Number(form.source_location_id) : null,
        dest_location_id: hasDest ? Number(form.dest_location_id) : null,
      });
      // Add the new adjustment to the list
      setAdjustments(prev => [response.data, ...prev]);
      // Reset form
      setForm({
        product_id: '',
        quantity: '',
        source_location_id: '',
        dest_location_id: '',
      });
      setCreateModalVisible(false);
    } catch (error: any) {
      console.error('Failed to create adjustment:', error);
      // TODO: Show error message
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdjustments();
      fetchProducts();
      fetchLocations();
    }
  }, [isAuthenticated]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdjustments();
  };

  const renderAdjustment = ({ item }: { item: any }) => (
    <View style={styles.adjustmentItem}>
      <View style={styles.adjustmentInfo}>
        <Text style={styles.adjustmentReference}>Reference: {item.reference}</Text>
        <Text style={styles.adjustmentInfoText}>
          Product: {item.product?.name || 'Unknown'} ({Math.abs(item.quantity)} {item.product?.unit_of_measure || ''})
        </Text>
        <Text style={styles.adjustmentInfoText}>
          Type: {item.quantity < 0 ? 'Decrease' : 'Increase'}
        </Text>
        <Text style={styles.adjustmentInfoText}>
          Location:
          {item.source_location_id ?
            `From: ${item.source_location?.name || 'Unknown'}` :
            item.dest_location_id ?
              `To: ${item.dest_location?.name || 'Unknown'}` :
              'General Adjustment'}
        </Text>
      </View>
      <View style={styles.adjustmentStatus}>
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
        <Text style={styles.title}>Stock Adjustments</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.addButtonText}>+ New Adjustment</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={adjustments}
        renderItem={renderAdjustment}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No adjustments found</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.listFooter} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* Create Adjustment Modal */}
      <Modal
        transparent
        visible={createModalVisible}
        animationType="slide"
      >
        <View style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>New Adjustment</Text>
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

            {/* Quantity input (can be negative) */}
            <TextInput
              style={styles.input}
              placeholder="Quantity (use negative for decrease)"
              value={form.quantity}
              onChangeText={(text) => setForm(prev => ({ ...prev, quantity: text }))}
            />

            {/* Source location dropdown (for decrease) */}
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Source Loc (Decrease):</Text>
              <View style={styles.dropdown}>
                {locations.map((location: any) => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.dropdownItem,
                      form.source_location_id === String(location.id) && styles.dropdownItemSelected,
                    ]
                    }
                    onPress={() =>
                      setForm(prev => ({ ...prev, source_location_id: String(location.id) }))
                    }
                  >
                    <Text style={styles.dropdownItemText}>
                      {location.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formValue}>
                {locations.find((l: any) => String(l.id) === form.source_location_id)?.name || 'None'}
              </Text>
            </View>

            {/* Destination location dropdown (for increase) */}
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Dest Loc (Increase):</Text>
              <View style={styles.dropdown}>
                {locations.map((location: any) => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.dropdownItem,
                      form.dest_location_id === String(location.id) && styles.dropdownItemSelected,
                    ]
                    }
                    onPress={() =>
                      setForm(prev => ({ ...prev, dest_location_id: String(location.id) }))
                    }
                  >
                    <Text style={styles.dropdownItemText}>
                      {location.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formValue}>
                {locations.find((l: any) => String(l.id) === form.dest_location_id)?.name || 'None'}
              </Text>
            </View>

            <Text>
              Note: For adjustments, specify either source location (to decrease stock) or destination location (to increase stock), or leave both empty for a general adjustment not tied to a location.
            </Text>
          </View>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setCreateModalVisible(false)}
              color="#6b7280"
            />
            <Button
              title="Create Adjustment"
              onPress={createAdjustment}
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
  adjustmentItem: {
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
  adjustmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  adjustmentReference: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  adjustmentInfoText: {
    fontSize: 14,
    color: '#4b5563',
    marginVertical: 2,
  },
  adjustmentStatus: {
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
    width: 100,
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