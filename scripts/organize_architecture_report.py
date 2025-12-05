#!/usr/bin/env python3
"""
Architecture Report Organizer
Analyzes Comprehensive_Architecture_Analysis_Report.txt and organizes pages
according to the merger recommendations.
"""

import re
import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Set
from pathlib import Path
from collections import defaultdict
from enum import Enum


class PageCategory(Enum):
    """Page categories for organization"""
    TRADING = "Trading"
    MARKET = "Market Analysis"
    AI_ML = "AI/ML"
    RISK = "Risk Management"
    ADMIN = "Admin"
    SETTINGS = "Settings"
    DASHBOARD = "Dashboard"
    OTHER = "Other"


class PageStatus(Enum):
    """Status of pages in the reorganization"""
    KEEP_STANDALONE = "Keep Standalone"
    MERGE_INTO_HUB = "Merge into Hub"
    REDUNDANT = "Redundant (already in hub)"
    TO_BE_CREATED = "To be Created (new unified hub)"


@dataclass
class PageInfo:
    """Information about a page"""
    page_number: int
    name: str
    file_location: str
    route: str
    component_name: str
    primary_purpose: str
    api_dependencies: List[str]
    websocket_events: List[str]
    key_features: List[str]
    user_intent: str
    usage_frequency: str
    technical_complexity: str
    current_issues: List[str]
    category: PageCategory
    status: PageStatus
    merge_target: Optional[str] = None
    tab_name: Optional[str] = None
    priority: str = "MEDIUM"


@dataclass
class UnifiedHub:
    """Information about a unified hub"""
    name: str
    route: str
    component_name: str
    source_pages: List[str]
    tabs: List[Dict[str, str]]
    priority: str
    status: str = "PLANNED"


class ArchitectureReportOrganizer:
    """Organizes and sorts pages from the architecture report"""
    
    def __init__(self, report_path: str):
        self.report_path = Path(report_path)
        self.pages: List[PageInfo] = []
        self.unified_hubs: List[UnifiedHub] = []
        self.report_content = ""
        
    def load_report(self) -> str:
        """Load the report file"""
        with open(self.report_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def parse_page_section(self, content: str, page_num: int) -> Optional[PageInfo]:
        """Parse a single page section from the report"""
        pattern = rf"#### PAGE {page_num}: (.+?)\n\n\*\*File Location:\*\* `(.+?)`\s+\*\*Route:\*\* `(.+?)`\s+\*\*Component Name:\*\* `(.+?)`"
        match = re.search(pattern, content, re.DOTALL)
        
        if not match:
            return None
        
        name = match.group(1).strip()
        file_location = match.group(2).strip()
        route = match.group(3).strip()
        component_name = match.group(4).strip()
        
        # Extract Primary Purpose
        purpose_match = re.search(r"\*\*Primary Purpose:\*\*\s+(.+?)(?=\n\n\*\*API|\*\*Key Features)", content[match.end():], re.DOTALL)
        primary_purpose = purpose_match.group(1).strip() if purpose_match else ""
        
        # Extract API Dependencies
        api_match = re.search(r"\*\*API Dependencies:\*\*\s+(.+?)(?=\n\n\*\*Key Features|\*\*WebSocket)", content[match.end():], re.DOTALL)
        api_deps = []
        if api_match:
            api_text = api_match.group(1)
            api_deps = [line.strip().replace('- Fetches:', '').replace('-', '').strip() 
                        for line in api_text.split('\n') if line.strip() and ('Fetches:' in line or line.strip().startswith('-'))]
        
        # Extract WebSocket events
        ws_match = re.search(r"WebSocket: (.+?)(?=\n\n\*\*Key Features|\*\*User Intent)", content[match.end():], re.DOTALL)
        websocket_events = []
        if ws_match:
            ws_text = ws_match.group(1)
            websocket_events = [event.strip() for event in re.findall(r'`([^`]+)`', ws_text)]
        
        # Extract Key Features
        features_match = re.search(r"\*\*Key Features:\*\*\s+(.+?)(?=\n\n\*\*User Intent)", content[match.end():], re.DOTALL)
        key_features = []
        if features_match:
            features_text = features_match.group(1)
            key_features = [line.strip().replace(f"{i+1}.", "").strip() 
                           for i, line in enumerate(features_text.split('\n')) 
                           if line.strip() and (line.strip()[0].isdigit() or line.strip().startswith('-'))]
        
        # Extract User Intent
        intent_match = re.search(r"\*\*User Intent:\*\*\s+(.+?)(?=\n\n\*\*Data Display)", content[match.end():], re.DOTALL)
        user_intent = intent_match.group(1).strip() if intent_match else ""
        
        # Extract Usage Frequency
        usage_match = re.search(r"\*\*Usage Frequency:\*\*\s+(.+?)(?=\n\n\*\*Technical)", content[match.end():], re.DOTALL)
        usage_frequency = usage_match.group(1).strip() if usage_match else ""
        
        # Extract Technical Complexity
        tech_match = re.search(r"\*\*Technical Complexity:\*\*\s+(.+?)(?=\n\n\*\*Current Issues)", content[match.end():], re.DOTALL)
        technical_complexity = tech_match.group(1).strip() if tech_match else ""
        
        # Extract Current Issues
        issues_match = re.search(r"\*\*Current Issues/Pain Points:\*\*\s+(.+?)(?=---|\n\n####)", content[match.end():], re.DOTALL)
        current_issues = []
        if issues_match:
            issues_text = issues_match.group(1)
            current_issues = [line.strip().replace('-', '').strip() 
                             for line in issues_text.split('\n') if line.strip() and line.strip().startswith('-')]
        
        # Determine category and status based on name and content
        category, status, merge_target, tab_name, priority = self._classify_page(name, primary_purpose, route)
        
        return PageInfo(
            page_number=page_num,
            name=name,
            file_location=file_location,
            route=route,
            component_name=component_name,
            primary_purpose=primary_purpose,
            api_dependencies=api_deps,
            websocket_events=websocket_events,
            key_features=key_features[:10],  # Limit to first 10 features
            user_intent=user_intent,
            usage_frequency=usage_frequency,
            technical_complexity=technical_complexity,
            current_issues=current_issues,
            category=category,
            status=status,
            merge_target=merge_target,
            tab_name=tab_name,
            priority=priority
        )
    
    def _classify_page(self, name: str, purpose: str, route: str) -> tuple:
        """Classify a page into category, status, and merge target"""
        name_lower = name.lower()
        purpose_lower = purpose.lower()
        
        # Trading pages - check specific names first to avoid substring matches
        if any(x in name_lower for x in ['trading', 'futures', 'positions', 'portfolio']):
            # Check for specific page names first (more specific matches first)
            # Order matters: check most specific names first
            if name_lower == 'positionsview':
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB,
                       "UnifiedTradingHubView", "positions", "HIGH")
            elif name_lower == 'portfoliopage':
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB,
                       "UnifiedTradingHubView", "portfolio", "HIGH")
            elif name_lower == 'futurestradingview':
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB,
                       "UnifiedTradingHubView", "futures", "HIGH")
            elif name_lower == 'enhancedtradingview':
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB,
                       "UnifiedTradingHubView", "spot", "HIGH")
            elif name_lower == 'tradingviewdashboard':
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB, 
                       "UnifiedTradingHubView", "charts", "HIGH")
            elif name_lower == 'tradinghubview':
                return (PageCategory.TRADING, PageStatus.TO_BE_CREATED,
                       None, None, "HIGH")
            # Fallback for partial matches
            elif 'positions' in name_lower:
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB,
                       "UnifiedTradingHubView", "positions", "HIGH")
            elif 'portfolio' in name_lower:
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB,
                       "UnifiedTradingHubView", "portfolio", "HIGH")
            elif 'futures' in name_lower:
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB,
                       "UnifiedTradingHubView", "futures", "HIGH")
            elif 'enhanced' in name_lower and 'trading' in name_lower:
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB,
                       "UnifiedTradingHubView", "spot", "HIGH")
            elif 'tradingview' in name_lower:
                return (PageCategory.TRADING, PageStatus.MERGE_INTO_HUB, 
                       "UnifiedTradingHubView", "charts", "HIGH")
            elif 'trading' in name_lower and 'hub' in name_lower:
                return (PageCategory.TRADING, PageStatus.TO_BE_CREATED,
                       None, None, "HIGH")
        
        # Market pages
        elif any(x in name_lower for x in ['market', 'scanner']):
            if 'hub' in name_lower:
                return (PageCategory.MARKET, PageStatus.KEEP_STANDALONE,
                       None, None, "MEDIUM")
            elif 'scanner' in name_lower:
                return (PageCategory.MARKET, PageStatus.REDUNDANT,
                       "MarketAnalysisHub", "scanner", "MEDIUM")
            elif 'market' in name_lower and 'view' in name_lower:
                return (PageCategory.MARKET, PageStatus.REDUNDANT,
                       "MarketAnalysisHub", "market", "MEDIUM")
            else:
                return (PageCategory.MARKET, PageStatus.KEEP_STANDALONE,
                       None, None, "MEDIUM")
        
        # AI/ML pages
        elif any(x in name_lower for x in ['training', 'strategy', 'lab']):
            if 'training' in name_lower:
                return (PageCategory.AI_ML, PageStatus.MERGE_INTO_HUB,
                       "UnifiedAILabView", "training", "MEDIUM")
            elif 'strategy' in name_lower and 'lab' in name_lower:
                return (PageCategory.AI_ML, PageStatus.MERGE_INTO_HUB,
                       "UnifiedAILabView", None, "MEDIUM")
            else:
                return (PageCategory.AI_ML, PageStatus.KEEP_STANDALONE,
                       None, None, "MEDIUM")
        
        # Risk pages
        elif 'risk' in name_lower:
            if 'professional' in name_lower:
                return (PageCategory.RISK, PageStatus.KEEP_STANDALONE,
                       None, None, "MEDIUM")
            else:
                return (PageCategory.RISK, PageStatus.KEEP_STANDALONE,
                       None, None, "MEDIUM")
        
        # Admin pages
        elif any(x in name_lower for x in ['health', 'monitoring']):
            if 'health' in name_lower:
                return (PageCategory.ADMIN, PageStatus.MERGE_INTO_HUB,
                       "UnifiedAdminView", "health", "LOW")
            elif 'monitoring' in name_lower:
                return (PageCategory.ADMIN, PageStatus.MERGE_INTO_HUB,
                       "UnifiedAdminView", "monitoring", "LOW")
            else:
                return (PageCategory.ADMIN, PageStatus.KEEP_STANDALONE,
                       None, None, "LOW")
        
        # Dashboard
        elif 'dashboard' in name_lower and 'enhanced' in name_lower:
            return (PageCategory.DASHBOARD, PageStatus.KEEP_STANDALONE,
                   None, None, "HIGH")
        
        # Settings
        elif 'settings' in name_lower:
            return (PageCategory.SETTINGS, PageStatus.KEEP_STANDALONE,
                   None, None, "MEDIUM")
        
        # Technical Analysis
        elif 'technical' in name_lower:
            return (PageCategory.MARKET, PageStatus.KEEP_STANDALONE,
                   None, None, "MEDIUM")
        
        return (PageCategory.OTHER, PageStatus.KEEP_STANDALONE, None, None, "MEDIUM")
    
    def parse_all_pages(self):
        """Parse all pages from the report"""
        content = self.load_report()
        self.report_content = content
        
        # Find all page sections
        for page_num in range(1, 19):  # Pages 1-18
            page_info = self.parse_page_section(content, page_num)
            if page_info:
                self.pages.append(page_info)
    
    def create_unified_hubs(self):
        """Create unified hub definitions based on recommendations"""
        self.unified_hubs = [
            UnifiedHub(
                name="UnifiedTradingHubView",
                route="/trading",
                component_name="UnifiedTradingHubView",
                source_pages=[
                    "TradingViewDashboard",
                    "EnhancedTradingView",
                    "FuturesTradingView",
                    "TradingHubView"
                ],
                tabs=[
                    {"id": "charts", "label": "Charts", "source": "TradingViewDashboard"},
                    {"id": "spot", "label": "Spot", "source": "EnhancedTradingView"},
                    {"id": "futures", "label": "Futures", "source": "FuturesTradingView", "default": True},
                    {"id": "positions", "label": "Positions", "source": "PositionsView"},
                    {"id": "portfolio", "label": "Portfolio", "source": "PortfolioPage"}
                ],
                priority="HIGH",
                status="PLANNED"
            ),
            UnifiedHub(
                name="UnifiedAILabView",
                route="/ai-lab",
                component_name="UnifiedAILabView",
                source_pages=[
                    "TrainingView",
                    "EnhancedStrategyLabView",
                    "ScannerView"
                ],
                tabs=[
                    {"id": "scanner", "label": "Scanner", "source": "ScannerView", "default": True},
                    {"id": "training", "label": "Training", "source": "TrainingView"},
                    {"id": "backtest", "label": "Backtest", "source": "EnhancedStrategyLabView"},
                    {"id": "builder", "label": "Builder", "source": "EnhancedStrategyLabView"},
                    {"id": "insights", "label": "Insights", "source": "EnhancedStrategyLabView"}
                ],
                priority="MEDIUM",
                status="PLANNED"
            ),
            UnifiedHub(
                name="UnifiedAdminView",
                route="/admin",
                component_name="UnifiedAdminView",
                source_pages=[
                    "HealthView",
                    "MonitoringView"
                ],
                tabs=[
                    {"id": "health", "label": "Health", "source": "HealthView", "default": True},
                    {"id": "monitoring", "label": "Monitoring", "source": "MonitoringView"},
                    {"id": "diagnostics", "label": "Diagnostics", "source": "HealthView"}
                ],
                priority="LOW",
                status="PLANNED"
            )
        ]
    
    def organize_pages_by_category(self) -> Dict[PageCategory, List[PageInfo]]:
        """Organize pages by category"""
        organized = defaultdict(list)
        for page in self.pages:
            organized[page.category].append(page)
        return dict(organized)
    
    def generate_sorted_report(self) -> str:
        """Generate a sorted and organized report"""
        organized = self.organize_pages_by_category()
        
        report = []
        report.append("# 🏗️ ARCHITECTURE REPORT - ORGANIZED PAGE INVENTORY\n")
        report.append(f"**Generated:** {Path(__file__).stat().st_mtime}")
        report.append(f"**Total Pages Analyzed:** {len(self.pages)}\n")
        report.append("---\n")
        
        # Summary by category
        report.append("## 📊 SUMMARY BY CATEGORY\n")
        for category in PageCategory:
            pages_in_category = organized.get(category, [])
            report.append(f"- **{category.value}:** {len(pages_in_category)} pages")
        report.append("\n---\n")
        
        # Unified Hubs
        report.append("## 🔀 UNIFIED HUBS TO CREATE\n")
        for hub in self.unified_hubs:
            report.append(f"### {hub.name}\n")
            report.append(f"- **Route:** `{hub.route}`")
            report.append(f"- **Priority:** {hub.priority}")
            report.append(f"- **Status:** {hub.status}")
            report.append(f"- **Source Pages:** {', '.join(hub.source_pages)}")
            report.append(f"- **Tabs:**")
            for tab in hub.tabs:
                default_marker = " (Default)" if tab.get("default") else ""
                report.append(f"  - {tab['label']}: `{tab['id']}` - from {tab['source']}{default_marker}")
            report.append("\n")
        
        report.append("---\n")
        
        # Pages by category
        for category in PageCategory:
            pages_in_category = organized.get(category, [])
            if not pages_in_category:
                continue
            
            report.append(f"## 📁 {category.value.upper()}\n")
            
            # Sort by priority and status
            pages_sorted = sorted(pages_in_category, 
                                 key=lambda p: (
                                     {"HIGH": 0, "MEDIUM": 1, "LOW": 2}.get(p.priority, 3),
                                     p.status.value
                                 ))
            
            for page in pages_sorted:
                status_emoji = {
                    PageStatus.KEEP_STANDALONE: "✅",
                    PageStatus.MERGE_INTO_HUB: "🔄",
                    PageStatus.REDUNDANT: "⚠️",
                    PageStatus.TO_BE_CREATED: "🆕"
                }.get(page.status, "📄")
                
                report.append(f"### {status_emoji} PAGE {page.page_number}: {page.name}\n")
                report.append(f"- **Route:** `{page.route}`")
                report.append(f"- **File:** `{page.file_location}`")
                report.append(f"- **Status:** {page.status.value}")
                report.append(f"- **Priority:** {page.priority}")
                
                if page.merge_target:
                    report.append(f"- **Merge Target:** {page.merge_target}")
                if page.tab_name:
                    report.append(f"- **Tab Name:** {page.tab_name}")
                
                report.append(f"- **Purpose:** {page.primary_purpose[:100]}...")
                report.append(f"- **Complexity:** {page.technical_complexity}")
                report.append("\n")
            
            report.append("---\n")
        
        # Implementation roadmap
        report.append("## 🗺️ IMPLEMENTATION ROADMAP\n")
        report.append("### Phase 1: Unified Trading Hub (HIGH Priority)\n")
        trading_pages = [p for p in self.pages if p.category == PageCategory.TRADING and p.status == PageStatus.MERGE_INTO_HUB]
        report.append(f"- Pages to merge: {len(trading_pages)}")
        for page in trading_pages:
            report.append(f"  - {page.name} → {page.merge_target} ({page.tab_name} tab)")
        report.append("\n")
        
        report.append("### Phase 2: Unified AI Lab (MEDIUM Priority)\n")
        ai_pages = [p for p in self.pages if p.category == PageCategory.AI_ML and p.status == PageStatus.MERGE_INTO_HUB]
        report.append(f"- Pages to merge: {len(ai_pages)}")
        for page in ai_pages:
            report.append(f"  - {page.name} → {page.merge_target} ({page.tab_name or 'multiple'} tabs)")
        report.append("\n")
        
        report.append("### Phase 3: Unified Admin Hub (LOW Priority)\n")
        admin_pages = [p for p in self.pages if p.category == PageCategory.ADMIN and p.status == PageStatus.MERGE_INTO_HUB]
        report.append(f"- Pages to merge: {len(admin_pages)}")
        for page in admin_pages:
            report.append(f"  - {page.name} → {page.merge_target} ({page.tab_name} tab)")
        report.append("\n")
        
        return "\n".join(report)
    
    def export_json(self, output_path: str):
        """Export organized data as JSON"""
        data = {
            "pages": [asdict(page) for page in self.pages],
            "unified_hubs": [asdict(hub) for hub in self.unified_hubs],
            "summary": {
                "total_pages": len(self.pages),
                "pages_by_category": {
                    cat.value: len([p for p in self.pages if p.category == cat])
                    for cat in PageCategory
                },
                "pages_by_status": {
                    status.value: len([p for p in self.pages if p.status == status])
                    for status in PageStatus
                }
            }
        }
        
        # Convert enums to strings for JSON serialization
        def convert_enums(obj):
            if isinstance(obj, dict):
                return {k: convert_enums(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_enums(item) for item in obj]
            elif isinstance(obj, Enum):
                return obj.value
            return obj
        
        data = convert_enums(data)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def generate_route_mapping(self) -> str:
        """Generate route mapping for redirects"""
        mapping = []
        mapping.append("# 🔀 ROUTE MAPPING (Old → New)\n")
        mapping.append("\nThis file contains the route redirects needed for backward compatibility.\n")
        mapping.append("\n## TypeScript/React Router Routes\n")
        mapping.append("```typescript\n")
        
        # Route mappings based on recommendations from the report
        route_mappings = [
            # Trading routes
            ("/tradingview-dashboard", "/trading", "charts"),
            ("/enhanced-trading", "/trading", "spot"),
            ("/futures", "/trading", "futures"),
            ("/trading-hub", "/trading", None),
            ("/positions", "/trading", "positions"),
            ("/portfolio", "/trading", "portfolio"),
            
            # AI/ML routes
            ("/training", "/ai-lab", "training"),
            ("/strategylab", "/ai-lab", None),
            ("/scanner", "/ai-lab", "scanner"),  # or could be /market-analysis?tab=scanner
            
            # Market routes (already redirecting)
            ("/market", "/market-analysis", "market"),
            
            # Admin routes
            ("/health", "/admin", "health"),
            ("/monitoring", "/admin", "monitoring"),
        ]
        
        for old_route, new_route, tab in route_mappings:
            if tab:
                mapping.append(f"<Route path=\"{old_route}\" element={{<Navigate to=\"{new_route}?tab={tab}\" replace />}} />")
            else:
                mapping.append(f"<Route path=\"{old_route}\" element={{<Navigate to=\"{new_route}\" replace />}} />")
        
        mapping.append("```\n")
        
        mapping.append("\n## Summary\n")
        mapping.append(f"- Total redirects: {len(route_mappings)}")
        mapping.append("- All old routes will redirect to new unified hubs")
        mapping.append("- Deep linking supported via query parameters\n")
        
        return "\n".join(mapping)


def main():
    """Main execution function"""
    report_path = Path(__file__).parent.parent / "Comprehensive_Architecture_Analysis_Report.txt"
    
    if not report_path.exists():
        print(f"Error: Report file not found at {report_path}")
        return
    
    organizer = ArchitectureReportOrganizer(str(report_path))
    
    print("📖 Loading and parsing report...")
    organizer.parse_all_pages()
    print(f"✅ Parsed {len(organizer.pages)} pages")
    
    print("🔀 Creating unified hub definitions...")
    organizer.create_unified_hubs()
    print(f"✅ Created {len(organizer.unified_hubs)} unified hub definitions")
    
    # Generate sorted report
    print("📝 Generating organized report...")
    sorted_report = organizer.generate_sorted_report()
    output_path = report_path.parent / "ARCHITECTURE_REPORT_ORGANIZED.md"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(sorted_report)
    print(f"✅ Generated organized report: {output_path}")
    
    # Export JSON
    print("💾 Exporting JSON data...")
    json_path = report_path.parent / "architecture_pages_data.json"
    organizer.export_json(str(json_path))
    print(f"✅ Exported JSON: {json_path}")
    
    # Generate route mapping
    print("🗺️ Generating route mapping...")
    route_mapping = organizer.generate_route_mapping()
    route_path = report_path.parent / "ROUTE_MAPPING.md"
    with open(route_path, 'w', encoding='utf-8') as f:
        f.write(route_mapping)
    print(f"✅ Generated route mapping: {route_path}")
    
    # Print summary
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    
    organized = organizer.organize_pages_by_category()
    for category in PageCategory:
        pages_in_category = organized.get(category, [])
        if pages_in_category:
            print(f"\n{category.value}: {len(pages_in_category)} pages")
            for status in PageStatus:
                count = len([p for p in pages_in_category if p.status == status])
                if count > 0:
                    print(f"  - {status.value}: {count}")
    
    print(f"\n✅ Processing complete!")
    print(f"📄 Organized report: {output_path}")
    print(f"💾 JSON data: {json_path}")
    print(f"🗺️ Route mapping: {route_path}")


if __name__ == "__main__":
    main()
