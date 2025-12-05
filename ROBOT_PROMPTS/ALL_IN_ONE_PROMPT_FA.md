# 🤖 پرامپت کامل و یکپارچه - بازسازی معماری (تمام 4 فاز)

**نسخه:** 1.0.0  
**تاریخ:** 5 دسامبر 2025  
**زبان:** فارسی  
**وضعیت:** ✅ آماده برای اجرا

---

# 📋 مقدمه

این پرامپت شامل **تمام 4 فاز** بازسازی معماری پلتفرم Dreammaker Crypto است.

**وضعیت فعلی:**
- 18 صفحه (پیچیده)
- ~2,000 خط کد تکراری
- 3-4 کلیک برای کارهای معمول

**هدف:**
- 8-9 صفحه (کاهش 50%)
- <500 خط کد تکراری (کاهش 75%)
- 0-1 کلیک (کاهش 75%)

**تمپلیت‌ها آماده در:** `component_templates/`

---

# 📊 خلاصه 4 فاز

| فاز | نام | صفحات | زمان | اولویت | شروع |
|-----|-----|-------|------|--------|------|
| 1 | Trading Hub | 4→1 | 2-3 هفته | 🔴 CRITICAL | ⏳ |
| 2 | AI Lab | 3→1 | 1-2 هفته | 🟡 HIGH | پس از فاز 1 |
| 3 | Admin Hub | 2→1 | 1 هفته | 🟢 MEDIUM | پس از فاز 2 |
| 4 | Dashboard | تنظیم | 3-5 روز | 🟢 MEDIUM | پس از فاز 3 |

**زمان کل:** 4-6 هفته

---

---

---

# 🔴 فاز 1: هاب یکپارچه معاملات

## 🎯 اطلاعات کلی

**اولویت:** بحرانی ⭐⭐⭐  
**زمان:** 2-3 هفته  
**تاثیر:** ادغام 6 صفحه → 1 صفحه (کاهش 83%)

---

## 📌 صفحاتی که باید ادغام شوند

1. `TradingViewDashboard` - src/views/TradingViewDashboard.tsx
2. `EnhancedTradingView` - src/views/EnhancedTradingView.tsx
3. `FuturesTradingView` - src/views/FuturesTradingView.tsx
4. `TradingHubView` - src/views/TradingHubView.tsx
5. `PositionsView` - src/views/PositionsView.tsx
6. `PortfolioPage` - src/views/PortfolioPage.tsx

---

## 🎯 صفحه جدید

**نام:** `UnifiedTradingHubView`  
**مسیر:** `/trading`  
**فایل:** `src/views/UnifiedTradingHubView.tsx`  
**تمپلیت:** `component_templates/unifiedtradinghub/`

---

## 📑 تب‌های جدید (5 تب)

### تب 1: Charts (نمودارها)
- **منبع:** TradingViewDashboard
- **محتوا:** ویجت‌های TradingView، Screener، تقویم، اخبار
- **ویژگی:** Lazy loading (سنگین است)

### تب 2: Spot (معاملات اسپات)
- **منبع:** EnhancedTradingView (حالت Spot)
- **محتوا:** سیستم امتیازدهی، تحلیل Confluence، Entry Plan

### تب 3: Futures (فیوچرز) ⭐ پیش‌فرض
- **منبع:** FuturesTradingView
- **محتوا:** پوزیشن‌ها، Order Book، موجودی، مارجین، Entry Plan

### تب 4: Positions (پوزیشن‌ها)
- **منبع:** PositionsView
- **محتوا:** پوزیشن‌های باز، سفارشات، تاریخچه

### تب 5: Portfolio (پورتفولیو)
- **منبع:** PortfolioPage
- **محتوا:** نمای کلی، دارایی‌ها، مرکز ریسک

---

## 🛠️ مراحل پیاده‌سازی

### مرحله 1.1: کپی تمپلیت‌ها

```bash
# ایجاد پوشه هدف
mkdir -p src/views/trading-hub

# کپی تمپلیت‌های آماده
cp -r component_templates/unifiedtradinghub/* src/views/trading-hub/

# بررسی فایل‌ها
ls -la src/views/trading-hub/
```

**فایل‌های کپی شده:**
- `UnifiedTradingHubView.tsx` - کامپوننت اصلی
- `tabs/ChartsTab.tsx`
- `tabs/SpotTab.tsx`
- `tabs/FuturesTab.tsx`
- `tabs/PositionsTab.tsx`
- `tabs/PortfolioTab.tsx`

---

### مرحله 1.2: پیاده‌سازی کامپوننت اصلی

**فایل:** `src/views/trading-hub/UnifiedTradingHubView.tsx`

#### کار 1.2.1: Import های لازم

```typescript
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

// Lazy load Charts tab (سنگین است)
const ChartsTab = lazy(() => import('./tabs/ChartsTab'));

// تب‌های دیگر
import { SpotTab } from './tabs/SpotTab';
import { FuturesTab } from './tabs/FuturesTab';
import { PositionsTab } from './tabs/PositionsTab';
import { PortfolioTab } from './tabs/PortfolioTab';
```

#### کار 1.2.2: تعریف Type ها

```typescript
type TabId = 'charts' | 'spot' | 'futures' | 'positions' | 'portfolio';

interface TabConfig {
  id: TabId;
  label: string;
  icon?: React.ComponentType<any>;
  component: React.ComponentType<any>;
  lazy?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'charts', label: 'نمودارها', component: ChartsTab, lazy: true },
  { id: 'spot', label: 'اسپات', component: SpotTab },
  { id: 'futures', label: 'فیوچرز', component: FuturesTab },
  { id: 'positions', label: 'پوزیشن‌ها', component: PositionsTab },
  { id: 'portfolio', label: 'پورتفولیو', component: PortfolioTab },
];
```

#### کار 1.2.3: State Management

```typescript
export default function UnifiedTradingHubView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // تب فعال (پیش‌فرض: futures)
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get('tab') as TabId) || 'futures'
  );
  
  // State مشترک بین تب‌ها
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  
  // WebSocket مشترک برای همه تب‌ها
  const ws = useWebSocket({
    events: ['price_update', 'scoring_snapshot', 'positions_update'],
    enabled: true
  });
  
  // ...
}
```

#### کار 1.2.4: Tab Change Handler

```typescript
const handleTabChange = (tab: string) => {
  const newTab = tab as TabId;
  setActiveTab(newTab);
  setSearchParams({ tab: newTab });
};

// همگام‌سازی با URL
useEffect(() => {
  const tab = searchParams.get('tab') as TabId;
  if (tab && TABS.find(t => t.id === tab)) {
    setActiveTab(tab);
  }
}, [searchParams]);
```

#### کار 1.2.5: Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      if (TABS[index]) {
        handleTabChange(TABS[index].id);
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

#### کار 1.2.6: Render

```typescript
return (
  <div className="container mx-auto p-4 space-y-4">
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold">هاب معاملات</h1>
    </div>
    
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="grid w-full grid-cols-5">
        {TABS.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {TABS.map(tab => (
        <TabsContent key={tab.id} value={tab.id}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }>
            <tab.component 
              selectedSymbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
              wsData={ws}
            />
          </Suspense>
        </TabsContent>
      ))}
    </Tabs>
  </div>
);
```

---

### مرحله 1.3: پیاده‌سازی تب Charts

**فایل:** `src/views/trading-hub/tabs/ChartsTab.tsx`  
**منبع:** `src/views/TradingViewDashboard.tsx`

#### کارهای لازم:

```typescript
// 1. کپی imports
import TradingViewWidget from '@/components/TradingViewWidget';
// ...

// 2. کپی state management
const [chartSymbol, setChartSymbol] = useState(selectedSymbol);

// 3. کپی TradingView widget integration
<TradingViewWidget
  symbol={chartSymbol}
  interval="1D"
  theme="dark"
  // ...
/>

// 4. کپی Screener component
<MarketScreener />

// 5. کپی Forex Calendar
<ForexCalendar />

// 6. کپی News Feed
<NewsFeed />

// 7. کپی Strategy Panel
<StrategyPanel />

// 8. کپی Drawing Tools
<DrawingTools />

// 9. اتصال به selectedSymbol از props
useEffect(() => {
  setChartSymbol(selectedSymbol);
}, [selectedSymbol]);

// 10. تست: ویجت TradingView لود می‌شود و کار می‌کند
```

---

### مرحله 1.4: پیاده‌سازی تب Spot

**فایل:** `src/views/trading-hub/tabs/SpotTab.tsx`  
**منبع:** `src/views/EnhancedTradingView.tsx` (حالت Spot)

#### کارهای لازم:

```typescript
// 1. کپی scoring system
const { data: scoringData } = useQuery(
  ['scoring', selectedSymbol],
  () => fetchScoringSnapshot(selectedSymbol)
);

// 2. کپی multi-timeframe analysis
<MultiTimeframeAnalysis 
  timeframes={['15m', '1h', '4h']}
  symbol={selectedSymbol}
/>

// 3. کپی confluence display
<ConfluenceAnalysis data={scoringData?.confluence} />

// 4. کپی entry plan visualization
<EntryPlanCard 
  entryPrice={scoringData?.entryPrice}
  stopLoss={scoringData?.stopLoss}
  takeProfit={scoringData?.takeProfit}
  leverage={leverage}
/>

// 5. کپی strategy toggle
<Switch 
  checked={strategyEnabled}
  onCheckedChange={setStrategyEnabled}
/>

// 6. کپی order form
<SpotOrderForm
  symbol={selectedSymbol}
  onSubmit={handleSpotOrder}
/>

// 7. اتصال به WebSocket scoring_snapshot
useEffect(() => {
  if (wsData?.scoringSnapshot) {
    // به‌روزرسانی داده‌ها
  }
}, [wsData]);

// 8. تست: فرم سفارش کار می‌کند
```

---

### مرحله 1.5: پیاده‌سازی تب Futures

**فایل:** `src/views/trading-hub/tabs/FuturesTab.tsx`  
**منبع:** `src/views/FuturesTradingView.tsx`

#### کارهای لازم:

```typescript
// 1. کپی positions display
const { data: positions } = useQuery(
  ['positions'],
  () => fetchPositions()
);

<PositionsTable 
  positions={positions}
  onClose={handleClosePosition}
/>

// 2. کپی order book
const { data: orderbook } = useQuery(
  ['orderbook', selectedSymbol],
  () => fetchOrderBook(selectedSymbol)
);

<OrderBookDisplay data={orderbook} />

// 3. کپی balance display
<BalanceCard 
  totalBalance={balance?.total}
  availableMargin={balance?.available}
  usedMargin={balance?.used}
/>

// 4. کپی entry plan calculator
<EntryPlanCalculator
  symbol={selectedSymbol}
  accountBalance={balance?.total}
  riskPercent={riskPercent}
  onCalculate={setEntryPlan}
/>

// 5. کپی manual order form
<FuturesOrderForm
  symbol={selectedSymbol}
  leverage={leverage}
  onSubmit={handleFuturesOrder}
/>

// 6. کپی position management
<PositionActions
  position={selectedPosition}
  onClose={handleClose}
  onModify={handleModify}
/>

// 7. کپی leverage adjustment
<LeverageSlider
  value={leverage}
  onChange={setLeverage}
  max={125}
/>

// 8. کپی SL/TP configuration
<StopLossTakeProfitForm
  position={selectedPosition}
  onUpdate={handleUpdateSlTp}
/>

// 9. اتصال به WebSocket positions_update
useEffect(() => {
  if (wsData?.positionsUpdate) {
    // به‌روزرسانی پوزیشن‌ها
  }
}, [wsData]);

// 10. تست: معاملات فیوچرز کار می‌کند
```

---

### مرحله 1.6: پیاده‌سازی تب Positions

**فایل:** `src/views/trading-hub/tabs/PositionsTab.tsx`  
**منبع:** `src/views/PositionsView.tsx`

#### کارهای لازم:

```typescript
// 1. کپی positions table
<PositionsTable
  data={positions}
  columns={positionColumns}
  onRowClick={setSelectedPosition}
/>

// 2. کپی pending orders display
<OrdersTable
  data={orders}
  onCancel={handleCancelOrder}
/>

// 3. کپی trade history
<TradeHistoryTable
  data={tradeHistory}
  dateRange={dateRange}
/>

// 4. کپی position closing interface
<ClosePositionDialog
  position={selectedPosition}
  onConfirm={handleConfirmClose}
/>

// 5. کپی real-time updates
useEffect(() => {
  if (wsData?.positionsUpdate) {
    refetch(); // به‌روزرسانی جدول
  }
}, [wsData]);

// 6. کپی tab system داخلی
<Tabs defaultValue="positions">
  <TabsList>
    <TabsTrigger value="positions">پوزیشن‌ها</TabsTrigger>
    <TabsTrigger value="orders">سفارشات</TabsTrigger>
    <TabsTrigger value="history">تاریخچه</TabsTrigger>
  </TabsList>
  {/* محتوا */}
</Tabs>

// 7. تست: مشاهده و مدیریت پوزیشن‌ها
```

---

### مرحله 1.7: پیاده‌سازی تب Portfolio

**فایل:** `src/views/trading-hub/tabs/PortfolioTab.tsx`  
**منبع:** `src/views/PortfolioPage.tsx`

#### کارهای لازم:

```typescript
// 1. کپی portfolio value & PnL
<PortfolioSummaryCard
  totalValue={portfolio?.totalValue}
  pnl={portfolio?.pnl}
  pnlPercent={portfolio?.pnlPercent}
/>

// 2. کپی holdings display
<HoldingsTable
  holdings={portfolio?.holdings}
  onSelect={setSelectedHolding}
/>

// 3. کپی risk center integration
<RiskCenterCard
  portfolioRisk={riskMetrics}
  recommendations={riskRecommendations}
/>

// 4. کپی market data for holdings
const { data: marketData } = useQuery(
  ['market-data', holdingSymbols],
  () => fetchMarketDataForHoldings(holdingSymbols)
);

// 5. کپی position closing
<ClosePositionButton
  holding={selectedHolding}
  onClose={handleCloseHolding}
/>

// 6. کپی allocation chart
<AllocationChart data={portfolio?.allocation} />

// 7. تست: نمایش پورتفولیو
```

---

### مرحله 1.8: افزودن Route Redirects

**فایل:** `src/App.tsx` یا `src/routes.tsx`

```typescript
import { Navigate, Route, Routes } from 'react-router-dom';
import UnifiedTradingHubView from '@/views/trading-hub/UnifiedTradingHubView';

// در بخش Routes:
<Routes>
  {/* Backward compatibility redirects */}
  <Route 
    path="/tradingview-dashboard" 
    element={<Navigate to="/trading?tab=charts" replace />} 
  />
  <Route 
    path="/enhanced-trading" 
    element={<Navigate to="/trading?tab=spot" replace />} 
  />
  <Route 
    path="/futures" 
    element={<Navigate to="/trading?tab=futures" replace />} 
  />
  <Route 
    path="/trading-hub" 
    element={<Navigate to="/trading" replace />} 
  />
  <Route 
    path="/positions" 
    element={<Navigate to="/trading?tab=positions" replace />} 
  />
  <Route 
    path="/portfolio" 
    element={<Navigate to="/trading?tab=portfolio" replace />} 
  />
  
  {/* New unified route */}
  <Route 
    path="/trading" 
    element={<UnifiedTradingHubView />} 
  />
  
  {/* سایر routes */}
</Routes>
```

---

### مرحله 1.9: به‌روزرسانی منوی ناوبری

**فایل:** کامپوننت Sidebar/Navigation (مثلاً `src/components/Sidebar.tsx`)

```typescript
// قبل - چند آیتم جداگانه:
const oldNavItems = [
  { label: 'TradingView', href: '/tradingview-dashboard', icon: BarChartIcon },
  { label: 'Enhanced Trading', href: '/enhanced-trading', icon: TrendingUpIcon },
  { label: 'Futures', href: '/futures', icon: LineChartIcon },
  { label: 'Positions', href: '/positions', icon: ListIcon },
  { label: 'Portfolio', href: '/portfolio', icon: WalletIcon },
];

// بعد - یک آیتم با زیرمنو:
const newNavItems = [
  {
    label: 'هاب معاملات',
    icon: TrendingUpIcon,
    href: '/trading',
    badge: 'جدید',
    subItems: [
      { 
        label: 'نمودارها', 
        href: '/trading?tab=charts', 
        icon: BarChartIcon,
        shortcut: '⌘1'
      },
      { 
        label: 'اسپات', 
        href: '/trading?tab=spot', 
        icon: CircleDollarSignIcon,
        shortcut: '⌘2'
      },
      { 
        label: 'فیوچرز', 
        href: '/trading?tab=futures', 
        icon: TrendingUpIcon,
        shortcut: '⌘3'
      },
      { 
        label: 'پوزیشن‌ها', 
        href: '/trading?tab=positions', 
        icon: ListIcon,
        shortcut: '⌘4'
      },
      { 
        label: 'پورتفولیو', 
        href: '/trading?tab=portfolio', 
        icon: WalletIcon,
        shortcut: '⌘5'
      },
    ]
  },
  // سایر آیتم‌ها...
];
```

---

### مرحله 1.10: بهینه‌سازی Performance

#### کار 1.10.1: Lazy Loading

```typescript
// فقط تب Charts به صورت lazy load
const ChartsTab = lazy(() => import('./tabs/ChartsTab'));

// چون ویجت‌های TradingView سنگین هستند
```

#### کار 1.10.2: WebSocket Optimization

```typescript
// یک اتصال WebSocket برای همه تب‌ها
const ws = useWebSocket({
  events: ['price_update', 'scoring_snapshot', 'positions_update'],
  enabled: true
});

// داده‌ها را به تب‌ها pass کنید
<FuturesTab wsData={ws} />
```

#### کار 1.10.3: Memoization

```typescript
import { useMemo } from 'react';

const processedData = useMemo(() => {
  return heavyComputation(rawData);
}, [rawData]);
```

#### کار 1.10.4: Code Splitting

```typescript
// در تنظیمات Vite/Webpack
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'trading-hub': [
          'src/views/trading-hub/UnifiedTradingHubView',
          'src/views/trading-hub/tabs/*'
        ]
      }
    }
  }
}
```

---

### مرحله 1.11: تست کامل

#### تست 1.11.1: تست تک‌تک تب‌ها

```bash
# شروع dev server
npm run dev

# تست‌ها:
✓ باز کردن /trading
✓ کلیک روی تب Charts - ویجت TradingView لود شود
✓ کلیک روی تب Spot - فرم سفارش نمایش داده شود
✓ کلیک روی تب Futures - پوزیشن‌ها نمایش داده شوند
✓ کلیک روی تب Positions - جدول پوزیشن‌ها لود شود
✓ کلیک روی تب Portfolio - خلاصه پورتفولیو نمایش داده شود
```

#### تست 1.11.2: تست WebSocket

```typescript
✓ اتصال WebSocket برقرار شود
✓ رویداد price_update دریافت شود
✓ رویداد scoring_snapshot دریافت شود
✓ رویداد positions_update دریافت شود
✓ داده‌ها به تب‌های مناسب برسند
✓ قطع و وصل شدن اتصال handle شود
```

#### تست 1.11.3: تست Deep Linking

```bash
✓ /trading → تب Futures (پیش‌فرض)
✓ /trading?tab=charts → تب Charts
✓ /trading?tab=spot → تب Spot
✓ /trading?tab=futures → تب Futures
✓ /trading?tab=positions → تب Positions
✓ /trading?tab=portfolio → تب Portfolio
✓ /trading?tab=futures&symbol=ETHUSDT → تب Futures با ETHUSDT
```

#### تست 1.11.4: تست Backward Compatibility

```bash
✓ /tradingview-dashboard → redirect به /trading?tab=charts
✓ /enhanced-trading → redirect به /trading?tab=spot
✓ /futures → redirect به /trading?tab=futures
✓ /trading-hub → redirect به /trading
✓ /positions → redirect به /trading?tab=positions
✓ /portfolio → redirect به /trading?tab=portfolio
```

#### تست 1.11.5: تست Performance

```bash
✓ زمان لود صفحه < 2 ثانیه
✓ زمان سوییچ تب < 300 میلی‌ثانیه
✓ مصرف مموری < 200MB
✓ بدون memory leak در سوییچ تب
✓ تب Charts به صورت lazy load می‌شود
```

#### تست 1.11.6: تست کیبورد شورتکات‌ها

```bash
✓ Cmd/Ctrl + 1 → تب Charts
✓ Cmd/Ctrl + 2 → تب Spot
✓ Cmd/Ctrl + 3 → تب Futures
✓ Cmd/Ctrl + 4 → تب Positions
✓ Cmd/Ctrl + 5 → تب Portfolio
```

---

## ✅ معیارهای موفقیت فاز 1

پس از اتمام فاز 1، این موارد باید تایید شوند:

- ✅ **تب‌ها:** هر 5 تب کامل کار می‌کنند
- ✅ **WebSocket:** یک اتصال مشترک، بدون تکرار
- ✅ **Performance:** زمان لود < 2 ثانیه
- ✅ **Redirects:** تمام 6 redirect کار می‌کنند
- ✅ **Navigation:** منوی ناوبری به‌روز شده
- ✅ **Deep Linking:** URL parameters کار می‌کنند
- ✅ **Keyboard:** شورتکات‌ها کار می‌کنند
- ✅ **تست:** تمام تست‌ها قبول شده‌اند
- ✅ **بدون Bug:** هیچ خطای console نیست
- ✅ **UX:** تجربه کاربری روان است

---

---

---

# 🟡 فاز 2: آزمایشگاه یکپارچه هوش مصنوعی

## 🎯 اطلاعات کلی

**اولویت:** بالا ⭐⭐  
**زمان:** 1-2 هفته  
**تاثیر:** ادغام 3 صفحه → 1 صفحه (کاهش 67%)

---

## 📌 صفحاتی که باید ادغام شوند

1. `TrainingView` - src/views/TrainingView.tsx
2. `EnhancedStrategyLabView` - src/views/EnhancedStrategyLabView.tsx
3. `ScannerView` - src/views/ScannerView.tsx

---

## 🎯 صفحه جدید

**نام:** `UnifiedAILabView`  
**مسیر:** `/ai-lab`  
**فایل:** `src/views/UnifiedAILabView.tsx`  
**تمپلیت:** `component_templates/unifiedailab/`

---

## 📑 تب‌های جدید (5 تب)

### تب 1: Scanner (اسکنر) ⭐ پیش‌فرض
- **منبع:** ScannerView
- **محتوا:** اسکن AI، الگوها، Smart Money، احساسات، نهنگ‌ها

### تب 2: Training (آموزش)
- **منبع:** TrainingView
- **محتوا:** پیکربندی، اجرا، متریک‌ها، تاریخچه

### تب 3: Backtest (بک‌تست)
- **منبع:** EnhancedStrategyLabView (تب Backtest)
- **محتوا:** تست تاریخی، نمودارها، متریک‌ها

### تب 4: Builder (سازنده)
- **منبع:** EnhancedStrategyLabView (تب Builder)
- **محتوا:** ویرایشگر، تمپلیت‌ها

### تب 5: Insights (بینش‌ها)
- **منبع:** EnhancedStrategyLabView (تب Insights)
- **محتوا:** نتایج Pipeline، تحلیل

---

## 🛠️ مراحل پیاده‌سازی

### مرحله 2.1: کپی تمپلیت‌ها

```bash
mkdir -p src/views/ai-lab
cp -r component_templates/unifiedailab/* src/views/ai-lab/
ls -la src/views/ai-lab/
```

---

### مرحله 2.2: پیاده‌سازی کامپوننت اصلی

**فایل:** `src/views/ai-lab/UnifiedAILabView.tsx`

```typescript
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';

type TabId = 'scanner' | 'training' | 'backtest' | 'builder' | 'insights';

export default function UnifiedAILabView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get('tab') as TabId) || 'scanner'
  );
  
  // مشابه فاز 1، با 5 تب
  // ...
}
```

---

### مرحله 2.3: پیاده‌سازی تب Scanner

**فایل:** `src/views/ai-lab/tabs/ScannerTab.tsx`  
**منبع:** `src/views/ScannerView.tsx`

```typescript
// 1. کپی multi-tab scanner interface
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">نمای کلی</TabsTrigger>
    <TabsTrigger value="ai-signals">سیگنال‌های AI</TabsTrigger>
    <TabsTrigger value="patterns">الگوها</TabsTrigger>
    <TabsTrigger value="smart-money">Smart Money</TabsTrigger>
    <TabsTrigger value="sentiment">احساسات</TabsTrigger>
    <TabsTrigger value="whales">نهنگ‌ها</TabsTrigger>
  </TabsList>
  {/* محتوا */}
</Tabs>

// 2. کپی scanner engines
<AISignalsScanner />
<TechnicalPatternsScanner />
<SmartMoneyScanner />
<NewsSentimentScanner />
<WhaleActivityScanner />

// 3. کپی watchlist management
<WatchlistManager />

// 4. کپی scanner feed
<ScannerFeed />

// 5. اتصال به WebSocket signal_update
const ws = useWebSocket({
  events: ['signal_update'],
  cadence: 3000 // 3 ثانیه
});

// 6. تست: اسکن real-time
```

---

### مرحله 2.4: پیاده‌سازی تب Training

**فایل:** `src/views/ai-lab/tabs/TrainingTab.tsx`  
**منبع:** `src/views/TrainingView.tsx`

```typescript
// 1. کپی training configuration form
<Form>
  <FormField name="epochs" />
  <FormField name="batchSize" />
  <FormField name="learningRate" />
  <FormField name="optimizer" />
  <FormField name="datasetSize" />
</Form>

// 2. کپی training execution
const { mutate: startTraining, isLoading } = useMutation(
  (config) => fetch('/api/ai/train', {
    method: 'POST',
    body: JSON.stringify(config)
  })
);

// 3. کپی progress tracking
<Progress value={trainingProgress} />

// 4. کپی real-time metrics display
<MetricsDisplay
  loss={metrics.loss}
  accuracy={metrics.accuracy}
  valLoss={metrics.valLoss}
  valAccuracy={metrics.valAccuracy}
/>

// 5. کپی model information
<ModelInfoCard model={currentModel} />

// 6. کپی training history
<TrainingHistoryTable history={trainingHistory} />

// 7. تست: آموزش مدل
```

---

### مرحله 2.5: پیاده‌سازی تب Backtest

**فایل:** `src/views/ai-lab/tabs/BacktestTab.tsx`  
**منبع:** `src/views/EnhancedStrategyLabView.tsx` (تب Backtest)

```typescript
// 1. کپی backtest panel
<BacktestPanel
  strategy={selectedStrategy}
  dateRange={dateRange}
  onRun={handleRunBacktest}
/>

// 2. کپی performance charts
<PerformanceChart data={backtestResults} />

// 3. کپی strategy metrics
<MetricsGrid
  totalReturn={results.totalReturn}
  sharpeRatio={results.sharpeRatio}
  maxDrawdown={results.maxDrawdown}
  winRate={results.winRate}
/>

// 4. کپی historical testing
const { data: backtestResults } = useQuery(
  ['backtest', strategyId],
  () => fetchBacktestResults(strategyId)
);

// 5. تست: backtesting
```

---

### مرحله 2.6: پیاده‌سازی تب Builder

**فایل:** `src/views/ai-lab/tabs/BuilderTab.tsx`  
**منبع:** `src/views/EnhancedStrategyLabView.tsx` (تب Builder)

```typescript
// 1. کپی strategy configuration editor
<StrategyEditor
  strategy={strategy}
  onChange={handleStrategyChange}
/>

// 2. کپی strategy templates
<TemplateSelector
  templates={strategyTemplates}
  onSelect={handleSelectTemplate}
/>

// 3. کپی parameter management
<ParametersForm
  parameters={strategy.parameters}
  onChange={handleParameterChange}
/>

// 4. اتصال به Strategy Pipeline APIs
const { mutate: saveStrategy } = useMutation(
  (strategy) => saveStrategyConfig(strategy)
);

// 5. تست: ساخت استراتژی
```

---

### مرحله 2.7: پیاده‌سازی تب Insights

**فایل:** `src/views/ai-lab/tabs/InsightsTab.tsx`  
**منبع:** `src/views/EnhancedStrategyLabView.tsx` (تب Insights)

```typescript
// 1. کپی pipeline insights
<PipelineInsights data={pipelineResults} />

// 2. کپی HTS Strategy Pipeline results
<HTSStrategyResults
  strategies={htsStrategies}
  performance={htsPerformance}
/>

// 3. کپی performance analysis
<PerformanceAnalysis
  data={analysisData}
  comparisons={strategyComparisons}
/>

// 4. اتصال به Pipeline Insights APIs
const { data: insights } = useQuery(
  ['pipeline-insights'],
  fetchPipelineInsights
);

// 5. تست: نمایش بینش‌ها
```

---

### مرحله 2.8: افزودن Route Redirects

**فایل:** `src/App.tsx`

```typescript
<Routes>
  {/* AI/ML redirects */}
  <Route 
    path="/training" 
    element={<Navigate to="/ai-lab?tab=training" replace />} 
  />
  <Route 
    path="/strategylab" 
    element={<Navigate to="/ai-lab?tab=backtest" replace />} 
  />
  <Route 
    path="/scanner" 
    element={<Navigate to="/ai-lab?tab=scanner" replace />} 
  />
  
  {/* New unified route */}
  <Route 
    path="/ai-lab" 
    element={<UnifiedAILabView />} 
  />
</Routes>
```

**نکته:** Scanner ممکن است در `/market-analysis` هم باشد. از کامپوننت مشترک استفاده کنید.

---

### مرحله 2.9: به‌روزرسانی منوی ناوبری

```typescript
{
  label: 'آزمایشگاه AI',
  icon: BrainIcon,
  href: '/ai-lab',
  badge: 'جدید',
  subItems: [
    { label: 'اسکنر', href: '/ai-lab?tab=scanner', icon: SearchIcon },
    { label: 'آموزش', href: '/ai-lab?tab=training', icon: GraduationCapIcon },
    { label: 'بک‌تست', href: '/ai-lab?tab=backtest', icon: TestTubeIcon },
    { label: 'سازنده', href: '/ai-lab?tab=builder', icon: WrenchIcon },
    { label: 'بینش‌ها', href: '/ai-lab?tab=insights', icon: LightbulbIcon },
  ]
}
```

---

### مرحله 2.10: تست Workflow کامل

```bash
# تست workflow یکپارچه AI/ML:
✓ 1. تب Scanner: پیدا کردن سیگنال‌های امیدوارکننده
✓ 2. تب Builder: ساخت استراتژی بر اساس سیگنال‌ها
✓ 3. تب Training: آموزش مدل با داده‌های جدید
✓ 4. تب Backtest: تست استراتژی روی داده‌های تاریخی
✓ 5. تب Insights: مشاهده نتایج و بهینه‌سازی
✓ بازگشت به Scanner برای اعمال استراتژی
```

---

## ✅ معیارهای موفقیت فاز 2

- ✅ **تب‌ها:** هر 5 تب کار می‌کنند
- ✅ **Workflow:** Scanner → Training → Backtest یکپارچه است
- ✅ **Scanner:** یکپارچگی کار می‌کند
- ✅ **Redirects:** 3 redirect کار می‌کنند
- ✅ **Navigation:** منو به‌روز شده
- ✅ **تست:** Workflow کامل تست شده

---

---

---

# 🟢 فاز 3: هاب یکپارچه مدیریت

## 🎯 اطلاعات کلی

**اولویت:** متوسط ⭐  
**زمان:** 1 هفته  
**تاثیر:** ادغام 2 صفحه → 1 صفحه (کاهش 50%)

---

## 📌 صفحاتی که باید ادغام شوند

1. `HealthView` - src/views/HealthView.tsx
2. `MonitoringView` - src/views/MonitoringView.tsx

---

## 🎯 صفحه جدید

**نام:** `UnifiedAdminView`  
**مسیر:** `/admin`  
**فایل:** `src/views/UnifiedAdminView.tsx`  
**تمپلیت:** `component_templates/unifiedadmin/`

---

## 📑 تب‌های جدید (3 تب)

### تب 1: Health (سلامت) ⭐ پیش‌فرض
- **منبع:** HealthView (تب System Health)
- **محتوا:** CPU، Memory، Disk، اتصالات، عملکرد

### تب 2: Monitoring (نظارت)
- **منبع:** MonitoringView
- **محتوا:** خطاها، عملکرد، Cache، Deduplication

### تب 3: Diagnostics (تشخیص)
- **منبع:** HealthView (تب Provider Diagnostics)
- **محتوا:** Provider health، منابع داده

---

## 🛠️ مراحل پیاده‌سازی

### مرحله 3.1: کپی تمپلیت‌ها

```bash
mkdir -p src/views/admin
cp -r component_templates/unifiedadmin/* src/views/admin/
ls -la src/views/admin/
```

---

### مرحله 3.2: پیاده‌سازی کامپوننت اصلی

**فایل:** `src/views/admin/UnifiedAdminView.tsx`

```typescript
type TabId = 'health' | 'monitoring' | 'diagnostics';

export default function UnifiedAdminView() {
  const [activeTab, setActiveTab] = useState<TabId>('health');
  // مشابه فازهای قبل
}
```

---

### مرحله 3.3: پیاده‌سازی تب Health

**فایل:** `src/views/admin/tabs/HealthTab.tsx`  
**منبع:** `src/views/HealthView.tsx` (تب System Health)

```typescript
// 1. کپی system health metrics
<SystemMetricsGrid>
  <MetricCard title="CPU" value={`${health.cpu}%`} />
  <MetricCard title="Memory" value={`${health.memory}%`} />
  <MetricCard title="Disk" value={`${health.disk}%`} />
</SystemMetricsGrid>

// 2. کپی connection status
<ConnectionStatus
  binance={health.binance}
  database={health.database}
/>

// 3. کپی performance metrics
<PerformanceMetrics
  uptime={health.uptime}
  requests={health.requests}
  errors={health.errors}
/>

// 4. کپی real-time updates
const { data: health, refetch } = useQuery(
  ['health'],
  fetchHealthStatus,
  { refetchInterval: 5000 } // هر 5 ثانیه
);

// 5. تست: نمایش سلامت سیستم
```

---

### مرحله 3.4: پیاده‌سازی تب Monitoring

**فایل:** `src/views/admin/tabs/MonitoringTab.tsx`  
**منبع:** `src/views/MonitoringView.tsx`

```typescript
// 1. کپی error tracking
<ErrorTrackingCard
  errors={errorStats.recent}
  totalCount={errorStats.total}
/>

// 2. کپی performance metrics visualization
<PerformanceChart data={performanceData} />

// 3. کپی cache hit rate statistics
<CacheStatsCard
  hitRate={cacheStats.hitRate}
  totalRequests={cacheStats.total}
/>

// 4. کپی request deduplication stats
<DeduplicationStatsCard
  deduplicatedCount={dedupStats.count}
  savedRequests={dedupStats.saved}
/>

// 5. کپی error export functionality
<Button onClick={handleExportErrors}>
  Export Errors
</Button>

// 6. کپی performance export
<Button onClick={handleExportPerformance}>
  Export Performance
</Button>

// 7. کپی auto-refresh toggle
<Switch 
  checked={autoRefresh}
  onCheckedChange={setAutoRefresh}
/>

// 8. تست: نظارت و export
```

---

### مرحله 3.5: پیاده‌سازی تب Diagnostics

**فایل:** `src/views/admin/tabs/DiagnosticsTab.tsx`  
**منبع:** `src/views/HealthView.tsx` (تب Provider Diagnostics)

```typescript
// 1. کپی provider diagnostics
<ProviderDiagnostics
  providers={dataProviders}
  status={providerStatus}
/>

// 2. کپی data source health
<DataSourceHealth
  sources={dataSources}
  latency={sourceLatency}
/>

// 3. کپی debug information
<DebugInfoCard
  version={systemInfo.version}
  environment={systemInfo.environment}
  config={systemInfo.config}
/>

// 4. تست: تشخیص و دیباگ
```

---

### مرحله 3.6: افزودن Route Redirects

```typescript
<Routes>
  {/* Admin redirects */}
  <Route 
    path="/health" 
    element={<Navigate to="/admin?tab=health" replace />} 
  />
  <Route 
    path="/monitoring" 
    element={<Navigate to="/admin?tab=monitoring" replace />} 
  />
  
  {/* New unified route */}
  <Route 
    path="/admin" 
    element={<UnifiedAdminView />} 
  />
</Routes>
```

---

### مرحله 3.7: به‌روزرسانی منوی ناوبری

```typescript
{
  label: 'مدیریت',
  icon: SettingsIcon,
  href: '/admin',
  adminOnly: true, // فقط برای ادمین‌ها نمایش داده شود
  subItems: [
    { label: 'سلامت', href: '/admin?tab=health', icon: HeartIcon },
    { label: 'نظارت', href: '/admin?tab=monitoring', icon: ActivityIcon },
    { label: 'تشخیص', href: '/admin?tab=diagnostics', icon: WrenchIcon },
  ]
}
```

---

### مرحله 3.8: تست

```bash
✓ تب Health: نمایش متریک‌های سیستم
✓ تب Monitoring: ردیابی خطاها و عملکرد
✓ تب Diagnostics: تشخیص و دیباگ
✓ Real-time updates کار می‌کنند
✓ Export ها کار می‌کنند
✓ Auto-refresh کار می‌کند
```

---

## ✅ معیارهای موفقیت فاز 3

- ✅ **تب‌ها:** هر 3 تب کار می‌کنند
- ✅ **Functionality:** تمام ابزارهای ادمین کار می‌کنند
- ✅ **No Loss:** هیچ قابلیتی از دست نرفته
- ✅ **Redirects:** 2 redirect کار می‌کنند
- ✅ **Access Control:** فقط ادمین‌ها دسترسی دارند

---

---

---

# 🟢 فاز 4: پاکسازی Dashboard

## 🎯 اطلاعات کلی

**اولویت:** متوسط ⭐  
**زمان:** 3-5 روز  
**تاثیر:** حذف تکرار، تمرکز روی Portfolio

---

## 🎯 هدف

Dashboard باید **فقط** روی پورتفولیو تمرکز کند و داده‌های بازار را نشان ندهد.

**چرا؟** داده‌های بازار در Market Analysis Hub هستند، تکرار غیرضروری است.

---

## 🛠️ مراحل پیاده‌سازی

### مرحله 4.1: حذف نمایش داده‌های بازار

**فایل:** `src/views/EnhancedDashboardView.tsx`

#### کار 4.1.1: حذف Modern Symbol Ribbon

```typescript
// قبل:
<ModernSymbolRibbon
  symbols={['BTC', 'ETH', 'SOL']}
  onSymbolClick={handleSymbolClick}
/>

// بعد:
// این کامپوننت را کامل حذف کنید
```

#### کار 4.1.2: حذف نمودارهای قیمت

```typescript
// قبل:
<PriceChart
  symbol={selectedSymbol}
  data={chartData}
/>

// بعد:
// این کامپوننت را کامل حذف کنید
```

#### کار 4.1.3: حذف نمایش قیمت نمادها

```typescript
// قبل:
<SymbolPriceCards>
  <PriceCard symbol="BTC" price={btcPrice} />
  <PriceCard symbol="ETH" price={ethPrice} />
  <PriceCard symbol="SOL" price={solPrice} />
</SymbolPriceCards>

// بعد:
// این کامپوننت را کامل حذف کنید
```

#### کار 4.1.4: نگه داشتن Portfolio Components

```typescript
// نگه داشتن:
✓ <PortfolioSummaryCard /> - خلاصه پورتفولیو
✓ <PortfolioPnLCard /> - سود/زیان
✓ <ActivePositionsCard /> - پوزیشن‌های فعال
✓ <TopSignalsPanel /> - سیگنال‌های برتر
✓ <HealthStatusIndicator /> - وضعیت سلامت سیستم
```

---

### مرحله 4.2: افزودن لینک به Market Analysis Hub

**فایل:** `src/views/EnhancedDashboardView.tsx`

```typescript
<Card>
  <CardHeader>
    <CardTitle>داده‌های بازار</CardTitle>
    <CardDescription>
      برای مشاهده اطلاعات دقیق بازار
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground mb-4">
      نمودارها، قیمت‌ها و تحلیل‌های بازار را در Market Analysis Hub مشاهده کنید.
    </p>
    <Button asChild variant="default" size="lg">
      <Link to="/market-analysis">
        <BarChart className="mr-2 h-5 w-5" />
        رفتن به تحلیل بازار
      </Link>
    </Button>
  </CardContent>
</Card>
```

---

### مرحله 4.3: تمرکز روی Portfolio

**Dashboard باید شامل این کامپوننت‌ها باشد:**

```typescript
<div className="dashboard-grid">
  {/* 1. خلاصه پورتفولیو */}
  <PortfolioSummaryCard
    totalValue={portfolio?.totalValue}
    pnl={portfolio?.pnl}
    pnlPercent={portfolio?.pnlPercent}
    change24h={portfolio?.change24h}
  />
  
  {/* 2. پوزیشن‌های فعال */}
  <ActivePositionsCard
    count={positions?.length}
    totalPnL={positions?.totalPnL}
  >
    <Button asChild variant="link">
      <Link to="/trading?tab=positions">
        مشاهده همه →
      </Link>
    </Button>
  </ActivePositionsCard>
  
  {/* 3. سیگنال‌های برتر */}
  <TopSignalsPanel
    signals={topSignals}
    limit={5}
  >
    <Button asChild variant="link">
      <Link to="/ai-lab?tab=scanner">
        مشاهده بیشتر →
      </Link>
    </Button>
  </TopSignalsPanel>
  
  {/* 4. اقدامات سریع */}
  <QuickActionsCard>
    <Button asChild>
      <Link to="/trading?tab=futures">
        <TrendingUp className="mr-2" />
        معاملات فیوچرز
      </Link>
    </Button>
    <Button asChild variant="outline">
      <Link to="/market-analysis">
        <BarChart className="mr-2" />
        تحلیل بازار
      </Link>
    </Button>
    <Button asChild variant="outline">
      <Link to="/ai-lab">
        <Brain className="mr-2" />
        آزمایشگاه AI
      </Link>
    </Button>
  </QuickActionsCard>
  
  {/* 5. وضعیت سلامت */}
  <HealthStatusCard
    status={health?.status}
    uptime={health?.uptime}
  >
    <Button asChild variant="link" size="sm">
      <Link to="/admin?tab=health">
        جزئیات →
      </Link>
    </Button>
  </HealthStatusCard>
  
  {/* 6. لینک به داده‌های بازار */}
  <MarketDataLinkCard />
</div>
```

---

### مرحله 4.4: به‌روزرسانی مستندات

**فایل:** `docs/USER_GUIDE.md` یا مشابه

```markdown
## Dashboard

Dashboard صفحه اصلی شماست و نمای کلی از **پورتفولیو** شما را نمایش می‌دهد.

### محتوای Dashboard:
- خلاصه ارزش پورتفولیو و سود/زیان
- تعداد پوزیشن‌های فعال
- سیگنال‌های برتر AI
- اقدامات سریع به بخش‌های مختلف
- وضعیت سلامت سیستم

### برای مشاهده داده‌های بازار:
داده‌های دقیق بازار، نمودارها و تحلیل‌ها در **Market Analysis Hub** قرار دارند.

👉 [رفتن به Market Analysis Hub](/market-analysis)

### برای معاملات:
تمام ابزارهای معاملاتی در **Trading Hub** موجود است.

👉 [رفتن به Trading Hub](/trading)
```

---

### مرحله 4.5: تست

```bash
✓ Dashboard فقط پورتفولیو را نشان می‌دهد
✓ هیچ نموداری از قیمت نمادها نیست
✓ Modern Symbol Ribbon حذف شده
✓ لینک‌ها به Market Analysis کار می‌کنند
✓ اقدامات سریع کار می‌کنند
✓ مستندات به‌روز شده
```

---

## ✅ معیارهای موفقیت فاز 4

- ✅ **Dashboard:** فقط پورتفولیو نمایش داده می‌شود
- ✅ **No Market Data:** هیچ داده بازاری در Dashboard نیست
- ✅ **Links:** لینک‌های واضح به Market Analysis Hub
- ✅ **Quick Actions:** دسترسی سریع به سایر بخش‌ها
- ✅ **Documentation:** مستندات به‌روز شده
- ✅ **UX:** تجربه کاربری واضح و روان

---

---

---

# 📊 خلاصه نهایی تمام فازها

## پیشرفت کلی

| فاز | صفحات | زمان | اولویت | نتیجه |
|-----|-------|------|--------|-------|
| 1. Trading Hub | 6→1 | 2-3 هفته | 🔴 CRITICAL | 5 تب یکپارچه |
| 2. AI Lab | 3→1 | 1-2 هفته | 🟡 HIGH | 5 تب یکپارچه |
| 3. Admin Hub | 2→1 | 1 هفته | 🟢 MEDIUM | 3 تب یکپارچه |
| 4. Dashboard | تنظیم | 3-5 روز | 🟢 MEDIUM | تمرکز Portfolio |

**زمان کل:** 4-6 هفته

---

## نتایج مورد انتظار

### قبل از بازسازی:
- 📄 18 صفحه - پیچیده و گیج‌کننده
- 🔄 3-4 کلیک - برای کارهای معمول
- 📝 ~2,000 خط - کد تکراری
- 📡 8-12 فراخوانی - API در هر سشن
- 😓 بار بالا - نگهداری دشوار

### بعد از بازسازی:
- 📄 8-9 صفحه - ساده و واضح (**-50%**)
- 🔄 0-1 کلیک - تقریباً بدون navigation (**-75%**)
- 📝 <500 خط - کد تکراری حذف شده (**-75%**)
- 📡 4-6 فراخوانی - API بهینه شده (**-40%**)
- 😊 بار پایین - نگهداری آسان (**-60%**)

---

## معماری جدید (پس از 4 فاز)

```
┌─────────────────────────────────────────────┐
│     معماری نهایی (8-9 صفحه)                │
├─────────────────────────────────────────────┤
│                                              │
│  📊 Dashboard                                │
│     └─ فقط پورتفولیو                        │
│                                              │
│  🏦 Trading Hub ⭐ جدید                     │
│     ├─ 📊 نمودارها                          │
│     ├─ 💹 اسپات                             │
│     ├─ 📈 فیوچرز (پیش‌فرض)                │
│     ├─ 📋 پوزیشن‌ها                         │
│     └─ 💼 پورتفولیو                         │
│                                              │
│  📊 Market Analysis Hub (موجود)            │
│     ├─ 🌐 بازار                             │
│     ├─ 🔍 اسکنر                             │
│     └─ 📈 تکنیکال                           │
│                                              │
│  🤖 AI Lab ⭐ جدید                          │
│     ├─ 🔍 اسکنر (پیش‌فرض)                  │
│     ├─ 🎓 آموزش                             │
│     ├─ 🧪 بک‌تست                            │
│     ├─ 🛠️  سازنده                           │
│     └─ 💡 بینش‌ها                           │
│                                              │
│  ⚠️  Professional Risk                      │
│                                              │
│  ⚙️  Settings                                │
│                                              │
│  🔧 Admin Hub ⭐ جدید                       │
│     ├─ ❤️  سلامت                            │
│     ├─ 📊 نظارت                             │
│     └─ 🔧 تشخیص                             │
│                                              │
└─────────────────────────────────────────────┘
```

---

## چک‌لیست کامل

### ✅ فاز 1: Trading Hub
- [ ] کپی تمپلیت از `component_templates/unifiedtradinghub/`
- [ ] پیاده‌سازی UnifiedTradingHubView.tsx
- [ ] پیاده‌سازی 5 تب (Charts, Spot, Futures, Positions, Portfolio)
- [ ] بهینه‌سازی WebSocket (یک اتصال مشترک)
- [ ] افزودن 6 redirect برای backward compatibility
- [ ] به‌روزرسانی منوی ناوبری
- [ ] پیاده‌سازی Lazy Loading برای تب Charts
- [ ] تست کامل هر تب
- [ ] تست Performance (< 2s load time)
- [ ] تست Deep Linking (/trading?tab=futures)
- [ ] تست Keyboard Shortcuts (Cmd+1-5)
- [ ] تایید معیارهای موفقیت

### ✅ فاز 2: AI Lab
- [ ] کپی تمپلیت از `component_templates/unifiedailab/`
- [ ] پیاده‌سازی UnifiedAILabView.tsx
- [ ] پیاده‌سازی 5 تب (Scanner, Training, Backtest, Builder, Insights)
- [ ] افزودن 3 redirect
- [ ] به‌روزرسانی منوی ناوبری
- [ ] تست Workflow کامل (Scanner → Training → Backtest)
- [ ] تست یکپارچگی Scanner
- [ ] تایید معیارهای موفقیت

### ✅ فاز 3: Admin Hub
- [ ] کپی تمپلیت از `component_templates/unifiedadmin/`
- [ ] پیاده‌سازی UnifiedAdminView.tsx
- [ ] پیاده‌سازی 3 تب (Health, Monitoring, Diagnostics)
- [ ] افزودن 2 redirect
- [ ] به‌روزرسانی منوی ناوبری (admin only)
- [ ] تست Real-time Updates
- [ ] تست Export Functionality
- [ ] تایید معیارهای موفقیت

### ✅ فاز 4: Dashboard Cleanup
- [ ] حذف Modern Symbol Ribbon
- [ ] حذف نمودارهای قیمت
- [ ] حذف نمایش قیمت نمادها (BTC/ETH/SOL)
- [ ] افزودن لینک به Market Analysis Hub
- [ ] افزودن Quick Actions Card
- [ ] به‌روزرسانی مستندات
- [ ] تست تمرکز روی Portfolio
- [ ] تایید معیارهای موفقیت

---

## 🎯 نکات نهایی مهم

### 1. فایل‌های قدیمی را حذف نکنید
- تا زمانی که تست کامل نشده، نگه دارید
- از redirects برای backward compatibility استفاده کنید
- بعد از 2-4 هفته تست، حذف کنید

### 2. WebSocket را بهینه کنید
- یک اتصال برای هر Hub
- routing رویدادها به تب‌های مناسب
- handle کردن قطع و وصل شدن

### 3. Lazy Loading فراموش نشود
- تب Charts در Trading Hub
- کامپوننت‌های سنگین دیگر

### 4. تست، تست، تست!
- Unit tests برای هر تب
- Integration tests برای Workflow
- Performance tests
- User Acceptance Tests

### 5. مستندات را به‌روز کنید
- راهنمای کاربر
- مستندات توسعه‌دهنده
- Changelog

---

## 🚀 شروع کار

### 1. ابتدا:
- تمپلیت‌ها را در `component_templates/` بررسی کنید
- این پرامپت را چند بار بخوانید
- درک کنید که چه باید انجام شود

### 2. شروع پیاده‌سازی:
```bash
# فاز 1
cp -r component_templates/unifiedtradinghub src/views/trading-hub/
code src/views/trading-hub/UnifiedTradingHubView.tsx
```

### 3. پیروی از مراحل:
- هر مرحله را به ترتیب انجام دهید
- بعد از هر کار تست کنید
- قبل از رفتن به مرحله بعد، مطمئن شوید

### 4. بعد از فاز 1:
- معیارهای موفقیت را تایید کنید
- بروید به فاز 2
- همین روند را ادامه دهید

---

## ✅ معیارهای نهایی موفقیت

بعد از اتمام تمام 4 فاز:

- ✅ **18 صفحه → 8-9 صفحه** (کاهش 50%)
- ✅ **کد تکراری** (کاهش 75%)
- ✅ **کلیک‌های Navigation** (کاهش 75%)
- ✅ **فراخوانی‌های API** (کاهش 40%)
- ✅ **WebSocket بهینه** (یک اتصال برای هر Hub)
- ✅ **Lazy Loading** (تب‌های سنگین)
- ✅ **Backward Compatible** (تمام redirectها کار می‌کنند)
- ✅ **تمام تست‌ها** قبول شده
- ✅ **Performance** (زمان لود < 2s)
- ✅ **UX بهبود یافته** (Workflow یکپارچه)
- ✅ **مستندات به‌روز** شده
- ✅ **تیم راضی** است

---

## 🎉 پایان

با اتمام این 4 فاز، معماری شما:
- ✅ **50% ساده‌تر** شده
- ✅ **75% کد کمتر** تکراری دارد
- ✅ **40% کارآمدتر** است
- ✅ **کاربرپسندتر** شده
- ✅ **نگهداری آن** آسان‌تر است

**موفق باشید! 🚀**

---

**ایجاد شده:** 5 دسامبر 2025  
**نسخه:** 1.0.0  
**وضعیت:** ✅ آماده برای اجرا  
**تمپلیت‌ها:** `component_templates/`  
**مستندات:** `architecture_reorganization/`
