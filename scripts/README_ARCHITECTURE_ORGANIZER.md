# Architecture Report Organizer

This script analyzes the `Comprehensive_Architecture_Analysis_Report.txt` file and organizes all pages according to the merger recommendations.

## What It Does

1. **Parses** the architecture report and extracts information about all 18 pages
2. **Classifies** each page by category (Trading, Market, AI/ML, Admin, etc.)
3. **Organizes** pages according to merger recommendations
4. **Generates** three output files:
   - `ARCHITECTURE_REPORT_ORGANIZED.md` - Sorted and organized page inventory
   - `architecture_pages_data.json` - Machine-readable JSON data
   - `ROUTE_MAPPING.md` - Route redirects for backward compatibility

## Usage

```bash
cd /workspace
python3 scripts/organize_architecture_report.py
```

## Output Files

### ARCHITECTURE_REPORT_ORGANIZED.md
- Pages organized by category
- Status indicators (✅ Keep Standalone, 🔄 Merge into Hub, ⚠️ Redundant, 🆕 To be Created)
- Unified hub definitions with tab mappings
- Implementation roadmap by priority

### architecture_pages_data.json
- Complete page data in JSON format
- Includes all metadata: routes, APIs, features, status, etc.
- Useful for automated tooling and analysis

### ROUTE_MAPPING.md
- TypeScript/React Router route redirects
- Maps old routes to new unified hubs
- Includes tab parameters for deep linking

## Page Categories

- **Trading** (6 pages) - Trading interfaces to be unified
- **Market Analysis** (4 pages) - Market data and scanning
- **AI/ML** (2 pages) - Training and strategy lab
- **Risk Management** (2 pages) - Risk calculators and metrics
- **Admin** (2 pages) - System monitoring
- **Settings** (1 page) - User configuration
- **Dashboard** (1 page) - Portfolio overview

## Unified Hubs

The script identifies 3 unified hubs to create:

1. **UnifiedTradingHubView** (`/trading`) - HIGH Priority
   - Merges: TradingViewDashboard, EnhancedTradingView, FuturesTradingView, TradingHubView
   - Tabs: Charts, Spot, Futures, Positions, Portfolio

2. **UnifiedAILabView** (`/ai-lab`) - MEDIUM Priority
   - Merges: TrainingView, EnhancedStrategyLabView, ScannerView
   - Tabs: Scanner, Training, Backtest, Builder, Insights

3. **UnifiedAdminView** (`/admin`) - LOW Priority
   - Merges: HealthView, MonitoringView
   - Tabs: Health, Monitoring, Diagnostics

## Example Output

```
📊 SUMMARY
============================================================

Trading: 6 pages
  - Merge into Hub: 5
  - To be Created (new unified hub): 1

Market Analysis: 4 pages
  - Keep Standalone: 2
  - Redundant (already in hub): 2
...
```

## Customization

To modify the classification logic, edit the `_classify_page()` method in `organize_architecture_report.py`. This method determines:
- Page category
- Merge status
- Target hub
- Tab name
- Priority level

## Requirements

- Python 3.6+
- No external dependencies (uses only standard library)
