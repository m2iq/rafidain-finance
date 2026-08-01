import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { MapPin, ChevronDown, Check, X } from 'lucide-react-native';
import { IRAQ_GOVERNORATES, Governorate } from '../constants/iraqLocations';

interface IraqLocationPickerProps {
  selectedGovernorate: string;
  selectedDistrict: string;
  onSelect: (govName: string, districtName: string) => void;
}

export default function IraqLocationPicker({
  selectedGovernorate,
  selectedDistrict,
  onSelect,
}: IraqLocationPickerProps) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeGovIndex, setActiveGovIndex] = useState(0);
  const [tempDistrict, setTempDistrict] = useState(selectedDistrict);

  const currentGov = IRAQ_GOVERNORATES[activeGovIndex];

  const handleSelectDistrict = (district: string) => {
    setTempDistrict(district);
    onSelect(currentGov.name, district);
    setModalVisible(false);
  };

  const displayValue = selectedGovernorate
    ? `${selectedGovernorate} - ${selectedDistrict || 'جميع المناطق'}`
    : 'اختر المحافظة والمنطقة...';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
        style={[
          styles.pickerTrigger,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.triggerLeft}>
          <MapPin size={20} color={theme.colors.primary} />
          <Text
            variant="bodyMedium"
            style={{
              color: selectedGovernorate ? theme.colors.onSurface : theme.colors.outline,
              marginRight: 8,
              fontFamily: 'Cairo_600SemiBold',
            }}
          >
            {displayValue}
          </Text>
        </View>
        <ChevronDown size={18} color={theme.colors.outline} />
      </TouchableOpacity>

      {/* Modal - اختيار المحافظة والمنطقة */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.titleRow}>
                <MapPin size={22} color={theme.colors.primary} />
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontFamily: 'Cairo_700Bold' }}>
                  اختر المحافظة والمنطقة
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            {/* Split View: Governorates List on Left/Right & Districts on the side */}
            <View style={styles.bodyRow}>
              {/* Governorates Scroll */}
              <View style={[styles.govList, { borderLeftWidth: 1, borderLeftColor: theme.colors.outlineVariant }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {IRAQ_GOVERNORATES.map((gov, idx) => {
                    const isSelected = activeGovIndex === idx;
                    return (
                      <TouchableOpacity
                        key={gov.id}
                        onPress={() => setActiveGovIndex(idx)}
                        style={[
                          styles.govItem,
                          isSelected && { backgroundColor: theme.colors.primaryContainer },
                        ]}
                      >
                        <Text
                          variant="bodyMedium"
                          style={{
                            color: isSelected ? theme.colors.primary : theme.colors.onSurface,
                            fontFamily: isSelected ? 'Cairo_700Bold' : 'Cairo_600SemiBold',
                            fontSize: 13,
                          }}
                        >
                          {gov.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Districts List */}
              <View style={styles.districtList}>
                <Text variant="labelMedium" style={{ color: theme.colors.outline, paddingHorizontal: 12, paddingVertical: 8 }}>
                  مناطق {currentGov.name}:
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {currentGov.districts.map((district) => {
                    const isPicked = selectedGovernorate === currentGov.name && selectedDistrict === district;
                    return (
                      <TouchableOpacity
                        key={district}
                        onPress={() => handleSelectDistrict(district)}
                        style={[
                          styles.districtItem,
                          isPicked && { backgroundColor: theme.dark ? '#064E3B' : '#DCFCE7' },
                        ]}
                      >
                        <Text
                          variant="bodyMedium"
                          style={{
                            color: isPicked ? '#16A34A' : theme.colors.onSurface,
                            fontFamily: isPicked ? 'Cairo_700Bold' : 'Cairo_400Regular',
                            fontSize: 13,
                          }}
                        >
                          {district}
                        </Text>
                        {isPicked && <Check size={16} color="#16A34A" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    height: 480,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    padding: 4,
  },
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
  },
  govList: {
    width: '38%',
    paddingVertical: 4,
  },
  govItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  districtList: {
    flex: 1,
    paddingVertical: 4,
  },
  districtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
