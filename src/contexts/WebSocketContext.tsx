import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNotification } from './NotificationContext';

interface WebSocketMessage {
  type: string;
  sessionId?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  timestamp?: number;
  intensity?: number;
  userId?: string;
  data?: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (message: WebSocketMessage) => void;
  sendLocationUpdate: (sessionId: string, latitude: number, longitude: number, speed?: number) => void;
  sendSpeedBumpDetection: (sessionId: string, latitude: number, longitude: number, intensity: number) => void;
  sendSessionUpdate: (sessionId: string, status: 'started' | 'completed' | 'paused', data?: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [reconnectTimer, setReconnectTimer] = useState<NodeJS.Timeout | null>(null);
  
  const { showNotification } = useNotification();
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback(() => {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }

    setConnectionStatus('connecting');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        showNotification('Real-time connection established', 'success');
      };
      
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setIsConnected(false);
      };
      
      setWs(websocket);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  }, [ws, reconnectAttempts, showNotification]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      showNotification('Failed to establish real-time connection after multiple attempts', 'error');
      return;
    }

    setReconnectAttempts(prev => prev + 1);
    
    const timer = setTimeout(() => {
      console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      connect();
    }, reconnectDelay);
    
    setReconnectTimer(timer);
  }, [reconnectAttempts, connect, showNotification]);

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket handshake completed');
        break;
        
      case 'live_location':
        // Handle live location updates from other users
        console.log('Live location update:', message);
        break;
        
      case 'community_speed_bump':
        // Handle community speed bump reports
        showNotification(`Speed bump reported at ${message.latitude?.toFixed(4)}, ${message.longitude?.toFixed(4)}`, 'info');
        break;
        
      case 'session_status':
        // Handle session status updates
        console.log('Session status update:', message);
        break;
        
      case 'notification':
        // Handle server notifications
        if (message.data?.message) {
          showNotification(message.data.message, message.data.type || 'info');
        }
        break;
        
      case 'error':
        showNotification(message.data?.message || 'WebSocket error', 'error');
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          ...message,
          timestamp: message.timestamp || Date.now(),
        }));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        showNotification('Failed to send real-time update', 'error');
      }
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }, [ws, showNotification]);

  const sendLocationUpdate = useCallback((sessionId: string, latitude: number, longitude: number, speed?: number) => {
    sendMessage({
      type: 'location_update',
      sessionId,
      latitude,
      longitude,
      speed,
    });
  }, [sendMessage]);

  const sendSpeedBumpDetection = useCallback((sessionId: string, latitude: number, longitude: number, intensity: number) => {
    sendMessage({
      type: 'speed_bump_detected',
      sessionId,
      latitude,
      longitude,
      intensity,
    });
  }, [sendMessage]);

  const sendSessionUpdate = useCallback((sessionId: string, status: 'started' | 'completed' | 'paused', data?: any) => {
    sendMessage({
      type: 'session_update',
      sessionId,
      data: { status, ...data },
    });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    sendMessage,
    sendLocationUpdate,
    sendSpeedBumpDetection,
    sendSessionUpdate,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
