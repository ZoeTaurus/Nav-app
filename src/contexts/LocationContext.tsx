import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNotification } from './NotificationContext';

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
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unsupported';
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  clearHistory: () => void;
  requestLocationPermission: () => Promise<boolean>;
  getCurrentPosition: () => Promise<LocationData | null>;
  simulateMovement: (start: LocationData, end: LocationData, duration: number) => void;
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
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { showNotification } = useNotification();

  useEffect(() => {
    checkLocationSupport();
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
    };
  }, [watchId, simulationInterval]);

  const checkLocationSupport = async () => {
    if (!navigator.geolocation) {
      setPermissionStatus('unsupported');
      showNotification('Geolocation is not supported by this browser', 'error');
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(permission.state as any);
      setHasLocationPermission(permission.state === 'granted');
      
      permission.addEventListener('change', () => {
        setPermissionStatus(permission.state as any);
        setHasLocationPermission(permission.state === 'granted');
      });
    } catch (error) {
      console.log('Permissions API not supported, falling back to direct geolocation');
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      showNotification('Geolocation is not supported', 'error');
      return false;
    }

    try {
      const position = await getCurrentPositionPromise();
      setHasLocationPermission(true);
      setPermissionStatus('granted');
      setCurrentLocation(formatPosition(position));
      showNotification('Location access granted', 'success');
      return true;
    } catch (error: any) {
      console.error('Location permission error:', error);
      setHasLocationPermission(false);
      
      if (error.code === error.PERMISSION_DENIED) {
        setPermissionStatus('denied');
        showNotification('Location access denied. Please enable location in your browser settings.', 'error');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        showNotification('Location information is unavailable', 'error');
      } else if (error.code === error.TIMEOUT) {
        showNotification('Location request timed out', 'error');
      } else {
        showNotification('Failed to get location access', 'error');
      }
      
      return false;
    }
  };

  const getCurrentPosition = async (): Promise<LocationData | null> => {
    if (!hasLocationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return null;
    }

    try {
      const position = await getCurrentPositionPromise();
      const locationData = formatPosition(position);
      setCurrentLocation(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting current position:', error);
      showNotification('Failed to get current location', 'error');
      return null;
    }
  };

  const startTracking = async () => {
    if (!hasLocationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }

    if (isTracking) return;

    try {
      setIsTracking(true);
      setLocationHistory([]);
      
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const locationData = formatPosition(position);
          setCurrentLocation(locationData);
          setLocationHistory(prev => [...prev, locationData]);
        },
        (error) => {
          console.error('Tracking error:', error);
          showNotification('Location tracking error', 'error');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
      
      setWatchId(id);
      showNotification('Location tracking started', 'success');
    } catch (error) {
      console.error('Error starting tracking:', error);
      setIsTracking(false);
      showNotification('Failed to start location tracking', 'error');
    }
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    
    setIsTracking(false);
    showNotification('Location tracking stopped', 'info');
  };

  const clearHistory = () => {
    setLocationHistory([]);
    showNotification('Location history cleared', 'info');
  };

  // Simulation function for testing/demo purposes
  const simulateMovement = (start: LocationData, end: LocationData, duration: number) => {
    if (isTracking) {
      showNotification('Stop current tracking before starting simulation', 'warning');
      return;
    }

    setIsTracking(true);
    setLocationHistory([]);
    setCurrentLocation(start);
    setLocationHistory([start]);

    const steps = 50; // Number of simulation steps
    const stepDuration = duration / steps;
    const latStep = (end.latitude - start.latitude) / steps;
    const lngStep = (end.longitude - start.longitude) / steps;
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      
      if (currentStep >= steps) {
        clearInterval(interval);
        setSimulationInterval(null);
        setIsTracking(false);
        showNotification('Route simulation completed', 'success');
        return;
      }
      
      const simulatedLocation: LocationData = {
        latitude: start.latitude + (latStep * currentStep),
        longitude: start.longitude + (lngStep * currentStep),
        timestamp: Date.now(),
        speed: Math.random() * 20 + 10, // Random speed between 10-30 km/h
        accuracy: 5,
      };
      
      setCurrentLocation(simulatedLocation);
      setLocationHistory(prev => [...prev, simulatedLocation]);
    }, stepDuration);
    
    setSimulationInterval(interval);
    showNotification(`Simulating ${duration / 1000}s route`, 'info');
  };

  const value: LocationContextType = {
    currentLocation,
    isTracking,
    locationHistory,
    hasLocationPermission,
    permissionStatus,
    startTracking,
    stopTracking,
    clearHistory,
    requestLocationPermission,
    getCurrentPosition,
    simulateMovement,
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

// Helper functions
const getCurrentPositionPromise = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
};

const formatPosition = (position: GeolocationPosition): LocationData => {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    altitude: position.coords.altitude || undefined,
    accuracy: position.coords.accuracy || undefined,
    speed: position.coords.speed || undefined,
    heading: position.coords.heading || undefined,
    timestamp: position.timestamp,
  };
};
