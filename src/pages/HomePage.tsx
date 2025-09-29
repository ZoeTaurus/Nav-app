import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapIcon, 
  PlayIcon, 
  BarChart3Icon, 
  ClockIcon,
  RouteIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  UsersIcon
} from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon: Icon, color }) => (
  <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100">
    <div className="p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="ml-4 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-2xl font-bold text-gray-900">{value}</dd>
            {subtitle && <dd className="text-sm text-gray-500">{subtitle}</dd>}
          </dl>
        </div>
      </div>
    </div>
  </div>
);

export const HomePage: React.FC = () => {
  const { currentLocation, hasLocationPermission, requestLocationPermission } = useLocation();
  const [stats, setStats] = useState({
    totalRoutes: 0,
    totalSessions: 0,
    totalDistance: 0,
    totalSpeedBumps: 0,
    averageSpeed: 0,
  });

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      const response = await fetch('/api/analytics/overview');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalRoutes: data.totalRoutes || 0,
          totalSessions: data.totalSessions || 0,
          totalDistance: data.totalDistance || 0,
          totalSpeedBumps: data.totalSpeedBumps || 0,
          averageSpeed: data.averageSpeed || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch overview stats:', error);
    }
  };

  const quickActions = [
    {
      title: 'Create Route',
      description: 'Set up a new route to track',
      href: '/routes',
      icon: MapIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Start Tracking',
      description: 'Begin tracking your journey',
      href: '/tracking',
      icon: PlayIcon,
      color: 'bg-green-500',
    },
    {
      title: 'View Analytics',
      description: 'Analyze your route performance',
      href: '/analytics',
      icon: BarChart3Icon,
      color: 'bg-purple-500',
    },
    {
      title: 'Community Data',
      description: 'Explore crowd-sourced insights',
      href: '/community',
      icon: UsersIcon,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to Road Time Measurement
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Track your routes, analyze journey times, and contribute to community insights
            </p>
          </div>
          <div className="mt-4 md:mt-0 md:ml-4">
            {currentLocation ? (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-800">
                    Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={requestLocationPermission}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Enable Location
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Location Permission Warning */}
      {!hasLocationPermission && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Location Access Required
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Enable location access to use GPS tracking, route recording, and speed bump detection features.
              </p>
              <button
                onClick={requestLocationPermission}
                className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Enable Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Routes"
          value={stats.totalRoutes.toString()}
          subtitle="saved routes"
          icon={RouteIcon}
          color="bg-blue-500"
        />
        <StatsCard
          title="Completed Trips"
          value={stats.totalSessions.toString()}
          subtitle="tracking sessions"
          icon={ClockIcon}
          color="bg-green-500"
        />
        <StatsCard
          title="Distance Tracked"
          value={`${stats.totalDistance.toFixed(1)} km`}
          subtitle="total distance"
          icon={TrendingUpIcon}
          color="bg-purple-500"
        />
        <StatsCard
          title="Speed Bumps"
          value={stats.totalSpeedBumps.toString()}
          subtitle="detected"
          icon={AlertTriangleIcon}
          color="bg-orange-500"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.href}
                className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {action.title}
                  </h3>
                  <p className="text-gray-600">
                    {action.description}
                  </p>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                    Get started
                    <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Route Management</h3>
            <p className="text-gray-600">
              Create and save multiple routes with start/end points and waypoints for easy tracking.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <PlayIcon className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">GPS Tracking</h3>
            <p className="text-gray-600">
              Real-time location tracking with speed monitoring and route recording capabilities.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangleIcon className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Speed Bump Detection</h3>
            <p className="text-gray-600">
              Web-based simulation and manual reporting of speed bumps and road irregularities.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3Icon className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Advanced Analytics</h3>
            <p className="text-gray-600">
              Comprehensive route analysis with time comparisons and performance insights.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Community Data</h3>
            <p className="text-gray-600">
              Crowd-sourced traffic data and speed bump reports for better route planning.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Time Optimization</h3>
            <p className="text-gray-600">
              Find the fastest routes and optimal travel times based on historical data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
