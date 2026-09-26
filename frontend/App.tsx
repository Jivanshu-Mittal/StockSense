import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ReceiptScreen } from './src/screens/ReceiptScreen';
import { DeliveryScreen } from './src/screens/DeliveryScreen';
import { TransferScreen } from './src/screens/TransferScreen';
import { AdjustmentScreen } from './src/screens/AdjustmentScreen';
import { ProductInventoryScreen } from './src/screens/ProductInventoryScreen';
import { useAuthStore } from './src/store/authStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Receipts" component={ReceiptScreen} />
            <Stack.Screen name="Deliveries" component={DeliveryScreen} />
            <Stack.Screen name="Transfers" component={TransferScreen} />
            <Stack.Screen name="Adjustments" component={AdjustmentScreen} />
            <Stack.Screen name="Inventory" component={ProductInventoryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}