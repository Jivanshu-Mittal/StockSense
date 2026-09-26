import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: React.ComponentType<any>; // Optional icon component
  color?: string;
}

export const KPICard = ({ title, value, icon, color = '#2563eb' }: KPICardProps) => {
  return (
    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
      {icon && <View style={styles.iconContainer}>{/* <icon /> */}</View>}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
  },
});