import React, { useState, useEffect } from 'react';
import { PlayIcon, Square as StopIcon, PauseIcon, AlertTriangleIcon } from 'lucide-react';
import { useRoute } from '../contexts/RouteContext';
import { useLocation } from '../contexts/LocationContext';
import { useAccelerometer } from '../contexts/AccelerometerContext';
import { useWebSocket } from '../contexts/WebSocketContext';

export const TrackingPage: React.FC = () => {
  const { selectedRoute } = useRoute();
  const { 
    currentLocation, 
    isTracking, 
    startTracking, 
    stopTracking, 
    hasLocationPermission,
    requestLocationPermission 
  } = useLocation();
  const { 
    isSupported: isAccelSupported,
    hasPermission: hasAccelPermission,
    isMonitoring: isAccelMonitoring,
    currentData: accelData,
    recentDetections,
    requestPermission: requestAccelPermission,
    startMonitoring: startAccelMonitoring,
    stopMonitoring: stopAccelMonitoring,
    sensitivity,
    setSensitivity
  } = useAccelerometer();
  const { isConnected, sendLocationUpdate, sendSessionUpdate } = useWebSocket();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    distance: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    speedBumps: 0,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStartTime) {
      interval = setInterval(() => {
        setSessionStats(prev => ({
          ...prev,
          duration: Date.now() - sessionStartTime,
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  useEffect(() => {
    setSessionStats(prev => ({
      ...prev,
      speedBumps: recentDetections.length,
    }));
  }, [recentDetections]);

  const startSession = async () => {
    if (!selectedRoute) {
      alert('Please select a route first');
      return;
    }

    if (!hasLocationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }

    if (isAccelSupported && !hasAccelPermission) {
      await requestAccelPermission();
    }

    try {
      // Start location tracking
      await startTracking();
      
      // Start accelerometer monitoring if available
      if (isAccelSupported && hasAccelPermission) {
        await startAccelMonitoring();
      }

      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      setSessionStartTime(Date.now());
      
      // Notify server
      sendSessionUpdate(newSessionId, 'started', { routeId: selectedRoute.id });
      
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const stopSession = () => {
    if (sessionId) {
      stopTracking();
      stopAccelMonitoring();
      
      // Notify server
      sendSessionUpdate(sessionId, 'completed', {
        endTime: Date.now(),
        duration: sessionStats.duration,
        distance: sessionStats.distance,
      });
      
      setSessionId(null);
      setSessionStartTime(null);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  if (!selectedRoute) {
    return (
      <div className="text-center py-12">
        <AlertTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No route selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please go to the Routes page and select a route to track.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Route Tracking</h1>
        <p className="text-gray-600">Track your journey with real-time GPS and speed bump detection</p>
      </div>

      {/* Route Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Route</h2>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-blue-600">{selectedRoute.name}</h3>
          <p className="text-sm text-gray-600">
            <span className="font-medium">From:</span> {selectedRoute.startPoint.address}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">To:</span> {selectedRoute.endPoint.address}
          </p>
        </div>
      </div>

      {/* Permissions Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border-2 ${hasLocationPermission ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${hasLocationPermission ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">GPS Location</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {hasLocationPermission ? 'Ready' : 'Permission required'}
          </p>
        </div>

        <div className={`p-4 rounded-lg border-2 ${isAccelSupported && hasAccelPermission ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${isAccelSupported && hasAccelPermission ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="font-medium">Accelerometer</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {!isAccelSupported ? 'Not supported' : hasAccelPermission ? 'Ready' : 'Permission required'}
          </p>
        </div>

        <div className={`p-4 rounded-lg border-2 ${isConnected ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="font-medium">Real-time Sync</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {isConnected ? 'Connected' : 'Offline mode'}
          </p>
        </div>
      </div>

      {/* Current Status */}
      {currentLocation && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Latitude</p>
              <p className="text-lg font-mono">{currentLocation.latitude.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Longitude</p>
              <p className="text-lg font-mono">{currentLocation.longitude.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Speed</p>
              <p className="text-lg font-mono">
                {currentLocation.speed ? `${(currentLocation.speed * 3.6).toFixed(1)} km/h` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Accuracy</p>
              <p className="text-lg font-mono">
                {currentLocation.accuracy ? `±${currentLocation.accuracy.toFixed(0)}m` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session Stats */}
      {sessionId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatDuration(sessionStats.duration)}</p>
              <p className="text-sm text-gray-600">Duration</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{(sessionStats.distance / 1000).toFixed(2)} km</p>
              <p className="text-sm text-gray-600">Distance</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{sessionStats.averageSpeed.toFixed(1)} km/h</p>
              <p className="text-sm text-gray-600">Avg Speed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{sessionStats.speedBumps}</p>
              <p className="text-sm text-gray-600">Speed Bumps</p>
            </div>
          </div>
        </div>
      )}

      {/* Accelerometer Data */}
      {isAccelSupported && hasAccelPermission && accelData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Accelerometer Data</h2>
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-600">
                Sensitivity:
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="ml-2"
                />
                <span className="ml-2 font-mono">{sensitivity.toFixed(1)}</span>
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">X-axis</p>
              <p className="text-lg font-mono">{accelData.x.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Y-axis</p>
              <p className="text-lg font-mono">{accelData.y.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Z-axis</p>
              <p className="text-lg font-mono">{accelData.z.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Magnitude</p>
              <p className={`text-lg font-mono ${accelData.magnitude > sensitivity ? 'text-red-600 font-bold' : ''}`}>
                {accelData.magnitude.toFixed(3)}
              </p>
            </div>
          </div>

          {/* Recent Speed Bump Detections */}
          {recentDetections.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Speed Bump Detections</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {recentDetections.slice(0, 5).map((detection, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                    <span className="text-sm">
                      Intensity: {detection.intensity}/10 (Confidence: {detection.confidence}%)
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(detection.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex justify-center space-x-4">
        {!sessionId ? (
          <button
            onClick={startSession}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-medium flex items-center transition-colors shadow-lg"
          >
            <PlayIcon className="w-6 h-6 mr-2" />
            Start Tracking
          </button>
        ) : (
          <button
            onClick={stopSession}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-medium flex items-center transition-colors shadow-lg"
          >
            <StopIcon className="w-6 h-6 mr-2" />
            Stop Tracking
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">How it works</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>GPS Tracking:</strong> Your device's GPS tracks your location and speed in real-time</li>
          <li>• <strong>Speed Bump Detection:</strong> The accelerometer detects sudden movements indicating speed bumps</li>
          <li>• <strong>Real-time Sync:</strong> Data is synchronized with the server for community insights</li>
          <li>• <strong>Sensitivity:</strong> Adjust the accelerometer sensitivity to match your preferences</li>
        </ul>
      </div>
    </div>
  );
};
