import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, FAB, useTheme, Card, Avatar, IconButton } from 'react-native-paper';
import { CustomerRepository, Customer } from '../../src/core/database/repositories/CustomerRepository';
import { useFocusEffect } from 'expo-router';

export default function CustomersScreen() {
  const theme = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [])
  );

  const loadCustomers = () => {
    try {
      const data = CustomerRepository.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <Card style={styles.card} onPress={() => {}}>
      <Card.Title
        title={item.name}
        subtitle={item.phone || 'No phone number'}
        left={(props) => <Avatar.Text {...props} label={item.name.substring(0, 2).toUpperCase()} />}
        right={(props) => <IconButton {...props} icon="chevron-right" onPress={() => {}} />}
      />
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No customers found. Add your first customer!
            </Text>
          </View>
        }
      />
      
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
        color={theme.colors.onPrimaryContainer}
        onPress={() => {
          // Temporarily mock creating a customer
          CustomerRepository.create({
            store_id: 'local-store',
            name: `Test Customer ${Math.floor(Math.random() * 1000)}`,
            phone: '07700000000',
            address: 'Baghdad',
            notes: '',
            status: 'active'
          });
          loadCustomers();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
