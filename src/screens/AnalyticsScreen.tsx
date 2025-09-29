import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute, RouteAnalytics, RouteSession } from '../context/RouteContext';

const { width } = Dimensions.get('window');

interface RouteComparisonProps {
  routes: Array<{
    id: string;
    name: string;
    analytics: RouteAnalytics | null;
  }>;
}

const RouteComparison: React.FC<RouteComparisonProps> = ({ routes }) => {
  const validRoutes = routes.filter(r => r.analytics && r.analytics.totalSessions > 0);
  
  if (validRoutes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon name="bar-chart" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No route data available</Text>
        <Text style={styles.emptySubtext}>Complete some trips to see analytics</Text>
      </View>
    );
  }

  const chartData = {
    labels: validRoutes.map(r => r.name.substring(0, 10)),
    datasets: [
      {
        data: validRoutes.map(r => r.analytics!.averageDuration / 60000), // Convert to minutes
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const speedChartData = {
    labels: validRoutes.map(r => r.name.substring(0, 10)),
    datasets: [
      {
        data: validRoutes.map(r => r.analytics!.averageSpeed),
      },
    ],
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Route Comparison</Text>
      
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Average Duration (minutes)</Text>
        <LineChart
          data={chartData}
          width={width - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Average Speed (km/h)</Text>
        <BarChart
          data={speedChartData}
          width={width - 32}
          height={220}
          yAxisLabel=""
          yAxisSuffix=" km/h"
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          style={styles.chart}
        />
      </View>

      <View style={styles.comparisonGrid}>
        {validRoutes.map((route) => (
          <View key={route.id} style={styles.comparisonCard}>
            <Text style={styles.comparisonRouteTitle}>{route.name}</Text>
            <View style={styles.comparisonStats}>
              <View style={styles.comparisonStat}>
                <Text style={styles.comparisonStatValue}>
                  {Math.round(route.analytics!.averageDuration / 60000)}
                </Text>
                <Text style={styles.comparisonStatLabel}>min avg</Text>
              </View>
              <View style={styles.comparisonStat}>
                <Text style={styles.comparisonStatValue}>
                  {route.analytics!.averageSpeed.toFixed(1)}
                </Text>
                <Text style={styles.comparisonStatLabel}>km/h avg</Text>
              </View>
              <View style={styles.comparisonStat}>
                <Text style={styles.comparisonStatValue}>
                  {route.analytics!.speedBumpCount}
                </Text>
                <Text style={styles.comparisonStatLabel}>bumps</Text>
              </View>
            </View>
          </View>
        ))}
      </div>
    </View>
  );
};

const RouteDetailAnalytics: React.FC<{ routeId: string; analytics: RouteAnalytics; sessions: RouteSession[] }> = ({
  routeId,
  analytics,
  sessions,
}) => {
  const timeData = useMemo(() => {
    const completedSessions = sessions.filter(s => s.completed && s.duration);
    if (completedSessions.length === 0) return null;

    const labels = completedSessions
      .slice(-10) // Last 10 sessions
      .map((_, index) => `Trip ${index + 1}`);
    
    const durations = completedSessions
      .slice(-10)
      .map(s => (s.duration || 0) / 60000); // Convert to minutes

    return {
      labels,
      datasets: [
        {
          data: durations,
          color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  }, [sessions]);

  const speedData = useMemo(() => {
    const completedSessions = sessions.filter(s => s.completed && s.averageSpeed > 0);
    if (completedSessions.length === 0) return null;

    const labels = completedSessions
      .slice(-10) // Last 10 sessions
      .map((_, index) => `Trip ${index + 1}`);
    
    const speeds = completedSessions
      .slice(-10)
      .map(s => s.averageSpeed * 3.6); // Convert to km/h

    return {
      labels,
      datasets: [
        {
          data: speeds,
        },
      ],
    };
  }, [sessions]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Route Performance Over Time</Text>
      
      {/* Key metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Icon name="timer" size={24} color="#007AFF" />
          <Text style={styles.metricValue}>
            {Math.round(analytics.averageDuration / 60000)}min
          </Text>
          <Text style={styles.metricLabel}>Average Duration</Text>
          <Text style={styles.metricSubtext}>
            Best: {Math.round(analytics.fastestTime / 60000)}min
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Icon name="speed" size={24} color="#34C759" />
          <Text style={styles.metricValue}>
            {analytics.averageSpeed.toFixed(1)} km/h
          </Text>
          <Text style={styles.metricLabel}>Average Speed</Text>
          <Text style={styles.metricSubtext}>
            Distance: {(analytics.averageDistance / 1000).toFixed(1)}km
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Icon name="warning" size={24} color="#FF9500" />
          <Text style={styles.metricValue}>{analytics.speedBumpCount}</Text>
          <Text style={styles.metricLabel}>Speed Bumps</Text>
          <Text style={styles.metricSubtext}>
            Total detected
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Icon name="timeline" size={24} color="#5856D6" />
          <Text style={styles.metricValue}>{analytics.totalSessions}</Text>
          <Text style={styles.metricLabel}>Total Trips</Text>
          <Text style={styles.metricSubtext}>
            Completed
          </Text>
        </View>
      </View>

      {/* Time insights */}
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Time Insights</Text>
        <View style={styles.insightRow}>
          <Icon name="schedule" size={20} color="#34C759" />
          <Text style={styles.insightText}>
            Best time to travel: <Text style={styles.insightValue}>{analytics.bestTimeOfDay}</Text>
          </Text>
        </View>
        <View style={styles.insightRow}>
          <Icon name="schedule" size={20} color="#FF3B30" />
          <Text style={styles.insightText}>
            Slowest time: <Text style={styles.insightValue}>{analytics.worstTimeOfDay}</Text>
          </Text>
        </View>
      </View>

      {/* Charts */}
      {timeData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Duration Trend</Text>
          <LineChart
            data={timeData}
            width={width - 32}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {speedData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Speed Trend</Text>
          <BarChart
            data={speedData}
            width={width - 32}
            height={220}
            yAxisLabel=""
            yAxisSuffix=" km/h"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            style={styles.chart}
          />
        </View>
      )}

      {/* Traffic hotspots */}
      {analytics.trafficHotspots.length > 0 && (
        <View style={styles.hotspotsContainer}>
          <Text style={styles.hotspotsTitle}>Traffic Hotspots</Text>
          {analytics.trafficHotspots.slice(0, 5).map((hotspot, index) => (
            <View key={index} style={styles.hotspotItem}>
              <Icon name="traffic" size={16} color="#FF9500" />
              <Text style={styles.hotspotText}>
                Lat: {hotspot.latitude.toFixed(4)}, Lng: {hotspot.longitude.toFixed(4)}
              </Text>
              <Text style={styles.hotspotFrequency}>
                {hotspot.frequency} reports
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const AnalyticsScreen: React.FC = () => {
  const { routes, getRouteAnalytics, getRouteSessions } = useRoute();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const routesWithAnalytics = useMemo(() => {
    return routes.map(route => ({
      id: route.id,
      name: route.name,
      analytics: getRouteAnalytics(route.id),
    }));
  }, [routes]);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const selectedAnalytics = selectedRouteId ? getRouteAnalytics(selectedRouteId) : null;
  const selectedSessions = selectedRouteId ? getRouteSessions(selectedRouteId) : [];

  if (routes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="analytics" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Routes Available</Text>
        <Text style={styles.emptySubtitle}>
          Create some routes and complete trips to see analytics
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Route Analytics</Text>
        <Text style={styles.subtitle}>Performance insights and comparisons</Text>
      </View>

      {/* Route selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Route for Details</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.routeSelector,
              !selectedRouteId && styles.selectedRouteSelector,
            ]}
            onPress={() => setSelectedRouteId(null)}
          >
            <Text style={[
              styles.routeSelectorText,
              !selectedRouteId && styles.selectedRouteSelectorText,
            ]}>
              All Routes
            </Text>
          </TouchableOpacity>
          {routes.map((route) => {
            const analytics = getRouteAnalytics(route.id);
            return (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeSelector,
                  selectedRouteId === route.id && styles.selectedRouteSelector,
                ]}
                onPress={() => setSelectedRouteId(route.id)}
              >
                <Text style={[
                  styles.routeSelectorText,
                  selectedRouteId === route.id && styles.selectedRouteSelectorText,
                ]}>
                  {route.name}
                </Text>
                {analytics && (
                  <Text style={styles.routeSelectorSubtext}>
                    {analytics.totalSessions} trips
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {!selectedRouteId ? (
        <RouteComparison routes={routesWithAnalytics} />
      ) : selectedAnalytics ? (
        <RouteDetailAnalytics
          routeId={selectedRouteId}
          analytics={selectedAnalytics}
          sessions={selectedSessions}
        />
      ) : (
        <View style={styles.emptyState}>
          <Icon name="route" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No data for this route</Text>
          <Text style={styles.emptySubtext}>
            Complete some trips on this route to see analytics
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
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
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  routeSelector: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
  },
  selectedRouteSelector: {
    backgroundColor: '#007AFF',
  },
  routeSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedRouteSelectorText: {
    color: 'white',
  },
  routeSelectorSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  chartContainer: {
    marginVertical: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: '#f8f9fa',
    width: (width - 64) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  metricSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  insightsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  insightValue: {
    fontWeight: '600',
    color: '#333',
  },
  hotspotsContainer: {
    marginTop: 20,
  },
  hotspotsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  hotspotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  hotspotText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  hotspotFrequency: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  comparisonGrid: {
    marginTop: 16,
  },
  comparisonCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  comparisonRouteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  comparisonStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonStat: {
    alignItems: 'center',
  },
  comparisonStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  comparisonStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default AnalyticsScreen;
