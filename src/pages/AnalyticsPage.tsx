import React from 'react';
import { BarChart3Icon } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Route Analytics</h1>
        <p className="text-gray-600">Comprehensive analysis of your route performance and trends</p>
      </div>

      <div className="text-center py-12">
        <BarChart3Icon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Analytics Coming Soon</h3>
        <p className="mt-1 text-sm text-gray-500">
          Complete some trips to see detailed analytics and route comparisons.
        </p>
      </div>
    </div>
  );
};
