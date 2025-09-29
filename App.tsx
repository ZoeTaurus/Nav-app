import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import RouteSelectionScreen from './src/screens/RouteSelectionScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Providers
import { LocationProvider } from './src/context/LocationContext';
import { RouteProvider } from './src/context/RouteContext';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <LocationProvider>
      <RouteProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Tab.Navigator
            initialRouteName="Home"
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Home') {
                  iconName = 'home';
                } else if (route.name === 'Routes') {
                  iconName = 'map';
                } else if (route.name === 'Track') {
                  iconName = 'gps-fixed';
                } else if (route.name === 'Analytics') {
                  iconName = 'analytics';
                } else if (route.name === 'Settings') {
                  iconName = 'settings';
                }

                return <Icon name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#007AFF',
              tabBarInactiveTintColor: 'gray',
              headerStyle: {
                backgroundColor: '#007AFF',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            })}
          >
            <Tab.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Dashboard' }}
            />
            <Tab.Screen 
              name="Routes" 
              component={RouteSelectionScreen}
              options={{ title: 'Select Route' }}
            />
            <Tab.Screen 
              name="Track" 
              component={TrackingScreen}
              options={{ title: 'Track Journey' }}
            />
            <Tab.Screen 
              name="Analytics" 
              component={AnalyticsScreen}
              options={{ title: 'Route Analytics' }}
            />
            <Tab.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </RouteProvider>
    </LocationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
