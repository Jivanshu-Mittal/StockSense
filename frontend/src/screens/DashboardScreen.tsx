import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { KPICard } from '../components/KPICard';
import { FilterDropdown } from '../components/FilterDropdown';

// Define enum types for dropdowns
const DOCUMENT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'internal', label: 'Internal Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
];

const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'ready', label: 'Ready' },
  { value: 'done', label: 'Done' },
  { value: 'canceled', label: 'Canceled' },
];

export const DashboardScreen = () => {
  const { isAuthenticated } = useAuthStore();
  const [kpis, setKpis] = useState(null);
  const [locations, setLocations] = useState([]); // for location filter dropdown
  const [categories, setCategories] = useState([]); // for category filter dropdown
  const [selectedDocType, setSelectedDocType] = useState<'all' | 'receipt' | 'delivery' | 'internal' | 'adjustment'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'>('all');
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch KPIs
  const fetchKpis = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/dashboard/kpis');
      setKpis(response.data);
    } catch (error: any) {
      console.error('Failed to fetch KPIs:', error);
      // TODO: Show error message
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch locations for filter dropdown
  const fetchLocations = async () => {
    try {
      const response = await apiClient.get('/locations/');
      setLocations(response.data);
    } catch (error: any) {
      console.error('Failed to fetch locations:', error);
    }
  };

  // Fetch categories for filter dropdown
  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/products/categories');
      setCategories(response.data);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Fetch all initial data
  useEffect(() => {
    if (isAuthenticated) {
      fetchKpis();
      fetchLocations();
      fetchCategories();
    }
  }, [isAuthenticated]);

  // Refetch on pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchKpis();
  };

  if (!isAuthenticated) {
    return null; // or redirect to login
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
        <Text style={styles.title}>StockSense Dashboard</Text>
        {/* Filter dropdowns */}
        <View style={styles.filtersRow}>
          <FilterDropdown
            label="Document Type"
            options={DOCUMENT_TYPES}
            selectedOption={selectedDocType}
            onOptionSelect={setSelectedDocType}
            renderOption={(option) => option.label}
          />
          <FilterDropdown
            label="Status"
            options={STATUSES}
            selectedOption={selectedStatus}
            onOptionSelect={setSelectedStatus}
            renderOption={(option) => option.label}
          />
          <FilterDropdown
            label="Location"
            options={locations}
            selectedOption={selectedLocation ? { value: selectedLocation, label: locations.find(loc => loc.id === selectedLocation)?.name || '' } : { value: null, label: 'All Locations' } as any>
            onOptionSelect={(option) => {
              if (option.value === null) {
                setSelectedLocation(null);
              } else {
                setSelectedLocation(option.value);
              }
            }}
            renderOption={(option) => option.label || 'All Locations'}
          />
          <FilterDropdown
            label="Category"
            options={categories}
            selectedOption={selectedCategory ? { value: selectedCategory, label: selectedCategory } : { value: null, label: 'All Categories' } as any>
            onOptionSelect={(option) => {
              if (option.value === null) {
                setSelectedCategory(null);
              } else {
                setSelectedCategory(option.value);
              }
            }}
            renderOption={(option) => option.label || 'All Categories'}
          />
        </View>
      </View>

      {/* KPI Cards */}
      {kpis ? (
        <View style={styles.kpisGrid}>
          <KPICard title="Products in Stock" value={kpis.total_products_in_stock} color="#10b981" />
          <KPICard title="Low/Out of Stock" value={kpis.low_stock_out_of_stock_count} color="#ef4444" />
          <KPICard title="Pending Receipts" value={kpis.pending_receipts_count} color="#f59e0b" />
          <KPICard title="Pending Deliveries" value={kpis.pending_deliveries_count} color="#3b82f6" />
          <KPICard title="Scheduled Transfers" value={kpis.scheduled_internal_transfers_count} color="#8b5cf6" />
        </View>
      ) : null}

      {/* TODO: Add movements list or charts based on filters */}
      <View style={styles.content}>
        <Text style={styles.placeholderText>Movements list will be shown here based on filters</Text>
      </View>
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
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  kpisGrid: {
    padding: 12,
    gap: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 20,
  },
});