#!/usr/bin/env python3
"""
Component Template Generator
Generates TypeScript/React component templates for the unified views
based on the architecture reorganization plan.
"""

import json
import os
from pathlib import Path
from typing import Dict, List


class ComponentTemplateGenerator:
    """Generates React component templates for unified views"""
    
    def __init__(self, plan_path: str):
        self.plan_path = Path(plan_path)
        with open(self.plan_path, 'r') as f:
            self.plan = json.load(f)
    
    def generate_unified_view_template(self, merger: Dict) -> str:
        """Generate the main unified view component template"""
        component_name = merger['new_page_name']
        tabs = merger['tabs']
        tab_ids = [tab['id'] for tab in tabs]
        
        template = f'''import React, {{ useState, useEffect, Suspense }} from 'react';
import {{ useSearchParams }} from 'react-router-dom';
import {{ Tabs, TabsList, TabsTrigger, TabsContent }} from '@/components/ui/tabs';
import {{ Card }} from '@/components/ui/card';
import {{ Loader2 }} from 'lucide-react';

// Tab Components (to be implemented)
'''
        
        # Import statements for tabs
        for tab in tabs:
            tab_name = tab['label'].replace(' ', '')
            template += f"import {{{tab_name}Tab}} from '@/components/{merger['new_page_name'].lower().replace('view', '')}/{tab_name}Tab';\n"
        
        template += f'''
// Types
type TabId = {' | '.join([f"'{tab['id']}'" for tab in tabs])};

interface TabConfig {{
  id: TabId;
  label: string;
  icon?: React.ComponentType<any>;
  component: React.ComponentType<any>;
  description?: string;
}}

const TABS: TabConfig[] = [
'''
        
        # Tab configurations
        for i, tab in enumerate(tabs):
            tab_name = tab['label'].replace(' ', '')
            template += f'''  {{
    id: '{tab['id']}',
    label: '{tab['label']}',
    component: {tab_name}Tab,
    description: 'TODO: Add description'
  }}{',' if i < len(tabs) - 1 else ''}
'''
        
        template += f'''];

/**
 * {component_name}
 * 
 * Unified hub combining: {', '.join([tab['source'] for tab in tabs])}
 * 
 * Features:
 * - Tab-based navigation
 * - Deep linking support via URL parameters
 * - Shared state management across tabs
 * - Lazy loading for performance
 */
export default function {component_name}() {{
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab: TabId = '{tabs[0]['id']}';
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get('tab') as TabId) || defaultTab
  );
  
  // Shared state (if needed)
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  
  // Update URL when tab changes
  const handleTabChange = (tab: string) => {{
    setActiveTab(tab as TabId);
    setSearchParams({{ tab }});
  }};
  
  // Sync with URL on mount and changes
  useEffect(() => {{
    const tab = searchParams.get('tab') as TabId;
    if (tab && TABS.find(t => t.id === tab)) {{
      setActiveTab(tab);
    }}
  }}, [searchParams]);
  
  // Keyboard shortcuts
  useEffect(() => {{
    const handleKeyPress = (e: KeyboardEvent) => {{
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '{len(tabs)}') {{
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        handleTabChange(TABS[index].id);
      }}
    }};
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }}, []);
  
  return (
    <div className="container mx-auto p-4 space-y-4">
      {{/* Header */}}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{merger['title']}</h1>
          <p className="text-muted-foreground">
            TODO: Add description
          </p>
        </div>
      </div>
      
      {{/* Tabs */}}
      <Tabs value={{{{activeTab}}}} onValueChange={{{{handleTabChange}}}}>
        <TabsList className="grid w-full grid-cols-{len(tabs)}"
'''
        
        for tab in tabs:
            template += f'''          <TabsTrigger value="{tab['id']}">{tab['label']}</TabsTrigger>
'''
        
        template += '''        </TabsList>
        
'''
        
        for tab in tabs:
            tab_name = tab['label'].replace(' ', '')
            template += f'''        <TabsContent value="{tab['id']}" className="space-y-4">
          <Suspense fallback={{{{
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }}}}>
            <{tab_name}Tab 
              selectedSymbol={{{{selectedSymbol}}}}
              onSymbolChange={{{{setSelectedSymbol}}}}
            />
          </Suspense>
        </TabsContent>
        
'''
        
        template += '''      </Tabs>
    </div>
  );
}
'''
        
        return template
    
    def generate_tab_component_template(self, tab_name: str, source_component: str) -> str:
        """Generate a tab component template"""
        
        template = f'''import React, {{ useState, useEffect }} from 'react';
import {{ Card, CardContent, CardDescription, CardHeader, CardTitle }} from '@/components/ui/card';
import {{ Alert, AlertDescription }} from '@/components/ui/alert';
import {{ InfoIcon }} from 'lucide-react';

interface {tab_name}TabProps {{
  selectedSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
}}

/**
 * {tab_name}Tab
 * 
 * Migrated from: {source_component}
 * 
 * TODO: Migrate functionality from {source_component}
 */
export function {tab_name}Tab({{ 
  selectedSymbol = 'BTCUSDT',
  onSymbolChange 
}}: {tab_name}TabProps) {{
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // TODO: Implement data fetching
  useEffect(() => {{
    // Fetch data when component mounts or selectedSymbol changes
    setLoading(true);
    
    // Example API call
    // fetchData(selectedSymbol)
    //   .then(data => {{ /* handle data */ }})
    //   .catch(err => setError(err.message))
    //   .finally(() => setLoading(false));
    
    setLoading(false);
  }}, [selectedSymbol]);
  
  if (error) {{{{
    return (
      <Alert variant="destructive">
        <AlertDescription>{{{{error}}}}</AlertDescription>
      </Alert>
    );
  }}}}
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{tab_name}</CardTitle>
          <CardDescription>
            TODO: Add description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              This component needs to be migrated from {source_component}.
              Implement the functionality here.
            </AlertDescription>
          </Alert>
          
          {{{{/* TODO: Add component content */}}}}
          <div className="mt-4 p-4 border rounded">
            <p className="text-sm text-muted-foreground">
              Selected Symbol: {{{{selectedSymbol}}}}
            </p>
            <p className="text-sm text-muted-foreground">
              Loading: {{{{loading ? 'Yes' : 'No'}}}}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}}

export default {tab_name}Tab;
'''
        
        return template
    
    def generate_all_templates(self, output_dir: str = 'component_templates'):
        """Generate all component templates"""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        print(f"\n🎨 Generating component templates in: {output_path}")
        
        for merger in self.plan['mergers']:
            print(f"\n📦 Generating {merger['new_page_name']}...")
            
            # Create directory for this merger
            merger_dir = output_path / merger['new_page_name'].lower().replace('view', '')
            merger_dir.mkdir(exist_ok=True)
            
            # Generate main view component
            main_template = self.generate_unified_view_template(merger)
            main_file = merger_dir / f"{merger['new_page_name']}.tsx"
            
            with open(main_file, 'w') as f:
                f.write(main_template)
            
            print(f"   ✅ Created: {main_file}")
            
            # Generate tab components
            tabs_dir = merger_dir / 'tabs'
            tabs_dir.mkdir(exist_ok=True)
            
            for tab in merger['tabs']:
                tab_name = tab['label'].replace(' ', '')
                tab_template = self.generate_tab_component_template(
                    tab_name, 
                    tab['source']
                )
                tab_file = tabs_dir / f"{tab_name}Tab.tsx"
                
                with open(tab_file, 'w') as f:
                    f.write(tab_template)
                
                print(f"   ✅ Created: {tab_file}")
        
        # Generate index file for easy imports
        self._generate_index_file(output_path)
        
        print(f"\n✨ All templates generated successfully!")
        print(f"\n📝 Next steps:")
        print(f"   1. Review generated templates in {output_path}")
        print(f"   2. Copy templates to your src/ directory")
        print(f"   3. Implement TODOs in each component")
        print(f"   4. Migrate functionality from source components")
        print(f"   5. Test each tab component")
        print(f"   6. Add route redirects")
        print(f"   7. Update navigation menu")
    
    def _generate_index_file(self, output_dir: Path):
        """Generate index.ts for easy imports"""
        content = '''/**
 * Component Templates Index
 * 
 * Auto-generated exports for unified view components
 */

// Unified Views
'''
        
        for merger in self.plan['mergers']:
            component_name = merger['new_page_name']
            merger_dir = component_name.lower().replace('view', '')
            content += f"export {{ default as {component_name} }} from './{merger_dir}/{component_name}';\n"
        
        content += '''
// TODO: Add more exports as needed
'''
        
        index_file = output_dir / 'index.ts'
        with open(index_file, 'w') as f:
            f.write(content)
        
        print(f"   ✅ Created: {index_file}")


def main():
    """Main execution"""
    import sys
    
    # Check if plan file is provided
    if len(sys.argv) > 1:
        plan_path = sys.argv[1]
    else:
        plan_path = "architecture_reorganization/implementation_plan.json"
    
    if not Path(plan_path).exists():
        print(f"❌ Error: Implementation plan not found: {plan_path}")
        print("Run architecture_organizer.py first to generate the plan.")
        sys.exit(1)
    
    print("🎨 Component Template Generator")
    print("="*80)
    print(f"📖 Reading plan from: {plan_path}")
    
    # Generate templates
    generator = ComponentTemplateGenerator(plan_path)
    generator.generate_all_templates()


if __name__ == "__main__":
    main()
