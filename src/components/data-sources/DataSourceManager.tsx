/**
 * DataSourceManager Component
 * 
 * Main component that integrates mode selector and notifications
 * Provides a complete data source management interface
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataSourceModeSelector } from './DataSourceModeSelector';
import { DataSourceNotifications } from './DataSourceNotifications';
import { Database, Bell, Activity } from 'lucide-react';

export const DataSourceManager: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('mode');

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Data Source Manager</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage data sources, monitor health, and receive real-time notifications
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mode" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Mode Selection
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mode" className="mt-6">
          <DataSourceModeSelector />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <DataSourceNotifications
            maxNotifications={20}
            showTimestamp={true}
            autoHide={false}
          />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <div className="space-y-4">
            {/* This would include real-time monitoring charts */}
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">Real-time Monitoring</p>
              <p className="text-sm">Coming soon: Live charts and performance metrics</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataSourceManager;
