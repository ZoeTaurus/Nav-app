import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
  accuracy?: number;
}

export interface SpeedBumpData {
  latitude: number;
  longitude: number;
  intensity: number; // 1-10 scale
  timestamp: number;
  userId: string;
}

export interface TrafficData {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: number;
  userId: string;
  timeOfDay: string;
  dayOfWeek: string;
}

export interface Route {
  id: string;
  name: string;
  startPoint: { latitude: number; longitude: number; address: string };
  endPoint: { latitude: number; longitude: number; address: string };
  waypoints?: { latitude: number; longitude: number }[];
  createdAt: number;
}

export interface RouteSession {
  id: string;
  routeId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  distance: number;
  averageSpeed: number;
  maxSpeed: number;
  points: RoutePoint[];
  speedBumps: SpeedBumpData[];
  trafficData: TrafficData[];
  completed: boolean;
}

export interface RouteAnalytics {
  routeId: string;
  totalSessions: number;
  averageDuration: number;
  averageSpeed: number;
  fastestTime: number;
  slowestTime: number;
  averageDistance: number;
  speedBumpCount: number;
  trafficHotspots: { latitude: number; longitude: number; frequency: number }[];
  bestTimeOfDay: string;
  worstTimeOfDay: string;
}

interface RouteContextType {
  routes: Route[];
  routeSessions: RouteSession[];
  currentSession: RouteSession | null;
  selectedRoute: Route | null;
  
  // Route management
  addRoute: (route: Omit<Route, 'id' | 'createdAt'>) => string;
  deleteRoute: (routeId: string) => void;
  selectRoute: (route: Route) => void;
  
  // Session management
  startSession: (routeId: string) => string;
  endSession: (sessionId: string) => void;
  addPointToSession: (sessionId: string, point: RoutePoint) => void;
  addSpeedBumpToSession: (sessionId: string, speedBump: Omit<SpeedBumpData, 'userId'>) => void;
  addTrafficDataToSession: (sessionId: string, trafficData: Omit<TrafficData, 'userId'>) => void;
  
  // Analytics
  getRouteAnalytics: (routeId: string) => RouteAnalytics | null;
  getRouteSessions: (routeId: string) => RouteSession[];
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

interface RouteProviderProps {
  children: ReactNode;
}

export const RouteProvider: React.FC<RouteProviderProps> = ({ children }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeSessions, setRouteSessions] = useState<RouteSession[]>([]);
  const [currentSession, setCurrentSession] = useState<RouteSession | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const addRoute = (routeData: Omit<Route, 'id' | 'createdAt'>): string => {
    const newRoute: Route = {
      ...routeData,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    
    setRoutes(prev => [...prev, newRoute]);
    return newRoute.id;
  };

  const deleteRoute = (routeId: string) => {
    setRoutes(prev => prev.filter(route => route.id !== routeId));
    setRouteSessions(prev => prev.filter(session => session.routeId !== routeId));
    
    if (selectedRoute?.id === routeId) {
      setSelectedRoute(null);
    }
    
    if (currentSession?.routeId === routeId) {
      setCurrentSession(null);
    }
  };

  const selectRoute = (route: Route) => {
    setSelectedRoute(route);
  };

  const startSession = (routeId: string): string => {
    const newSession: RouteSession = {
      id: uuidv4(),
      routeId,
      startTime: Date.now(),
      distance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      points: [],
      speedBumps: [],
      trafficData: [],
      completed: false,
    };
    
    setCurrentSession(newSession);
    setRouteSessions(prev => [...prev, newSession]);
    return newSession.id;
  };

  const endSession = (sessionId: string) => {
    setRouteSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        const endTime = Date.now();
        const duration = endTime - session.startTime;
        
        // Calculate final metrics
        const speeds = session.points.map(p => p.speed || 0).filter(s => s > 0);
        const averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
        const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
        
        return {
          ...session,
          endTime,
          duration,
          averageSpeed,
          maxSpeed,
          completed: true,
        };
      }
      return session;
    }));
    
    setCurrentSession(null);
  };

  const addPointToSession = (sessionId: string, point: RoutePoint) => {
    setRouteSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        const newPoints = [...session.points, point];
        
        // Calculate distance using Haversine formula
        let distance = session.distance;
        if (session.points.length > 0) {
          const lastPoint = session.points[session.points.length - 1];
          distance += calculateDistance(
            lastPoint.latitude,
            lastPoint.longitude,
            point.latitude,
            point.longitude
          );
        }
        
        return {
          ...session,
          points: newPoints,
          distance,
        };
      }
      return session;
    }));
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => {
        if (!prev) return null;
        
        const newPoints = [...prev.points, point];
        let distance = prev.distance;
        
        if (prev.points.length > 0) {
          const lastPoint = prev.points[prev.points.length - 1];
          distance += calculateDistance(
            lastPoint.latitude,
            lastPoint.longitude,
            point.latitude,
            point.longitude
          );
        }
        
        return {
          ...prev,
          points: newPoints,
          distance,
        };
      });
    }
  };

  const addSpeedBumpToSession = (sessionId: string, speedBumpData: Omit<SpeedBumpData, 'userId'>) => {
    const speedBump: SpeedBumpData = {
      ...speedBumpData,
      userId: 'current-user', // In a real app, this would be the actual user ID
    };
    
    setRouteSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          speedBumps: [...session.speedBumps, speedBump],
        };
      }
      return session;
    }));
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          speedBumps: [...prev.speedBumps, speedBump],
        };
      });
    }
  };

  const addTrafficDataToSession = (sessionId: string, trafficDataInput: Omit<TrafficData, 'userId'>) => {
    const trafficData: TrafficData = {
      ...trafficDataInput,
      userId: 'current-user', // In a real app, this would be the actual user ID
    };
    
    setRouteSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          trafficData: [...session.trafficData, trafficData],
        };
      }
      return session;
    }));
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          trafficData: [...prev.trafficData, trafficData],
        };
      });
    }
  };

  const getRouteAnalytics = (routeId: string): RouteAnalytics | null => {
    const sessions = routeSessions.filter(s => s.routeId === routeId && s.completed);
    
    if (sessions.length === 0) return null;
    
    const durations = sessions.map(s => s.duration || 0).filter(d => d > 0);
    const speeds = sessions.map(s => s.averageSpeed).filter(s => s > 0);
    const distances = sessions.map(s => s.distance);
    
    // Calculate traffic hotspots
    const allTrafficData = sessions.flatMap(s => s.trafficData);
    const trafficHotspots = calculateTrafficHotspots(allTrafficData);
    
    // Calculate best/worst times of day
    const timeAnalysis = calculateTimeAnalysis(sessions);
    
    return {
      routeId,
      totalSessions: sessions.length,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      averageSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      fastestTime: durations.length > 0 ? Math.min(...durations) : 0,
      slowestTime: durations.length > 0 ? Math.max(...durations) : 0,
      averageDistance: distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0,
      speedBumpCount: sessions.reduce((total, s) => total + s.speedBumps.length, 0),
      trafficHotspots,
      bestTimeOfDay: timeAnalysis.bestTime,
      worstTimeOfDay: timeAnalysis.worstTime,
    };
  };

  const getRouteSessions = (routeId: string): RouteSession[] => {
    return routeSessions.filter(s => s.routeId === routeId);
  };

  const value: RouteContextType = {
    routes,
    routeSessions,
    currentSession,
    selectedRoute,
    addRoute,
    deleteRoute,
    selectRoute,
    startSession,
    endSession,
    addPointToSession,
    addSpeedBumpToSession,
    addTrafficDataToSession,
    getRouteAnalytics,
    getRouteSessions,
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

// Utility functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateTrafficHotspots(trafficData: TrafficData[]): { latitude: number; longitude: number; frequency: number }[] {
  const hotspots = new Map<string, { latitude: number; longitude: number; count: number }>();
  
  trafficData.forEach(data => {
    // Group by approximate location (round to 4 decimal places ~ 11m precision)
    const key = `${data.latitude.toFixed(4)},${data.longitude.toFixed(4)}`;
    
    if (hotspots.has(key)) {
      const existing = hotspots.get(key)!;
      hotspots.set(key, { ...existing, count: existing.count + 1 });
    } else {
      hotspots.set(key, {
        latitude: data.latitude,
        longitude: data.longitude,
        count: 1,
      });
    }
  });
  
  return Array.from(hotspots.values())
    .map(h => ({ ...h, frequency: h.count }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10); // Top 10 hotspots
}

function calculateTimeAnalysis(sessions: RouteSession[]): { bestTime: string; worstTime: string } {
  const hourlyPerformance = new Map<number, { totalTime: number; count: number }>();
  
  sessions.forEach(session => {
    if (session.duration) {
      const hour = new Date(session.startTime).getHours();
      
      if (hourlyPerformance.has(hour)) {
        const existing = hourlyPerformance.get(hour)!;
        hourlyPerformance.set(hour, {
          totalTime: existing.totalTime + session.duration,
          count: existing.count + 1,
        });
      } else {
        hourlyPerformance.set(hour, {
          totalTime: session.duration,
          count: 1,
        });
      }
    }
  });
  
  let bestTime = 'N/A';
  let worstTime = 'N/A';
  let bestAverage = Infinity;
  let worstAverage = 0;
  
  hourlyPerformance.forEach((data, hour) => {
    const average = data.totalTime / data.count;
    
    if (average < bestAverage) {
      bestAverage = average;
      bestTime = `${hour}:00`;
    }
    
    if (average > worstAverage) {
      worstAverage = average;
      worstTime = `${hour}:00`;
    }
  });
  
  return { bestTime, worstTime };
}
