import React from 'react';
import { SettingsIcon } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your tracking preferences and app settings</p>
      </div>

      <div className="text-center py-12">
        <SettingsIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Settings Coming Soon</h3>
        <p className="mt-1 text-sm text-gray-500">
          Customize your tracking experience and manage your data preferences.
        </p>
      </div>
    </div>
  );
};
