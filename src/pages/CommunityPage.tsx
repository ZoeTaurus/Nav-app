import React from 'react';
import { UsersIcon } from 'lucide-react';

export const CommunityPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Data</h1>
        <p className="text-gray-600">Explore crowd-sourced traffic insights and speed bump reports</p>
      </div>

      <div className="text-center py-12">
        <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Community Features Coming Soon</h3>
        <p className="mt-1 text-sm text-gray-500">
          View community-reported speed bumps and traffic patterns in your area.
        </p>
      </div>
    </div>
  );
};
