import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '../context/RouteContext';
import { useLocation } from '../context/LocationContext';

interface SettingItem {
  icon: string;
  title: string;
  subtitle?: string;
  value?: boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  type: 'switch' | 'button' | 'info';
}

const SettingsScreen: React.FC = () => {
  const { routes, routeSessions, getRouteAnalytics } = useRoute();
  const { hasLocationPermission, requestLocationPermission } = useLocation();
  
  const [settings, setSettings] = useState({
    backgroundTracking: true,
    speedBumpDetection: true,
    crowdSourceData: true,
    highAccuracyGPS: true,
    vibrationFeedback: true,
    notifications: true,
  });

  const updateSetting = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const exportData = async () => {
    try {
      const data = {
        routes,
        sessions: routeSessions,
        analytics: routes.map(route => ({
          routeId: route.id,
          analytics: getRouteAnalytics(route.id),
        })),
        exportedAt: new Date().toISOString(),
      };
      
      const jsonData = JSON.stringify(data, null, 2);
      
      await Share.share({
        message: jsonData,
        title: 'Road Time Measurement Data Export',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your routes, sessions, and analytics. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data has been cleared');
              // Note: In a real app, you'd also want to reset the context state
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const showAbout = () => {
    Alert.alert(
      'About Road Time Measurement',
      'Version 1.0.0\n\nA comprehensive route tracking and analysis app that helps you find the fastest routes, detect speed bumps, and analyze traffic patterns.\n\nFeatures:\n• GPS route tracking\n• Speed bump detection using accelerometer\n• Traffic pattern analysis\n• Route comparison and analytics\n• Crowd-sourced data sharing',
      [{ text: 'OK' }]
    );
  };

  const showHelp = () => {
    Alert.alert(
      'How to Use',
      '1. Create Routes: Go to Routes tab and create your frequently traveled routes\n\n2. Track Journeys: Select a route and use the Track tab to record your trips\n\n3. View Analytics: Check the Analytics tab to compare routes and see performance insights\n\n4. Speed Bumps: The app automatically detects speed bumps using your phone\'s accelerometer\n\n5. Traffic Data: Your anonymous speed and location data helps improve route recommendations for everyone',
      [{ text: 'OK' }]
    );
  };

  const settingsSections = [
    {
      title: 'Tracking Settings',
      items: [
        {
          icon: 'location-on',
          title: 'Background Location',
          subtitle: 'Allow tracking when app is in background',
          value: settings.backgroundTracking,
          onValueChange: (value: boolean) => updateSetting('backgroundTracking', value),
          type: 'switch' as const,
        },
        {
          icon: 'gps-fixed',
          title: 'High Accuracy GPS',
          subtitle: 'Use more battery for better location precision',
          value: settings.highAccuracyGPS,
          onValueChange: (value: boolean) => updateSetting('highAccuracyGPS', value),
          type: 'switch' as const,
        },
        {
          icon: 'vibration',
          title: 'Vibration Feedback',
          subtitle: 'Vibrate when speed bumps are detected',
          value: settings.vibrationFeedback,
          onValueChange: (value: boolean) => updateSetting('vibrationFeedback', value),
          type: 'switch' as const,
        },
      ],
    },
    {
      title: 'Detection Settings',
      items: [
        {
          icon: 'warning',
          title: 'Speed Bump Detection',
          subtitle: 'Use accelerometer to detect road irregularities',
          value: settings.speedBumpDetection,
          onValueChange: (value: boolean) => updateSetting('speedBumpDetection', value),
          type: 'switch' as const,
        },
        {
          icon: 'notifications',
          title: 'Notifications',
          subtitle: 'Show alerts and tracking updates',
          value: settings.notifications,
          onValueChange: (value: boolean) => updateSetting('notifications', value),
          type: 'switch' as const,
        },
      ],
    },
    {
      title: 'Data & Privacy',
      items: [
        {
          icon: 'people',
          title: 'Contribute to Community Data',
          subtitle: 'Share anonymous traffic data to help others',
          value: settings.crowdSourceData,
          onValueChange: (value: boolean) => updateSetting('crowdSourceData', value),
          type: 'switch' as const,
        },
        {
          icon: 'security',
          title: 'Location Permissions',
          subtitle: hasLocationPermission ? 'Granted' : 'Not granted',
          onPress: requestLocationPermission,
          type: 'button' as const,
        },
      ],
    },
    {
      title: 'Data Management',
      items: [
        {
          icon: 'file-download',
          title: 'Export Data',
          subtitle: 'Export your routes and analytics',
          onPress: exportData,
          type: 'button' as const,
        },
        {
          icon: 'delete-forever',
          title: 'Clear All Data',
          subtitle: 'Permanently delete all stored data',
          onPress: clearAllData,
          type: 'button' as const,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help',
          title: 'Help & Tutorial',
          subtitle: 'Learn how to use the app',
          onPress: showHelp,
          type: 'button' as const,
        },
        {
          icon: 'info',
          title: 'About',
          subtitle: 'App version and information',
          onPress: showAbout,
          type: 'button' as const,
        },
      ],
    },
  ];

  const SettingItem: React.FC<SettingItem> = ({ icon, title, subtitle, value, onPress, onValueChange, type }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={type === 'button' ? onPress : undefined}
      disabled={type === 'switch' || type === 'info'}
    >
      <View style={styles.settingItemContent}>
        <View style={styles.settingIcon}>
          <Icon name={icon} size={24} color="#007AFF" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {type === 'switch' && onValueChange && (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={value ? '#ffffff' : '#f4f3f4'}
          />
        )}
        {type === 'button' && (
          <Icon name="chevron-right" size={24} color="#ccc" />
        )}
      </View>
    </TouchableOpacity>
  );

  const totalTrips = routeSessions.filter(s => s.completed).length;
  const totalDistance = routeSessions
    .filter(s => s.completed)
    .reduce((sum, session) => sum + session.distance, 0) / 1000; // Convert to km
  const totalSpeedBumps = routeSessions
    .filter(s => s.completed)
    .reduce((sum, session) => sum + session.speedBumps.length, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your tracking experience</Text>
      </View>

      {/* Stats overview */}
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Your Activity</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="timeline" size={32} color="#007AFF" />
            <Text style={styles.statValue}>{totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="straighten" size={32} color="#34C759" />
            <Text style={styles.statValue}>{totalDistance.toFixed(1)} km</Text>
            <Text style={styles.statLabel}>Distance Tracked</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="route" size={32} color="#5856D6" />
            <Text style={styles.statValue}>{routes.length}</Text>
            <Text style={styles.statLabel}>Saved Routes</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="warning" size={32} color="#FF9500" />
            <Text style={styles.statValue}>{totalSpeedBumps}</Text>
            <Text style={styles.statLabel}>Speed Bumps</Text>
          </View>
        </View>
      </View>

      {/* Settings sections */}
      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, itemIndex) => (
            <SettingItem key={itemIndex} {...item} />
          ))}
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Road Time Measurement App v1.0.0
        </Text>
        <Text style={styles.footerSubtext}>
          Your privacy is important. Location data is stored locally and only shared anonymously if enabled.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 4,
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});

export default SettingsScreen;
