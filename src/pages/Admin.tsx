import React from 'react';
import { User, Settings, Shield } from 'lucide-react';

const Admin = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600">Manage system settings and users</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center mb-4">
            <User className="mr-3 w-8 h-8 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            View and manage user accounts, roles, and permissions.
          </p>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700">
            Manage Users
          </button>
        </div>

        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center mb-4">
            <Settings className="mr-3 w-8 h-8 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Configure system preferences and application settings.
          </p>
          <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700">
            System Config
          </button>
        </div>

        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center mb-4">
            <Shield className="mr-3 w-8 h-8 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Security</h3>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Monitor security events and manage access controls.
          </p>
          <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg transition-colors hover:bg-purple-700">
            Security Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
