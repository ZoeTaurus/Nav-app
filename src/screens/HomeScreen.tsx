import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute } from '../context/RouteContext';
import { useLocation } from '../context/LocationContext';

const { width } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const { routes, routeSessions, getRouteAnalytics } = useRoute();
  const { currentLocation, hasLocationPermission, requestLocationPermission } = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!hasLocationPermission) {
      requestLocationPermission();
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  const totalSessions = routeSessions.filter(s => s.completed).length;
  const totalDistance = routeSessions
    .filter(s => s.completed)
    .reduce((sum, session) => sum + session.distance, 0) / 1000; // Convert to km

  const averageSpeed = routeSessions
    .filter(s => s.completed && s.averageSpeed > 0)
    .reduce((sum, session, _, arr) => sum + session.averageSpeed / arr.length, 0);

  const recentSessions = routeSessions
    .filter(s => s.completed)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
    .slice(0, 3);

  const StatCard: React.FC<{ icon: string; title: string; value: string; subtitle?: string }> = ({
    icon,
    title,
    value,
    subtitle,
  }) => (
    <View style={styles.statCard}>
      <Icon name={icon} size={32} color="#007AFF" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const RouteCard: React.FC<{ routeId: string; sessionCount: number }> = ({ routeId, sessionCount }) => {
    const route = routes.find(r => r.id === routeId);
    const analytics = getRouteAnalytics(routeId);
    
    if (!route) return null;

    return (
      <View style={styles.routeCard}>
        <View style={styles.routeHeader}>
          <Icon name="route" size={24} color="#007AFF" />
          <Text style={styles.routeName}>{route.name}</Text>
        </View>
        <Text style={styles.routeSubtitle}>
          {route.startPoint.address} → {route.endPoint.address}
        </Text>
        <View style={styles.routeStats}>
          <Text style={styles.routeStat}>{sessionCount} trips</Text>
          {analytics && (
            <>
              <Text style={styles.routeStat}>
                Avg: {Math.round(analytics.averageDuration / 60000)}min
              </Text>
              <Text style={styles.routeStat}>
                {analytics.averageSpeed.toFixed(1)} km/h
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {!hasLocationPermission && (
        <View style={styles.permissionBanner}>
          <Icon name="location-off" size={24} color="#FF3B30" />
          <Text style={styles.permissionText}>
            Location permission required for tracking
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestLocationPermission}
          >
            <Text style={styles.permissionButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>Road Time Dashboard</Text>
        <Text style={styles.subtitle}>
          {currentLocation
            ? `Current location: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
            : 'No location data'
          }
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          icon="timeline"
          title="Total Trips"
          value={totalSessions.toString()}
          subtitle="completed"
        />
        <StatCard
          icon="straighten"
          title="Distance"
          value={totalDistance.toFixed(1)}
          subtitle="km traveled"
        />
        <StatCard
          icon="speed"
          title="Avg Speed"
          value={averageSpeed.toFixed(1)}
          subtitle="km/h"
        />
        <StatCard
          icon="route"
          title="Routes"
          value={routes.length.toString()}
          subtitle="saved"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        {recentSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="history" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No trips recorded yet</Text>
            <Text style={styles.emptySubtext}>
              Select a route and start tracking to see your trip history
            </Text>
          </View>
        ) : (
          recentSessions.map((session) => {
            const route = routes.find(r => r.id === session.routeId);
            return (
              <View key={session.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <Icon name="history" size={20} color="#007AFF" />
                  <Text style={styles.tripTitle}>
                    {route?.name || 'Unknown Route'}
                  </Text>
                  <Text style={styles.tripTime}>
                    {new Date(session.endTime || 0).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.tripStats}>
                  <Text style={styles.tripStat}>
                    Duration: {Math.round((session.duration || 0) / 60000)}min
                  </Text>
                  <Text style={styles.tripStat}>
                    Distance: {(session.distance / 1000).toFixed(2)}km
                  </Text>
                  <Text style={styles.tripStat}>
                    Avg Speed: {session.averageSpeed.toFixed(1)}km/h
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Routes</Text>
        {routes.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="add-road" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No routes saved</Text>
            <Text style={styles.emptySubtext}>
              Go to Routes tab to create your first route
            </Text>
          </View>
        ) : (
          routes.map((route) => {
            const sessionCount = routeSessions.filter(s => s.routeId === route.id && s.completed).length;
            return (
              <RouteCard
                key={route.id}
                routeId={route.id}
                sessionCount={sessionCount}
              />
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  permissionBanner: {
    backgroundColor: '#FFE5E5',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  permissionText: {
    flex: 1,
    marginLeft: 12,
    color: '#FF3B30',
    fontWeight: '500',
  },
  permissionButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  tripCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    marginBottom: 12,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  tripTime: {
    fontSize: 12,
    color: '#666',
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripStat: {
    fontSize: 12,
    color: '#666',
  },
  routeCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeStat: {
    fontSize: 12,
    color: '#666',
  },
});

export default HomeScreen;
