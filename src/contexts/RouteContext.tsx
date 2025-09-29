import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useNotification } from './NotificationContext';

export interface Route {
  id: string;
  name: string;
  startPoint: {
    latitude: number;
    longitude: number;
    address: string;
  };
  endPoint: {
    latitude: number;
    longitude: number;
    address: string;
  };
  waypoints?: Array<{ latitude: number; longitude: number }>;
  createdAt: number;
  userId?: string;
}

interface RouteContextType {
  routes: Route[];
  selectedRoute: Route | null;
  loading: boolean;
  
  // Route operations
  fetchRoutes: () => Promise<void>;
  createRoute: (route: Omit<Route, 'id' | 'createdAt'>) => Promise<string>;
  updateRoute: (id: string, route: Partial<Route>) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  selectRoute: (route: Route | null) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

interface RouteProviderProps {
  children: ReactNode;
}

export const RouteProvider: React.FC<RouteProviderProps> = ({ children }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { showNotification } = useNotification();

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/routes');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data);
      } else {
        throw new Error('Failed to fetch routes');
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      showNotification('Failed to load routes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createRoute = async (routeData: Omit<Route, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeData),
      });

      if (response.ok) {
        const newRoute = await response.json();
        setRoutes(prev => [newRoute, ...prev]);
        showNotification('Route created successfully', 'success');
        return newRoute.id;
      } else {
        throw new Error('Failed to create route');
      }
    } catch (error) {
      console.error('Error creating route:', error);
      showNotification('Failed to create route', 'error');
      throw error;
    }
  };

  const updateRoute = async (id: string, routeData: Partial<Route>) => {
    try {
      const response = await fetch(`/api/routes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeData),
      });

      if (response.ok) {
        const updatedRoute = await response.json();
        setRoutes(prev => prev.map(route => route.id === id ? updatedRoute : route));
        
        if (selectedRoute?.id === id) {
          setSelectedRoute(updatedRoute);
        }
        
        showNotification('Route updated successfully', 'success');
      } else {
        throw new Error('Failed to update route');
      }
    } catch (error) {
      console.error('Error updating route:', error);
      showNotification('Failed to update route', 'error');
      throw error;
    }
  };

  const deleteRoute = async (id: string) => {
    try {
      const response = await fetch(`/api/routes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRoutes(prev => prev.filter(route => route.id !== id));
        
        if (selectedRoute?.id === id) {
          setSelectedRoute(null);
        }
        
        showNotification('Route deleted successfully', 'success');
      } else {
        throw new Error('Failed to delete route');
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      showNotification('Failed to delete route', 'error');
      throw error;
    }
  };

  const selectRoute = (route: Route | null) => {
    setSelectedRoute(route);
    if (route) {
      showNotification(`Route "${route.name}" selected`, 'info');
    }
  };

  const value: RouteContextType = {
    routes,
    selectedRoute,
    loading,
    fetchRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
    selectRoute,
  };

  return (
    <RouteContext.Provider value={value}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRoute = (): RouteContextType => {
  const context = useContext(RouteContext);
  if (context === undefined) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
};
