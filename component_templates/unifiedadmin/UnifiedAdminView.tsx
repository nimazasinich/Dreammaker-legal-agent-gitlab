import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Tab Components (to be implemented)
import {HealthTab} from '@/components/unifiedadmin/HealthTab';
import {MonitoringTab} from '@/components/unifiedadmin/MonitoringTab';
import {DiagnosticsTab} from '@/components/unifiedadmin/DiagnosticsTab';

// Types
type TabId = 'health' | 'monitoring' | 'diagnostics';

interface TabConfig {
  id: TabId;
  label: string;
  icon?: React.ComponentType<any>;
  component: React.ComponentType<any>;
  description?: string;
}

const TABS: TabConfig[] = [
  {
    id: 'health',
    label: 'Health',
    component: HealthTab,
    description: 'TODO: Add description'
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    component: MonitoringTab,
    description: 'TODO: Add description'
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    component: DiagnosticsTab,
    description: 'TODO: Add description'
  }
];

/**
 * UnifiedAdminView
 * 
 * Unified hub combining: HealthView, MonitoringView, HealthView
 * 
 * Features:
 * - Tab-based navigation
 * - Deep linking support via URL parameters
 * - Shared state management across tabs
 * - Lazy loading for performance
 */
export default function UnifiedAdminView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab: TabId = 'health';
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get('tab') as TabId) || defaultTab
  );
  
  // Shared state (if needed)
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  
  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabId);
    setSearchParams({ tab });
  };
  
  // Sync with URL on mount and changes
  useEffect(() => {
    const tab = searchParams.get('tab') as TabId;
    if (tab && TABS.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        handleTabChange(TABS[index].id);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Unified Admin Hub</h1>
          <p className="text-muted-foreground">
            TODO: Add description
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={{activeTab}} onValueChange={{handleTabChange}}>
        <TabsList className="grid w-full grid-cols-3"
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="health" className="space-y-4">
          <Suspense fallback={{
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }}>
            <HealthTab 
              selectedSymbol={{selectedSymbol}}
              onSymbolChange={{setSelectedSymbol}}
            />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="monitoring" className="space-y-4">
          <Suspense fallback={{
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }}>
            <MonitoringTab 
              selectedSymbol={{selectedSymbol}}
              onSymbolChange={{setSelectedSymbol}}
            />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="diagnostics" className="space-y-4">
          <Suspense fallback={{
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }}>
            <DiagnosticsTab 
              selectedSymbol={{selectedSymbol}}
              onSymbolChange={{setSelectedSymbol}}
            />
          </Suspense>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
