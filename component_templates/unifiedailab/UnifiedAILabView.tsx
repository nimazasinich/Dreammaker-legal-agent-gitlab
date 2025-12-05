import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Tab Components (to be implemented)
import {ScannerTab} from '@/components/unifiedailab/ScannerTab';
import {TrainingTab} from '@/components/unifiedailab/TrainingTab';
import {BacktestTab} from '@/components/unifiedailab/BacktestTab';
import {BuilderTab} from '@/components/unifiedailab/BuilderTab';
import {InsightsTab} from '@/components/unifiedailab/InsightsTab';

// Types
type TabId = 'scanner' | 'training' | 'backtest' | 'builder' | 'insights';

interface TabConfig {
  id: TabId;
  label: string;
  icon?: React.ComponentType<any>;
  component: React.ComponentType<any>;
  description?: string;
}

const TABS: TabConfig[] = [
  {
    id: 'scanner',
    label: 'Scanner',
    component: ScannerTab,
    description: 'TODO: Add description'
  },
  {
    id: 'training',
    label: 'Training',
    component: TrainingTab,
    description: 'TODO: Add description'
  },
  {
    id: 'backtest',
    label: 'Backtest',
    component: BacktestTab,
    description: 'TODO: Add description'
  },
  {
    id: 'builder',
    label: 'Builder',
    component: BuilderTab,
    description: 'TODO: Add description'
  },
  {
    id: 'insights',
    label: 'Insights',
    component: InsightsTab,
    description: 'TODO: Add description'
  }
];

/**
 * UnifiedAILabView
 * 
 * Unified hub combining: ScannerView, TrainingView, EnhancedStrategyLabView, EnhancedStrategyLabView, EnhancedStrategyLabView
 * 
 * Features:
 * - Tab-based navigation
 * - Deep linking support via URL parameters
 * - Shared state management across tabs
 * - Lazy loading for performance
 */
export default function UnifiedAILabView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab: TabId = 'scanner';
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
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '5') {
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
          <h1 className="text-3xl font-bold">Unified AI/ML Lab</h1>
          <p className="text-muted-foreground">
            TODO: Add description
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={{activeTab}} onValueChange={{handleTabChange}}>
        <TabsList className="grid w-full grid-cols-5"
          <TabsTrigger value="scanner">Scanner</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scanner" className="space-y-4">
          <Suspense fallback={{
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }}>
            <ScannerTab 
              selectedSymbol={{selectedSymbol}}
              onSymbolChange={{setSelectedSymbol}}
            />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="training" className="space-y-4">
          <Suspense fallback={{
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }}>
            <TrainingTab 
              selectedSymbol={{selectedSymbol}}
              onSymbolChange={{setSelectedSymbol}}
            />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="backtest" className="space-y-4">
          <Suspense fallback={{
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }}>
            <BacktestTab 
              selectedSymbol={{selectedSymbol}}
              onSymbolChange={{setSelectedSymbol}}
            />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="builder" className="space-y-4">
          <Suspense fallback={{
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }}>
            <BuilderTab 
              selectedSymbol={{selectedSymbol}}
              onSymbolChange={{setSelectedSymbol}}
            />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-4">
          <Suspense fallback={{
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }}>
            <InsightsTab 
              selectedSymbol={{selectedSymbol}}
              onSymbolChange={{setSelectedSymbol}}
            />
          </Suspense>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
