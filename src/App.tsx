import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RoutesPage } from './pages/RoutesPage';
import { TrackingPage } from './pages/TrackingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CommunityPage } from './pages/CommunityPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationProvider } from './contexts/NotificationContext';
import { LocationProvider } from './contexts/LocationContext';
import { RouteProvider } from './contexts/RouteContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { AccelerometerProvider } from './contexts/AccelerometerContext';

function App() {
  return (
    <NotificationProvider>
      <WebSocketProvider>
        <LocationProvider>
          <AccelerometerProvider>
            <RouteProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/routes" element={<RoutesPage />} />
                <Route path="/tracking" element={<TrackingPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
            </RouteProvider>
          </AccelerometerProvider>
        </LocationProvider>
      </WebSocketProvider>
    </NotificationProvider>
  );
}

export default App;
