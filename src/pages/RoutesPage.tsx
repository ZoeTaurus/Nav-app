import React, { useState, useEffect } from 'react';
import { PlusIcon, MapIcon, TrashIcon, EditIcon } from 'lucide-react';
import { useRoute, Route } from '../contexts/RouteContext';
import { useLocation } from '../contexts/LocationContext';

export const RoutesPage: React.FC = () => {
  const { routes, selectedRoute, loading, fetchRoutes, selectRoute, deleteRoute } = useRoute();
  const { currentLocation, getCurrentPosition } = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleDeleteRoute = async (route: Route) => {
    if (window.confirm(`Are you sure you want to delete "${route.name}"?`)) {
      try {
        await deleteRoute(route.id);
      } catch (error) {
        console.error('Failed to delete route:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
        <span className="ml-3 text-gray-600">Loading routes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Routes</h1>
          <p className="mt-1 text-gray-600">Manage your saved routes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Route
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="text-center py-12">
          <MapIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No routes</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new route.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Route
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              isSelected={selectedRoute?.id === route.id}
              onSelect={() => selectRoute(route)}
              onDelete={() => handleDeleteRoute(route)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateRouteModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

interface RouteCardProps {
  route: Route;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, isSelected, onSelect, onDelete }) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
      }`}
      onClick={onSelect}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
              {route.name}
            </h3>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium">From:</span> {route.startPoint.address}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">To:</span> {route.endPoint.address}
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Created: {new Date(route.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            {isSelected && (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreateRouteModalProps {
  onClose: () => void;
}

const CreateRouteModal: React.FC<CreateRouteModalProps> = ({ onClose }) => {
  const [routeName, setRouteName] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [startCoords, setStartCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [endCoords, setEndCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createRoute } = useRoute();
  const { getCurrentPosition } = useLocation();

  const useCurrentLocation = async (isStart: boolean) => {
    const location = await getCurrentPosition();
    if (location) {
      if (isStart) {
        setStartCoords({ latitude: location.latitude, longitude: location.longitude });
        setStartAddress('Current Location');
      } else {
        setEndCoords({ latitude: location.latitude, longitude: location.longitude });
        setEndAddress('Current Location');
      }
    }
  };

  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
    // In a real app, you'd use a geocoding service like Google Maps Geocoding API
    // For now, we'll use a simple mock or return null
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!routeName.trim() || !startAddress.trim() || !endAddress.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Try to geocode addresses if coordinates aren't set
      let finalStartCoords = startCoords;
      let finalEndCoords = endCoords;

      if (!finalStartCoords && startAddress !== 'Current Location') {
        finalStartCoords = await geocodeAddress(startAddress);
      }

      if (!finalEndCoords && endAddress !== 'Current Location') {
        finalEndCoords = await geocodeAddress(endAddress);
      }

      // Use default coordinates if geocoding fails
      if (!finalStartCoords) {
        finalStartCoords = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
      }
      if (!finalEndCoords) {
        finalEndCoords = { latitude: 37.7849, longitude: -122.4094 }; // Nearby location
      }

      await createRoute({
        name: routeName,
        startPoint: {
          latitude: finalStartCoords.latitude,
          longitude: finalStartCoords.longitude,
          address: startAddress,
        },
        endPoint: {
          latitude: finalEndCoords.latitude,
          longitude: finalEndCoords.longitude,
          address: endAddress,
        },
      });

      onClose();
    } catch (error) {
      console.error('Failed to create route:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Route</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route Name
            </label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Home to Work"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Location
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter start address"
                required
              />
              <button
                type="button"
                onClick={() => useCurrentLocation(true)}
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                📍
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Location
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={endAddress}
                onChange={(e) => setEndAddress(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter end address"
                required
              />
              <button
                type="button"
                onClick={() => useCurrentLocation(false)}
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                📍
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
