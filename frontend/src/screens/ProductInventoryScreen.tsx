import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { StatusBadge } from '../components/StatusBadge';

export const ProductInventoryScreen = () => {
  const { isAuthenticated } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch products with stock breakdown
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/products/');
      setProducts(response.data);
      setFilteredProducts(response.data); // Initially show all
    } catch (error: any) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter products by SKU (searchTerm)
  const filterProducts = () => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }
    const filtered = products.filter((product: any) =>
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const renderProduct = ({ item }: { item: any }) => {
    // Determine if product is low stock
    const isLowStock = item.current_stock <= (item.min_stock_level || 0);
    const isOutOfStock = item.current_stock <= 0;

    return (
      <View style={styles.productItem}>
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productSKU}>SKU: {item.sku}</Text>
          </View>
          <View style={styles.productStock}>
            <Text style={styles.stockLabel}>Total Stock:</Text>
            <Text style={styles.stockValue}>
              {item.current_stock} {item.unit_of_measure}
            </Text>
            {isOutOfStock && (
              <View style={styles.badgeContainer}>
                <StatusBadge status="out-of-stock" />
              </View>
            )}
            {!isOutOfStock && isLowStock && (
              <View style={styles.badgeContainer}>
                <StatusBadge status="low-stock" />
              </View>
            )}
          </View>
          <View style={styles.productLocations}>
            <Text style={styles.locationsLabel}>Stock by Location:</Text>
            {item.stock_by_location.map((loc: any, index: number) => (
              <View key={index} style={styles.locationItem}>
                <Text style={styles.locationName}>{loc.location_name}:</Text>
                <Text style={styles.locationQuantity}>{loc.quantity}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

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
        <Text style={styles.title}>Product Inventory</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by SKU..."
          value={searchTerm}
          onChangeText={(text) => {
            setSearchTerm(text);
            // Debounce or call filter directly
            filterProducts();
          }}
        />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.listFooter} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
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
  searchBar: {
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  productItem: {
    backgroundColor: 'white',
    padding: 16,
    margin: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  productSKU: {
    fontSize: 14,
    color: '#6b7280',
  },
  productStock: {
    marginVertical: 12,
  },
  stockLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  stockOutOfStock: {
    color: '#ef4444', // red
  },
  stockLowStock: {
    color: '#f59e0b', // amber
  },
  badgeContainer: {
    marginLeft: 8,
  },
  productLocations: {
    marginTop: 12,
  },
  locationsLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  locationName: {
    fontSize: 14,
    color: '#374151',
  },
  locationQuantity: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
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
});

// We need to extend the StatusBadge to handle custom statuses like 'out-of-stock' and 'low-stock'
// For now, we'll use the existing StatusBadge and map these to existing statuses.
// Alternatively, we can modify the StatusBadge component to accept custom statuses.
// Let's update the StatusBadge component to handle these.

// However, to keep things simple, we'll just use the existing StatusBadge with a status that maps to a color.
// We'll update the StatusBadge component later if needed.