import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

interface LocationContextType {
  currentLocation: LocationData | null;
  isTracking: boolean;
  locationHistory: LocationData[];
  hasLocationPermission: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  clearHistory: () => void;
  requestLocationPermission: () => Promise<boolean>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasLocationPermission(true);
        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude || undefined,
          accuracy: location.coords.accuracy || undefined,
          speed: location.coords.speed || undefined,
          heading: location.coords.heading || undefined,
          timestamp: location.timestamp,
        });
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        setHasLocationPermission(true);
        
        if (backgroundStatus.status !== 'granted') {
          Alert.alert(
            'Background Location',
            'For best tracking experience, please enable background location access in settings.',
            [{ text: 'OK' }]
          );
        }
        return true;
      } else {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to track your routes and measure travel times.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const startTracking = async () => {
    if (!hasLocationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }

    try {
      setIsTracking(true);
      
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude || undefined,
            accuracy: location.coords.accuracy || undefined,
            speed: location.coords.speed || undefined,
            heading: location.coords.heading || undefined,
            timestamp: location.timestamp,
          };
          
          setCurrentLocation(locationData);
          setLocationHistory(prev => [...prev, locationData]);
        }
      );
      
      setLocationSubscription(subscription);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsTracking(false);
  };

  const clearHistory = () => {
    setLocationHistory([]);
  };

  const value: LocationContextType = {
    currentLocation,
    isTracking,
    locationHistory,
    hasLocationPermission,
    startTracking,
    stopTracking,
    clearHistory,
    requestLocationPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
