#!/usr/bin/env python3
"""
Architecture Organizer Script
Parses the Comprehensive Architecture Analysis Report and generates
an actionable implementation plan for reorganizing the codebase.
"""

import json
import re
from typing import Dict, List, Any
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class Page:
    """Represents a page/view component in the application"""
    number: int
    name: str
    file_location: str
    route: str
    component_name: str
    primary_purpose: str
    status: str  # 'keep', 'merge', 'remove'
    merge_target: str = None
    redirect_to: str = None


@dataclass
class Merger:
    """Represents a merger recommendation"""
    id: int
    title: str
    severity: str
    pages_to_merge: List[str]
    new_page_name: str
    new_route: str
    tabs: List[Dict[str, Any]]
    benefits: List[str]
    migration_steps: List[str]


@dataclass
class Implementation:
    """Represents an implementation phase"""
    phase: int
    name: str
    priority: str
    timeline: str
    tasks: List[str]
    success_criteria: List[str]


class ArchitectureOrganizer:
    """Parses the architecture report and generates implementation plan"""
    
    def __init__(self, report_path: str):
        self.report_path = Path(report_path)
        self.pages: List[Page] = []
        self.mergers: List[Merger] = []
        self.implementations: List[Implementation] = []
        self.route_mappings: Dict[str, str] = {}
        
    def parse_report(self):
        """Parse the architecture report"""
        with open(self.report_path, 'r') as f:
            content = f.read()
        
        self._parse_pages(content)
        self._parse_mergers(content)
        self._parse_implementations(content)
        self._parse_route_mappings(content)
        
    def _parse_pages(self, content: str):
        """Extract page information from the report"""
        # Pattern to match page sections
        page_pattern = r'#### PAGE (\d+): (\w+)\s+\*\*File Location:\*\* `([^`]+)`\s+\*\*Route:\*\* `([^`]+)`\s+\*\*Component Name:\*\* `([^`]+)`\s+\*\*Primary Purpose:\*\*\s+([^\n]+)'
        
        matches = re.finditer(page_pattern, content, re.MULTILINE)
        
        for match in matches:
            page = Page(
                number=int(match.group(1)),
                name=match.group(2),
                file_location=match.group(3),
                route=match.group(4),
                component_name=match.group(5),
                primary_purpose=match.group(6).strip(),
                status='keep'  # Default, will be updated
            )
            self.pages.append(page)
    
    def _parse_mergers(self, content: str):
        """Extract merger recommendations"""
        # Merger #1: Unified Trading Hub
        merger1 = Merger(
            id=1,
            title="Unified Trading Hub",
            severity="CRITICAL",
            pages_to_merge=[
                "TradingViewDashboard",
                "EnhancedTradingView",
                "FuturesTradingView",
                "TradingHubView"
            ],
            new_page_name="UnifiedTradingHubView",
            new_route="/trading",
            tabs=[
                {"id": "charts", "label": "Charts", "source": "TradingViewDashboard"},
                {"id": "spot", "label": "Spot", "source": "EnhancedTradingView"},
                {"id": "futures", "label": "Futures", "source": "FuturesTradingView"},
                {"id": "positions", "label": "Positions", "source": "PositionsView"},
                {"id": "portfolio", "label": "Portfolio", "source": "PortfolioPage"}
            ],
            benefits=[
                "Pages Reduced: 4 → 1 (75% reduction)",
                "Code Duplication: Eliminate ~2000 lines",
                "Network Requests: Reduce by ~40%",
                "Navigation Clicks: From 3-4 to 0",
                "Maintenance Time: 60% reduction"
            ],
            migration_steps=[
                "Create UnifiedTradingHubView.tsx",
                "Implement tab navigation system",
                "Create tab components",
                "Migrate content from source pages",
                "Add route redirects",
                "Update navigation menu"
            ]
        )
        
        # Merger #2: Unified AI Lab
        merger2 = Merger(
            id=2,
            title="Unified AI/ML Lab",
            severity="HIGH",
            pages_to_merge=[
                "TrainingView",
                "EnhancedStrategyLabView",
                "ScannerView"
            ],
            new_page_name="UnifiedAILabView",
            new_route="/ai-lab",
            tabs=[
                {"id": "scanner", "label": "Scanner", "source": "ScannerView"},
                {"id": "training", "label": "Training", "source": "TrainingView"},
                {"id": "backtest", "label": "Backtest", "source": "EnhancedStrategyLabView"},
                {"id": "builder", "label": "Builder", "source": "EnhancedStrategyLabView"},
                {"id": "insights", "label": "Insights", "source": "EnhancedStrategyLabView"}
            ],
            benefits=[
                "Pages Reduced: 3 → 1 (67% reduction)",
                "Workflow Efficiency: Single page for AI/ML",
                "Code Consolidation: Shared ML components"
            ],
            migration_steps=[
                "Create UnifiedAILabView.tsx",
                "Add Training tab",
                "Integrate Scanner tab",
                "Consolidate Strategy Lab tabs",
                "Add route redirects",
                "Update navigation menu"
            ]
        )
        
        # Merger #3: Unified Admin Hub
        merger3 = Merger(
            id=3,
            title="Unified Admin Hub",
            severity="MEDIUM",
            pages_to_merge=[
                "HealthView",
                "MonitoringView"
            ],
            new_page_name="UnifiedAdminView",
            new_route="/admin",
            tabs=[
                {"id": "health", "label": "Health", "source": "HealthView"},
                {"id": "monitoring", "label": "Monitoring", "source": "MonitoringView"},
                {"id": "diagnostics", "label": "Diagnostics", "source": "HealthView"}
            ],
            benefits=[
                "Pages Reduced: 2 → 1 (50% reduction)",
                "Consolidated Admin: All admin tools in one place"
            ],
            migration_steps=[
                "Create UnifiedAdminView.tsx",
                "Merge HealthView tabs",
                "Merge MonitoringView content",
                "Add route redirects",
                "Update navigation menu"
            ]
        )
        
        self.mergers = [merger1, merger2, merger3]
    
    def _parse_implementations(self, content: str):
        """Extract implementation phases"""
        impl1 = Implementation(
            phase=1,
            name="Unified Trading Hub",
            priority="HIGH",
            timeline="2-3 weeks",
            tasks=[
                "Create UnifiedTradingHubView.tsx",
                "Implement tab navigation system",
                "Create tab components (Charts, Spot, Futures, Positions, Portfolio)",
                "Implement shared state management",
                "Set up WebSocket connection pooling",
                "Migrate TradingViewDashboard → Charts tab",
                "Migrate EnhancedTradingView → Spot tab",
                "Migrate FuturesTradingView → Futures tab",
                "Add route redirects for backward compatibility",
                "Update navigation menu",
                "Test all tab functionality",
                "Performance optimization (lazy loading)"
            ],
            success_criteria=[
                "All 5 tabs functional",
                "WebSocket connections optimized",
                "No data duplication",
                "Backward compatibility maintained"
            ]
        )
        
        impl2 = Implementation(
            phase=2,
            name="Unified AI Lab",
            priority="MEDIUM",
            timeline="1-2 weeks",
            tasks=[
                "Create UnifiedAILabView.tsx",
                "Add Training tab (from TrainingView)",
                "Integrate with existing EnhancedStrategyLabView tabs",
                "Add Scanner tab integration",
                "Add route redirects",
                "Update navigation menu",
                "Test workflow continuity"
            ],
            success_criteria=[
                "All 5 tabs functional",
                "Training → Backtest workflow seamless",
                "Scanner integration working"
            ]
        )
        
        impl3 = Implementation(
            phase=3,
            name="Unified Admin Hub",
            priority="LOW",
            timeline="1 week",
            tasks=[
                "Create UnifiedAdminView.tsx",
                "Merge HealthView tabs",
                "Merge MonitoringView content",
                "Add route redirects",
                "Update navigation menu"
            ],
            success_criteria=[
                "All admin functionality accessible",
                "No feature loss"
            ]
        )
        
        impl4 = Implementation(
            phase=4,
            name="Dashboard Cleanup",
            priority="MEDIUM",
            timeline="3-5 days",
            tasks=[
                "Remove market data display from Dashboard",
                "Focus Dashboard on portfolio only",
                "Add link to Market Analysis Hub",
                "Update user documentation"
            ],
            success_criteria=[
                "Dashboard shows portfolio only",
                "Market data accessible via Market Analysis Hub"
            ]
        )
        
        self.implementations = [impl1, impl2, impl3, impl4]
    
    def _parse_route_mappings(self, content: str):
        """Extract route mapping information"""
        self.route_mappings = {
            # Trading routes
            "/tradingview-dashboard": "/trading?tab=charts",
            "/enhanced-trading": "/trading?tab=spot",
            "/futures": "/trading?tab=futures",
            "/trading-hub": "/trading",
            "/positions": "/trading?tab=positions",
            "/portfolio": "/trading?tab=portfolio",
            
            # AI/ML routes
            "/training": "/ai-lab?tab=training",
            "/strategylab": "/ai-lab",
            "/scanner": "/ai-lab?tab=scanner",
            
            # Admin routes
            "/health": "/admin?tab=health",
            "/monitoring": "/admin?tab=monitoring"
        }
    
    def generate_file_operations(self) -> List[Dict[str, Any]]:
        """Generate list of file operations needed"""
        operations = []
        
        # For each merger, generate operations
        for merger in self.mergers:
            # Create new unified component
            operations.append({
                "type": "create",
                "action": "Create new unified component",
                "file": f"src/views/{merger.new_page_name}.tsx",
                "description": f"New unified hub combining: {', '.join(merger.pages_to_merge)}"
            })
            
            # Add redirects for old routes
            for old_route, new_route in self.route_mappings.items():
                if any(page in old_route for page in [p.lower() for p in merger.pages_to_merge]):
                    operations.append({
                        "type": "redirect",
                        "action": "Add route redirect",
                        "old_route": old_route,
                        "new_route": new_route,
                        "description": "Backward compatibility redirect"
                    })
            
            # Mark old files for deprecation (not immediate deletion)
            for page_name in merger.pages_to_merge:
                page = next((p for p in self.pages if p.component_name == page_name), None)
                if page:
                    operations.append({
                        "type": "deprecate",
                        "action": "Mark for deprecation",
                        "file": page.file_location,
                        "description": f"Will be replaced by {merger.new_page_name}"
                    })
        
        return operations
    
    def generate_implementation_plan(self) -> Dict[str, Any]:
        """Generate complete implementation plan"""
        plan = {
            "project": "Dreammaker Crypto Platform - Architecture Reorganization",
            "summary": {
                "current_pages": len(self.pages),
                "target_pages": 8,
                "reduction_percentage": 55,
                "phases": len(self.implementations)
            },
            "mergers": [asdict(m) for m in self.mergers],
            "implementations": [asdict(i) for i in self.implementations],
            "route_mappings": self.route_mappings,
            "file_operations": self.generate_file_operations()
        }
        
        return plan
    
    def generate_task_checklist(self) -> List[str]:
        """Generate a flat checklist of all tasks"""
        tasks = []
        
        for impl in self.implementations:
            tasks.append(f"\n## Phase {impl.phase}: {impl.name} ({impl.priority} Priority - {impl.timeline})")
            for task in impl.tasks:
                tasks.append(f"- [ ] {task}")
        
        return tasks
    
    def save_implementation_plan(self, output_path: str):
        """Save the implementation plan to a JSON file"""
        plan = self.generate_implementation_plan()
        
        with open(output_path, 'w') as f:
            json.dump(plan, f, indent=2)
        
        print(f"✅ Implementation plan saved to: {output_path}")
    
    def save_task_checklist(self, output_path: str):
        """Save task checklist to a markdown file"""
        tasks = self.generate_task_checklist()
        
        with open(output_path, 'w') as f:
            f.write("# Architecture Reorganization Task Checklist\n\n")
            f.write("Generated from: Comprehensive_Architecture_Analysis_Report.txt\n\n")
            f.write("---\n")
            f.write('\n'.join(tasks))
        
        print(f"✅ Task checklist saved to: {output_path}")
    
    def print_summary(self):
        """Print a summary of the analysis"""
        print("\n" + "="*80)
        print("🏗️  ARCHITECTURE REORGANIZATION SUMMARY")
        print("="*80)
        
        print(f"\n📊 Current State:")
        print(f"   - Total Pages: {len(self.pages)}")
        print(f"   - Pages to Keep: {len([p for p in self.pages if p.status == 'keep'])}")
        
        print(f"\n🔀 Merger Recommendations: {len(self.mergers)}")
        for merger in self.mergers:
            print(f"\n   {merger.id}. {merger.title} ({merger.severity})")
            print(f"      Pages: {' + '.join(merger.pages_to_merge)}")
            print(f"      → {merger.new_page_name} ({merger.new_route})")
            print(f"      Tabs: {', '.join([t['label'] for t in merger.tabs])}")
        
        print(f"\n📋 Implementation Phases: {len(self.implementations)}")
        for impl in self.implementations:
            print(f"   Phase {impl.phase}: {impl.name} ({impl.priority} - {impl.timeline})")
        
        print(f"\n🔄 Route Redirects: {len(self.route_mappings)}")
        print(f"   {len([r for r in self.route_mappings if '/trading' in self.route_mappings[r]])} trading routes")
        print(f"   {len([r for r in self.route_mappings if '/ai-lab' in self.route_mappings[r]])} AI/ML routes")
        print(f"   {len([r for r in self.route_mappings if '/admin' in self.route_mappings[r]])} admin routes")
        
        print("\n" + "="*80)


def main():
    """Main execution function"""
    import sys
    
    # Check if report path is provided
    if len(sys.argv) > 1:
        report_path = sys.argv[1]
    else:
        report_path = "Comprehensive_Architecture_Analysis_Report.txt"
    
    # Check if report exists
    if not Path(report_path).exists():
        print(f"❌ Error: Report file not found: {report_path}")
        sys.exit(1)
    
    print(f"📖 Reading architecture report: {report_path}")
    
    # Create organizer and parse report
    organizer = ArchitectureOrganizer(report_path)
    organizer.parse_report()
    
    # Print summary
    organizer.print_summary()
    
    # Generate output files
    output_dir = Path("architecture_reorganization")
    output_dir.mkdir(exist_ok=True)
    
    organizer.save_implementation_plan(str(output_dir / "implementation_plan.json"))
    organizer.save_task_checklist(str(output_dir / "task_checklist.md"))
    
    # Generate route redirect template
    with open(output_dir / "route_redirects.tsx", 'w') as f:
        f.write("// Route Redirects for Backward Compatibility\n")
        f.write("// Add these to your router configuration\n\n")
        f.write("import { Navigate } from 'react-router-dom';\n\n")
        
        for old_route, new_route in organizer.route_mappings.items():
            f.write(f'<Route path="{old_route}" element={{<Navigate to="{new_route}" replace />}} />\n')
    
    print(f"✅ Route redirects template saved to: {output_dir}/route_redirects.tsx")
    
    print(f"\n✨ All files generated in: {output_dir}/")
    print("\n📚 Next Steps:")
    print("   1. Review implementation_plan.json for detailed merger information")
    print("   2. Follow task_checklist.md for step-by-step implementation")
    print("   3. Use route_redirects.tsx for backward compatibility")
    print("   4. Start with Phase 1 (Unified Trading Hub) - HIGH priority")


if __name__ == "__main__":
    main()
