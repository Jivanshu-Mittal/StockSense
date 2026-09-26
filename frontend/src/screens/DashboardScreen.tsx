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
type DocumentType = 'all' | 'receipt' | 'delivery' | 'internal' | 'adjustment';
type Status = 'all' | 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';
type FilterOption<T extends string> = { value: T; label: string };
type Location = { id: number; name: string; is_virtual?: boolean };
type LocationFilterOption = { id: number | null; name: string };
type DashboardKpis = {
  total_products_in_stock: number;
  low_stock_out_of_stock_count: number;
  pending_receipts_count: number;
  pending_deliveries_count: number;
  scheduled_internal_transfers_count: number;
};

const DOCUMENT_TYPES: FilterOption<DocumentType>[] = [
  { value: 'all', label: 'All Types' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'internal', label: 'Internal Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
];

const STATUSES: FilterOption<Status>[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'ready', label: 'Ready' },
  { value: 'done', label: 'Done' },
  { value: 'canceled', label: 'Canceled' },
];

export const DashboardScreen = () => {
  const { isAuthenticated } = useAuthStore();
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedDocType, setSelectedDocType] = useState(DOCUMENT_TYPES[0]);
  const [selectedStatus, setSelectedStatus] = useState(STATUSES[0]);
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

  const locationOptions: LocationFilterOption[] = [
    { id: null, name: 'All Locations' },
    ...locations,
  ];
  const selectedLocationOption =
    locationOptions.find((location) => location.id === selectedLocation) ?? locationOptions[0];
  const categoryOptions = ['All Categories', ...categories];
  const selectedCategoryOption = selectedCategory ?? 'All Categories';

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
            onOptionSelect={(option) => setSelectedDocType(option)}
            renderOption={(option) => option.label}
          />
          <FilterDropdown
            label="Status"
            options={STATUSES}
            selectedOption={selectedStatus}
            onOptionSelect={(option) => setSelectedStatus(option)}
            renderOption={(option) => option.label}
          />
          <FilterDropdown
            label="Location"
            options={locationOptions}
            selectedOption={selectedLocationOption}
            onOptionSelect={(option) => setSelectedLocation(option.id)}
            renderOption={(option) => option.name}
          />
          <FilterDropdown
            label="Category"
            options={categoryOptions}
            selectedOption={selectedCategoryOption}
            onOptionSelect={(option) => setSelectedCategory(option === 'All Categories' ? null : option)}
            renderOption={(option) => option}
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
        <Text style={styles.placeholderText}>Movements list will be shown here based on filters</Text>
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