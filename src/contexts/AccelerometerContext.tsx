import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNotification } from './NotificationContext';
import { useWebSocket } from './WebSocketContext';

interface AccelerometerData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
  magnitude: number;
}

interface SpeedBumpDetection {
  latitude: number;
  longitude: number;
  intensity: number;
  timestamp: number;
  confidence: number;
}

interface AccelerometerContextType {
  isSupported: boolean;
  hasPermission: boolean;
  isMonitoring: boolean;
  currentData: AccelerometerData | null;
  recentDetections: SpeedBumpDetection[];
  
  // Control functions
  requestPermission: () => Promise<boolean>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  
  // Detection settings
  sensitivity: number;
  setSensitivity: (value: number) => void;
  
  // Calibration
  calibrate: () => Promise<void>;
  isCalibrated: boolean;
}

const AccelerometerContext = createContext<AccelerometerContextType | undefined>(undefined);

interface AccelerometerProviderProps {
  children: ReactNode;
}

export const AccelerometerProvider: React.FC<AccelerometerProviderProps> = ({ children }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentData, setCurrentData] = useState<AccelerometerData | null>(null);
  const [recentDetections, setRecentDetections] = useState<SpeedBumpDetection[]>([]);
  const [sensitivity, setSensitivity] = useState(2.5); // Default threshold
  const [isCalibrated, setIsCalibrated] = useState(false);
  
  // Calibration data
  const [baseline, setBaseline] = useState({ x: 0, y: 0, z: 9.81 });
  const [calibrationSamples, setCalibrationSamples] = useState<AccelerometerData[]>([]);
  
  // Detection state
  const [lastSignificantMovement, setLastSignificantMovement] = useState(0);
  const [movementBuffer, setMovementBuffer] = useState<AccelerometerData[]>([]);
  const bufferSize = 20; // Keep last 20 readings for analysis
  const detectionCooldown = 3000; // 3 seconds between detections
  
  const { showNotification } = useNotification();
  const { sendSpeedBumpDetection } = useWebSocket();

  useEffect(() => {
    checkAccelerometerSupport();
  }, []);

  const checkAccelerometerSupport = () => {
    // Check for DeviceMotionEvent support
    if (typeof DeviceMotionEvent !== 'undefined') {
      setIsSupported(true);
      
      // Check if permission is required (iOS 13+)
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        // iOS requires permission
        setHasPermission(false);
      } else {
        // Android and older iOS
        setHasPermission(true);
      }
    } else {
      setIsSupported(false);
      showNotification('Device motion sensors not supported on this device', 'error');
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      showNotification('Accelerometer not supported on this device', 'error');
      return false;
    }

    try {
      // iOS 13+ permission request
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setHasPermission(true);
          showNotification('Accelerometer access granted', 'success');
          return true;
        } else {
          setHasPermission(false);
          showNotification('Accelerometer access denied', 'error');
          return false;
        }
      } else {
        // For browsers that don't require permission
        setHasPermission(true);
        return true;
      }
    } catch (error) {
      console.error('Error requesting accelerometer permission:', error);
      showNotification('Failed to request accelerometer permission', 'error');
      return false;
    }
  };

  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!event.accelerationIncludingGravity) return;

    const acceleration = event.accelerationIncludingGravity;
    const timestamp = Date.now();
    
    // Calculate calibrated acceleration
    const x = (acceleration.x || 0) - baseline.x;
    const y = (acceleration.y || 0) - baseline.y;
    const z = (acceleration.z || 0) - baseline.z;
    
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    const data: AccelerometerData = {
      x,
      y,
      z,
      timestamp,
      magnitude,
    };
    
    setCurrentData(data);
    
    // Update movement buffer
    setMovementBuffer(prev => {
      const newBuffer = [...prev, data];
      return newBuffer.slice(-bufferSize);
    });
    
    // Analyze for speed bump detection
    analyzeForSpeedBump(data);
  }, [baseline, sensitivity]);

  const analyzeForSpeedBump = useCallback((data: AccelerometerData) => {
    const now = Date.now();
    
    // Cooldown check
    if (now - lastSignificantMovement < detectionCooldown) {
      return;
    }
    
    // Check if magnitude exceeds threshold
    if (data.magnitude > sensitivity) {
      // Additional validation using recent movement buffer
      if (movementBuffer.length >= 5) {
        const recentMagnitudes = movementBuffer.slice(-5).map(d => d.magnitude);
        const avgRecent = recentMagnitudes.reduce((a, b) => a + b, 0) / recentMagnitudes.length;
        
        // Confirm it's a significant movement pattern
        if (data.magnitude > avgRecent * 1.5) {
          detectSpeedBump(data);
          setLastSignificantMovement(now);
        }
      }
    }
  }, [sensitivity, movementBuffer, lastSignificantMovement]);

  const detectSpeedBump = useCallback((data: AccelerometerData) => {
    // Get current location (you'd integrate this with your location context)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const detection: SpeedBumpDetection = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            intensity: Math.min(Math.round(data.magnitude), 10),
            timestamp: data.timestamp,
            confidence: calculateConfidence(data),
          };
          
          setRecentDetections(prev => [detection, ...prev.slice(0, 9)]); // Keep last 10
          
          // Send to server via WebSocket
          sendSpeedBumpDetection('current-session', detection.latitude, detection.longitude, detection.intensity);
          
          // Notify user
          showNotification(
            `Speed bump detected! Intensity: ${detection.intensity}/10`, 
            'warning',
            3000
          );
          
          // Vibrate if supported
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
        },
        (error) => {
          console.error('Error getting location for speed bump detection:', error);
        }
      );
    }
  }, [sendSpeedBumpDetection, showNotification]);

  const calculateConfidence = (data: AccelerometerData): number => {
    // Calculate confidence based on magnitude and pattern analysis
    const normalizedMagnitude = Math.min(data.magnitude / 10, 1);
    
    // Additional factors could include:
    // - Consistency with recent movements
    // - Speed of movement
    // - Duration of the disturbance
    
    return Math.round(normalizedMagnitude * 100);
  };

  const startMonitoring = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if (!isCalibrated) {
      showNotification('Calibrating accelerometer...', 'info');
      await calibrate();
    }

    try {
      window.addEventListener('devicemotion', handleDeviceMotion);
      setIsMonitoring(true);
      showNotification('Speed bump detection started', 'success');
    } catch (error) {
      console.error('Error starting accelerometer monitoring:', error);
      showNotification('Failed to start accelerometer monitoring', 'error');
    }
  };

  const stopMonitoring = () => {
    window.removeEventListener('devicemotion', handleDeviceMotion);
    setIsMonitoring(false);
    setCurrentData(null);
    showNotification('Speed bump detection stopped', 'info');
  };

  const calibrate = async (): Promise<void> => {
    return new Promise((resolve) => {
      const samples: AccelerometerData[] = [];
      const sampleCount = 50;
      let currentSample = 0;

      const calibrationHandler = (event: DeviceMotionEvent) => {
        if (!event.accelerationIncludingGravity) return;

        const acceleration = event.accelerationIncludingGravity;
        samples.push({
          x: acceleration.x || 0,
          y: acceleration.y || 0,
          z: acceleration.z || 0,
          timestamp: Date.now(),
          magnitude: 0,
        });

        currentSample++;

        if (currentSample >= sampleCount) {
          window.removeEventListener('devicemotion', calibrationHandler);
          
          // Calculate baseline from samples
          const avgX = samples.reduce((sum, s) => sum + s.x, 0) / samples.length;
          const avgY = samples.reduce((sum, s) => sum + s.y, 0) / samples.length;
          const avgZ = samples.reduce((sum, s) => sum + s.z, 0) / samples.length;
          
          setBaseline({ x: avgX, y: avgY, z: avgZ });
          setIsCalibrated(true);
          setCalibrationSamples(samples);
          
          showNotification('Accelerometer calibrated successfully', 'success');
          resolve();
        }
      };

      window.addEventListener('devicemotion', calibrationHandler);
      
      // Timeout fallback
      setTimeout(() => {
        window.removeEventListener('devicemotion', calibrationHandler);
        if (samples.length > 10) {
          const avgX = samples.reduce((sum, s) => sum + s.x, 0) / samples.length;
          const avgY = samples.reduce((sum, s) => sum + s.y, 0) / samples.length;
          const avgZ = samples.reduce((sum, s) => sum + s.z, 0) / samples.length;
          
          setBaseline({ x: avgX, y: avgY, z: avgZ });
          setIsCalibrated(true);
          showNotification('Accelerometer calibrated with limited samples', 'warning');
        } else {
          showNotification('Calibration failed - using default values', 'error');
        }
        resolve();
      }, 5000);
    });
  };

  const value: AccelerometerContextType = {
    isSupported,
    hasPermission,
    isMonitoring,
    currentData,
    recentDetections,
    requestPermission,
    startMonitoring,
    stopMonitoring,
    sensitivity,
    setSensitivity,
    calibrate,
    isCalibrated,
  };

  return (
    <AccelerometerContext.Provider value={value}>
      {children}
    </AccelerometerContext.Provider>
  );
};

export const useAccelerometer = (): AccelerometerContextType => {
  const context = useContext(AccelerometerContext);
  if (context === undefined) {
    throw new Error('useAccelerometer must be used within an AccelerometerProvider');
  }
  return context;
};
