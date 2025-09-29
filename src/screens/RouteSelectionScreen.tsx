import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute, Route } from '../context/RouteContext';
import { useLocation } from '../context/LocationContext';

const { width, height } = Dimensions.get('window');

interface CreateRouteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (route: Omit<Route, 'id' | 'createdAt'>) => void;
}

const CreateRouteModal: React.FC<CreateRouteModalProps> = ({ visible, onClose, onSave }) => {
  const [routeName, setRouteName] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [startPoint, setStartPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const { currentLocation } = useLocation();

  const handleSave = () => {
    if (!routeName.trim()) {
      Alert.alert('Error', 'Please enter a route name');
      return;
    }
    
    if (!startAddress.trim() || !endAddress.trim()) {
      Alert.alert('Error', 'Please enter both start and end addresses');
      return;
    }

    if (!startPoint || !endPoint) {
      Alert.alert('Error', 'Please set both start and end points on the map');
      return;
    }

    const newRoute: Omit<Route, 'id' | 'createdAt'> = {
      name: routeName,
      startPoint: {
        latitude: startPoint.latitude,
        longitude: startPoint.longitude,
        address: startAddress,
      },
      endPoint: {
        latitude: endPoint.latitude,
        longitude: endPoint.longitude,
        address: endAddress,
      },
    };

    onSave(newRoute);
    
    // Reset form
    setRouteName('');
    setStartAddress('');
    setEndAddress('');
    setStartPoint(null);
    setEndPoint(null);
    onClose();
  };

  const useCurrentLocation = (isStart: boolean) => {
    if (currentLocation) {
      if (isStart) {
        setStartPoint(currentLocation);
        setStartAddress('Current Location');
      } else {
        setEndPoint(currentLocation);
        setEndAddress('Current Location');
      }
    } else {
      Alert.alert('Error', 'Current location not available');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create New Route</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Route Name</Text>
            <TextInput
              style={styles.textInput}
              value={routeName}
              onChangeText={setRouteName}
              placeholder="e.g., Home to Work"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Address</Text>
            <View style={styles.addressInputContainer}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={startAddress}
                onChangeText={setStartAddress}
                placeholder="Enter start address"
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => useCurrentLocation(true)}
              >
                <Icon name="my-location" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End Address</Text>
            <View style={styles.addressInputContainer}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={endAddress}
                onChangeText={setEndAddress}
                placeholder="Enter end address"
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => useCurrentLocation(false)}
              >
                <Icon name="my-location" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mapContainer}>
            <Text style={styles.inputLabel}>Set Points on Map</Text>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: currentLocation?.latitude || 37.78825,
                longitude: currentLocation?.longitude || -122.4324,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={(event) => {
                const coordinate = event.nativeEvent.coordinate;
                if (!startPoint) {
                  setStartPoint(coordinate);
                } else if (!endPoint) {
                  setEndPoint(coordinate);
                } else {
                  // Reset and set start point
                  setStartPoint(coordinate);
                  setEndPoint(null);
                }
              }}
            >
              {startPoint && (
                <Marker
                  coordinate={startPoint}
                  title="Start"
                  pinColor="green"
                />
              )}
              {endPoint && (
                <Marker
                  coordinate={endPoint}
                  title="End"
                  pinColor="red"
                />
              )}
              {startPoint && endPoint && (
                <Polyline
                  coordinates={[startPoint, endPoint]}
                  strokeColor="#007AFF"
                  strokeWidth={3}
                />
              )}
            </MapView>
            <Text style={styles.mapInstructions}>
              Tap on the map to set start point (green), then end point (red)
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const RouteSelectionScreen: React.FC = () => {
  const { routes, addRoute, deleteRoute, selectRoute, selectedRoute } = useRoute();
  const { currentLocation } = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateRoute = (routeData: Omit<Route, 'id' | 'createdAt'>) => {
    addRoute(routeData);
    Alert.alert('Success', 'Route created successfully!');
  };

  const handleDeleteRoute = (route: Route) => {
    Alert.alert(
      'Delete Route',
      `Are you sure you want to delete "${route.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRoute(route.id),
        },
      ]
    );
  };

  const RouteCard: React.FC<{ route: Route }> = ({ route }) => {
    const isSelected = selectedRoute?.id === route.id;

    return (
      <TouchableOpacity
        style={[styles.routeCard, isSelected && styles.selectedRouteCard]}
        onPress={() => selectRoute(route)}
      >
        <View style={styles.routeCardHeader}>
          <View style={styles.routeCardTitle}>
            <Icon 
              name="route" 
              size={24} 
              color={isSelected ? "#007AFF" : "#666"} 
            />
            <Text style={[styles.routeName, isSelected && styles.selectedRouteName]}>
              {route.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteRoute(route)}
            style={styles.deleteButton}
          >
            <Icon name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.routeAddresses}>
          From: {route.startPoint.address}
        </Text>
        <Text style={styles.routeAddresses}>
          To: {route.endPoint.address}
        </Text>
        
        <Text style={styles.routeDate}>
          Created: {new Date(route.createdAt).toLocaleDateString()}
        </Text>
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Icon name="check-circle" size={16} color="#007AFF" />
            <Text style={styles.selectedText}>Selected</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Route</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Icon name="add" size={24} color="white" />
          <Text style={styles.createButtonText}>New Route</Text>
        </TouchableOpacity>
      </View>

      {currentLocation && (
        <View style={styles.locationBanner}>
          <Icon name="location-on" size={20} color="#007AFF" />
          <Text style={styles.locationText}>
            Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      <ScrollView style={styles.routesList}>
        {routes.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="add-road" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Routes Created</Text>
            <Text style={styles.emptySubtitle}>
              Create your first route to start tracking your journeys
            </Text>
            <TouchableOpacity
              style={styles.createFirstRouteButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createFirstRouteButtonText}>Create First Route</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))
        )}
      </ScrollView>

      {selectedRoute && (
        <View style={styles.selectedRouteInfo}>
          <Text style={styles.selectedRouteTitle}>
            Selected: {selectedRoute.name}
          </Text>
          <Text style={styles.selectedRouteSubtitle}>
            Go to Track tab to start measuring this route
          </Text>
        </View>
      )}

      <CreateRouteModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateRoute}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    color: '#1976D2',
    fontSize: 14,
  },
  routesList: {
    flex: 1,
    padding: 16,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedRouteCard: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  routeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  selectedRouteName: {
    color: '#007AFF',
  },
  deleteButton: {
    padding: 4,
  },
  routeAddresses: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  routeDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  selectedText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  createFirstRouteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  createFirstRouteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedRouteInfo: {
    backgroundColor: '#007AFF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  selectedRouteTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedRouteSubtitle: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationButton: {
    padding: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  mapContainer: {
    marginBottom: 20,
  },
  map: {
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  mapInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default RouteSelectionScreen;
