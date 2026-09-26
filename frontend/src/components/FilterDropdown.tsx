import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';

interface FilterDropdownProps<T> {
  label: string;
  options: T[];
  selectedOption: T | null;
  onOptionSelect: (option: T) => void;
  renderOption: (option: T) => string; // Function to render option as string
  placeholder?: string;
}

export const FilterDropdown = <T,>({
  label,
  options,
  selectedOption,
  onOptionSelect,
  renderOption,
  placeholder = 'Select...',
}: FilterDropdownProps<T>) => {
  const [modalVisible, setModalVisible] = useState(false);

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  const renderItem = ({ item }: { item: T }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => {
        onOptionSelect(item);
        setModalVisible(false);
      }}
    >
      <Text style={styles.dropdownItemText}>{renderOption(item)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.dropdownButton} onPress={toggleModal}>
        <Text style={styles.dropdownButtonText}>
          {selectedOption ? renderOption(selectedOption) : placeholder}
        </Text>
        {/* Dropdown arrow */}
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        style={styles.modalContainer}
      >
        <Pressable style={styles.modalBackdrop} onPress={toggleModal} />
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>{label}</Text>
          <FlatList
            data={options}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            style={styles.modalList}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  dropdownButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownArrow: {
    fontSize: 18,
    color: '#6b7280',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    margin: 0,
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
    maxHeight: '50%',
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  modalList: {
    marginBottom: 20,
  },
});