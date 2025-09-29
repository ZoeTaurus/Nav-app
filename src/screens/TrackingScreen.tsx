import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Accelerometer } from 'expo-sensors';
import { useRoute, RoutePoint, SpeedBumpData, TrafficData } from '../context/RouteContext';
import { useLocation } from '../context/LocationContext';

const { width, height } = Dimensions.get('window');

const TrackingScreen: React.FC = () => {
  const {
    selectedRoute,
    currentSession,
    startSession,
    endSession,
    addPointToSession,
    addSpeedBumpToSession,
    addTrafficDataToSession,
  } = useRoute();
  
  const {
    currentLocation,
    isTracking,
    locationHistory,
    startTracking,
    stopTracking,
    hasLocationPermission,
    requestLocationPermission,
  } = useLocation();

  const [isRecording, setIsRecording] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    distance: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    speedBumps: 0,
  });
  
  // Accelerometer data for speed bump detection
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [accelerometerSubscription, setAccelerometerSubscription] = useState<any>(null);
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0 });
  const speedBumpThreshold = 2.5; // Threshold for detecting speed bumps
  const lastSpeedBumpTime = useRef(0);

  // Timer for updating session stats
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasLocationPermission) {
      requestLocationPermission();
    }
  }, []);

  useEffect(() => {
    // Set up accelerometer
    Accelerometer.setUpdateInterval(100); // Update every 100ms
    
    return () => {
      if (accelerometerSubscription) {
        accelerometerSubscription.remove();
      }
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);

  useEffect(() => {
    // Update session stats when currentSession changes
    if (currentSession) {
      updateSessionStats();
    }
  }, [currentSession]);

  const updateSessionStats = () => {
    if (!currentSession) return;

    const now = Date.now();
    const duration = now - currentSession.startTime;
    const distance = currentSession.distance;
    const speeds = currentSession.points.map(p => p.speed || 0).filter(s => s > 0);
    const averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

    setSessionStats({
      duration,
      distance,
      averageSpeed: averageSpeed * 3.6, // Convert m/s to km/h
      maxSpeed: maxSpeed * 3.6, // Convert m/s to km/h
      speedBumps: currentSession.speedBumps.length,
    });
  };

  const startAccelerometer = () => {
    const subscription = Accelerometer.addListener(accelerometerData => {
      setAccelerometerData(accelerometerData);
      detectSpeedBump(accelerometerData);
    });
    setAccelerometerSubscription(subscription);
  };

  const stopAccelerometer = () => {
    if (accelerometerSubscription) {
      accelerometerSubscription.remove();
      setAccelerometerSubscription(null);
    }
  };

  const detectSpeedBump = (accelData: { x: number; y: number; z: number }) => {
    // Calculate the magnitude of acceleration change
    const deltaX = Math.abs(accelData.x - lastAcceleration.current.x);
    const deltaY = Math.abs(accelData.y - lastAcceleration.current.y);
    const deltaZ = Math.abs(accelData.z - lastAcceleration.current.z);
    
    const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
    
    // Detect speed bump if acceleration change is above threshold
    if (magnitude > speedBumpThreshold && currentLocation && currentSession) {
      const now = Date.now();
      
      // Prevent multiple detections within 5 seconds
      if (now - lastSpeedBumpTime.current > 5000) {
        lastSpeedBumpTime.current = now;
        
        const speedBump: Omit<SpeedBumpData, 'userId'> = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          intensity: Math.min(Math.round(magnitude), 10),
          timestamp: now,
        };
        
        addSpeedBumpToSession(currentSession.id, speedBump);
      }
    }
    
    lastAcceleration.current = accelData;
  };

  const handleStartTracking = async () => {
    if (!selectedRoute) {
      Alert.alert('No Route Selected', 'Please select a route before starting tracking.');
      return;
    }

    if (!hasLocationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }

    try {
      await startTracking();
      const sessionId = startSession(selectedRoute.id);
      setIsRecording(true);
      startAccelerometer();
      
      // Start timer to update stats every second
      const intervalId = setInterval(updateSessionStats, 1000);
      setTimer(intervalId);
      
      Alert.alert('Tracking Started', 'Your journey is now being recorded.');
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start tracking. Please try again.');
    }
  };

  const handleStopTracking = () => {
    if (!currentSession) return;

    Alert.alert(
      'Stop Tracking',
      'Are you sure you want to stop tracking? Your session will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'default',
          onPress: () => {
            stopTracking();
            endSession(currentSession.id);
            setIsRecording(false);
            stopAccelerometer();
            
            if (timer) {
              clearInterval(timer);
              setTimer(null);
            }
            
            Alert.alert('Session Saved', 'Your journey has been recorded and saved.');
          },
        },
      ]
    );
  };

  // Add location points to session
  useEffect(() => {
    if (currentLocation && currentSession && isRecording) {
      const point: RoutePoint = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        timestamp: currentLocation.timestamp,
        speed: currentLocation.speed || undefined,
        accuracy: currentLocation.accuracy || undefined,
      };
      
      addPointToSession(currentSession.id, point);
      
      // Add traffic data
      const now = new Date();
      const trafficData: Omit<TrafficData, 'userId'> = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        speed: (currentLocation.speed || 0) * 3.6, // Convert to km/h
        timestamp: currentLocation.timestamp,
        timeOfDay: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      };
      
      addTrafficDataToSession(currentSession.id, trafficData);
    }
  }, [currentLocation]);

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  };

  const StatCard: React.FC<{ icon: string; title: string; value: string; unit?: string }> = ({
    icon,
    title,
    value,
    unit,
  }) => (
    <View style={styles.statCard}>
      <Icon name={icon} size={24} color="#007AFF" />
      <Text style={styles.statValue}>{value}</Text>
      {unit && <Text style={styles.statUnit}>{unit}</Text>}
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  if (!selectedRoute) {
    return (
      <View style={styles.noRouteContainer}>
        <Icon name="map" size={64} color="#ccc" />
        <Text style={styles.noRouteTitle}>No Route Selected</Text>
        <Text style={styles.noRouteSubtitle}>
          Go to the Routes tab and select a route to start tracking
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: selectedRoute.startPoint.latitude,
          longitude: selectedRoute.startPoint.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        followsUserLocation={isRecording}
      >
        {/* Route markers */}
        <Marker
          coordinate={selectedRoute.startPoint}
          title="Start"
          description={selectedRoute.startPoint.address}
          pinColor="green"
        />
        <Marker
          coordinate={selectedRoute.endPoint}
          title="End"
          description={selectedRoute.endPoint.address}
          pinColor="red"
        />
        
        {/* Route line */}
        <Polyline
          coordinates={[selectedRoute.startPoint, selectedRoute.endPoint]}
          strokeColor="#007AFF"
          strokeWidth={3}
          lineDashPattern={[5, 5]}
        />
        
        {/* Tracked path */}
        {currentSession && currentSession.points.length > 1 && (
          <Polyline
            coordinates={currentSession.points}
            strokeColor="#FF3B30"
            strokeWidth={4}
          />
        )}
        
        {/* Speed bumps */}
        {currentSession?.speedBumps.map((speedBump, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: speedBump.latitude,
              longitude: speedBump.longitude,
            }}
            title={`Speed Bump (${speedBump.intensity}/10)`}
            pinColor="orange"
          >
            <View style={styles.speedBumpMarker}>
              <Icon name="warning" size={16} color="white" />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.controlsContainer}>
        {/* Route info */}
        <View style={styles.routeInfo}>
          <Text style={styles.routeTitle}>{selectedRoute.name}</Text>
          <Text style={styles.routeSubtitle}>
            {selectedRoute.startPoint.address} → {selectedRoute.endPoint.address}
          </Text>
        </View>

        {/* Stats */}
        {isRecording && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.statsContainer}
          >
            <StatCard
              icon="timer"
              title="Duration"
              value={formatDuration(sessionStats.duration)}
            />
            <StatCard
              icon="straighten"
              title="Distance"
              value={(sessionStats.distance / 1000).toFixed(2)}
              unit="km"
            />
            <StatCard
              icon="speed"
              title="Avg Speed"
              value={sessionStats.averageSpeed.toFixed(1)}
              unit="km/h"
            />
            <StatCard
              icon="trending-up"
              title="Max Speed"
              value={sessionStats.maxSpeed.toFixed(1)}
              unit="km/h"
            />
            <StatCard
              icon="warning"
              title="Speed Bumps"
              value={sessionStats.speedBumps.toString()}
            />
          </ScrollView>
        )}

        {/* Accelerometer data (for development) */}
        {isRecording && (
          <View style={styles.sensorData}>
            <Text style={styles.sensorTitle}>Accelerometer</Text>
            <Text style={styles.sensorValue}>
              X: {accelerometerData.x.toFixed(2)} | 
              Y: {accelerometerData.y.toFixed(2)} | 
              Z: {accelerometerData.z.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Control buttons */}
        <View style={styles.buttonContainer}>
          {!isRecording ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartTracking}
            >
              <Icon name="play-arrow" size={32} color="white" />
              <Text style={styles.buttonText}>Start Tracking</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopTracking}
            >
              <Icon name="stop" size={32} color="white" />
              <Text style={styles.buttonText}>Stop Tracking</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  noRouteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32,
  },
  noRouteTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  noRouteSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  controlsContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  routeInfo: {
    marginBottom: 20,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statUnit: {
    fontSize: 12,
    color: '#666',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  sensorData: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  sensorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  speedBumpMarker: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TrackingScreen;
