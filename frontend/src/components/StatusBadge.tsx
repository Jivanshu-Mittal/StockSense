import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: string;
  color?: string; // Optional color override
}

export const StatusBadge = ({ status, color }: StatusBadgeProps) => {
  // Define status colors and labels
  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: '#6b7280' }, // gray
    waiting: { label: 'Waiting', color: '#f59e0b' }, // amber
    ready: { label: 'Ready', color: '#3b82f6' }, // blue
    done: { label: 'Done', color: '#10b981' }, // emerald
    canceled: { label: 'Canceled', color: '#ef4444' }, // red
    'out-of-stock': { label: 'Out of Stock', color: '#ef4444' }, // red
    'low-stock': { label: 'Low Stock', color: '#f59e0b' }, // amber
  };

  // Use provided color or look up from config
  const badgeColor = color || statusConfig[status.toLowerCase()]?.color || '#6b7280';
  const label = statusConfig[status.toLowerCase()]?.label || status;

  return (
    <View style={[
      styles.badge,
      { backgroundColor: badgeColor + '20' }, // 20% opacity background
      { borderColor: badgeColor },
    ]}>
      <Text style={[styles.text, { color: badgeColor }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});