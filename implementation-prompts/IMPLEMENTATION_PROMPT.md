# 🎯 دستورالعمل پیاده‌سازی بازآرایی معماری (Architecture Reorganization Implementation Prompt)

## 📋 خلاصه وظیفه

شما باید بازآرایی معماری پلتفرم Dreammaker Crypto را بر اساس گزارش `Comprehensive_Architecture_Analysis_Report.txt` پیاده‌سازی کنید. هدف اصلی این است که 18 صفحه را به 8-9 صفحه کاهش دهید با ادغام صفحات مشابه در هاب‌های یکپارچه.

---

## 🎯 اهداف اصلی

1. **کاهش پیچیدگی ناوبری:** از 18 صفحه به 8-9 صفحه (کاهش 50%)
2. **حذف تکرار کد:** حذف حدود 2000 خط کد تکراری
3. **بهبود تجربه کاربری:** کاهش کلیک‌های ناوبری از 3-4 به 0-1
4. **بهینه‌سازی API:** کاهش 40% درخواست‌های API

---

## 📊 فاز 1: Unified Trading Hub (اولویت: بالا)

### هدف
ادغام 4 صفحه معاملاتی در یک هاب یکپارچه: `UnifiedTradingHubView`

### صفحاتی که باید ادغام شوند:
1. **TradingViewDashboard** → تب `charts`
2. **EnhancedTradingView** → تب `spot`
3. **FuturesTradingView** → تب `futures` (پیش‌فرض)
4. **PositionsView** → تب `positions`
5. **PortfolioPage** → تب `portfolio`

### مراحل پیاده‌سازی:

#### مرحله 1: ایجاد کامپوننت اصلی
```typescript
// فایل: src/views/UnifiedTradingHubView.tsx

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';

type TabId = 'charts' | 'spot' | 'futures' | 'positions' | 'portfolio';

interface TabConfig {
  id: TabId;
  label: string;
  component: React.ComponentType;
  lazy?: boolean;
  default?: boolean;
}

export default function UnifiedTradingHubView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  
  // تعیین تب فعال از URL یا پیش‌فرض
  const activeTab = (searchParams.get('tab') as TabId) || 'futures';
  
  // تعریف تب‌ها
  const tabs: TabConfig[] = [
    { 
      id: 'charts', 
      label: 'Charts', 
      component: TradingViewChartsTab,
      lazy: true // لود تنبل برای TradingView widgets
    },
    { 
      id: 'spot', 
      label: 'Spot', 
      component: SpotTradingTab,
      default: false
    },
    { 
      id: 'futures', 
      label: 'Futures', 
      component: FuturesTradingTab,
      default: true // تب پیش‌فرض
    },
    { 
      id: 'positions', 
      label: 'Positions', 
      component: PositionsTab,
      default: false
    },
    { 
      id: 'portfolio', 
      label: 'Portfolio', 
      component: PortfolioTab,
      default: false
    }
  ];

  // تغییر تب
  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId });
  };

  // اتصال WebSocket مشترک
  const ws = useWebSocket({
    events: ['price_update', 'scoring_snapshot', 'positions_update'],
    enabled: true
  });

  return (
    <div className="unified-trading-hub">
      {/* نوار تب‌ها */}
      <TabNavigation 
        tabs={tabs}
        active={activeTab}
        onChange={handleTabChange}
        selectedSymbol={selectedSymbol}
        onSymbolChange={setSelectedSymbol}
      />
      
      {/* محتوای تب فعال */}
      <Suspense fallback={<LoadingSpinner />}>
        <TabContent>
          {renderActiveTab(activeTab, tabs)}
        </TabContent>
      </Suspense>
    </div>
  );
}
```

#### مرحله 2: ایجاد تب‌های جداگانه

برای هر تب، کامپوننت جداگانه ایجاد کنید:

**تب Charts:**
```typescript
// src/components/trading/TradingViewChartsTab.tsx
// محتوای TradingViewDashboard را اینجا منتقل کنید
```

**تب Spot:**
```typescript
// src/components/trading/SpotTradingTab.tsx
// محتوای EnhancedTradingView (حالت spot) را اینجا منتقل کنید
```

**تب Futures:**
```typescript
// src/components/trading/FuturesTradingTab.tsx
// محتوای FuturesTradingView را اینجا منتقل کنید
```

**تب Positions:**
```typescript
// src/components/trading/PositionsTab.tsx
// محتوای PositionsView را اینجا منتقل کنید
```

**تب Portfolio:**
```typescript
// src/components/trading/PortfolioTab.tsx
// محتوای PortfolioPage را اینجا منتقل کنید
```

#### مرحله 3: بهینه‌سازی داده‌ها

```typescript
// Hook مشترک برای داده‌های معاملاتی
const useUnifiedTradingData = (symbol: string, activeTab: TabId) => {
  // داده‌های مشترک - یکبار واکشی می‌شود
  const { data: marketData } = useQuery(
    ['market', symbol],
    () => fetchMarketData(symbol),
    { enabled: true } // همیشه واکشی می‌شود
  );

  // داده‌های خاص تب - فقط وقتی تب فعال است
  const { data: scoringData } = useQuery(
    ['scoring', symbol],
    () => fetchScoringSnapshot(symbol),
    { enabled: activeTab === 'spot' || activeTab === 'futures' }
  );

  const { data: positionsData } = useQuery(
    ['positions'],
    () => fetchPositions(),
    { enabled: activeTab === 'positions' || activeTab === 'futures' }
  );

  return { marketData, scoringData, positionsData };
};
```

#### مرحله 4: اضافه کردن Route و Redirects

```typescript
// src/App.tsx یا فایل routing شما

import { Route, Navigate } from 'react-router-dom';
import UnifiedTradingHubView from './views/UnifiedTradingHubView';

// Route جدید
<Route path="/trading" element={<UnifiedTradingHubView />} />

// Redirects برای سازگاری با کد قدیمی
<Route path="/tradingview-dashboard" element={<Navigate to="/trading?tab=charts" replace />} />
<Route path="/enhanced-trading" element={<Navigate to="/trading?tab=spot" replace />} />
<Route path="/futures" element={<Navigate to="/trading?tab=futures" replace />} />
<Route path="/trading-hub" element={<Navigate to="/trading" replace />} />
<Route path="/positions" element={<Navigate to="/trading?tab=positions" replace />} />
<Route path="/portfolio" element={<Navigate to="/trading?tab=portfolio" replace />} />
```

#### مرحله 5: به‌روزرسانی Navigation Menu

```typescript
// منوی ناوبری را به‌روزرسانی کنید
const navigationItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { 
    path: '/trading', 
    label: 'Trading Hub',
    subItems: [
      { path: '/trading?tab=charts', label: 'Charts' },
      { path: '/trading?tab=spot', label: 'Spot' },
      { path: '/trading?tab=futures', label: 'Futures' },
      { path: '/trading?tab=positions', label: 'Positions' },
      { path: '/trading?tab=portfolio', label: 'Portfolio' },
    ]
  },
  // ... سایر آیتم‌ها
];
```

---

## 📊 فاز 2: Unified AI Lab (اولویت: متوسط)

### هدف
ادغام 3 صفحه AI/ML در یک هاب یکپارچه: `UnifiedAILabView`

### صفحاتی که باید ادغام شوند:
1. **TrainingView** → تب `training`
2. **EnhancedStrategyLabView** → تب‌های `backtest`, `builder`, `insights`
3. **ScannerView** → تب `scanner` (پیش‌فرض)

### مراحل پیاده‌سازی:

#### مرحله 1: ایجاد کامپوننت اصلی
```typescript
// src/views/UnifiedAILabView.tsx

type TabId = 'scanner' | 'training' | 'backtest' | 'builder' | 'insights';

export default function UnifiedAILabView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabId) || 'scanner';
  
  const tabs: TabConfig[] = [
    { id: 'scanner', label: 'Scanner', component: ScannerTab, default: true },
    { id: 'training', label: 'Training', component: TrainingTab },
    { id: 'backtest', label: 'Backtest', component: BacktestTab },
    { id: 'builder', label: 'Builder', component: BuilderTab },
    { id: 'insights', label: 'Insights', component: InsightsTab },
  ];

  // ... مشابه UnifiedTradingHubView
}
```

#### مرحله 2: Route و Redirects
```typescript
<Route path="/ai-lab" element={<UnifiedAILabView />} />

<Route path="/training" element={<Navigate to="/ai-lab?tab=training" replace />} />
<Route path="/strategylab" element={<Navigate to="/ai-lab" replace />} />
<Route path="/scanner" element={<Navigate to="/ai-lab?tab=scanner" replace />} />
```

---

## 📊 فاز 3: Unified Admin Hub (اولویت: پایین)

### هدف
ادغام 2 صفحه Admin در یک هاب یکپارچه: `UnifiedAdminView`

### صفحاتی که باید ادغام شوند:
1. **HealthView** → تب‌های `health` و `diagnostics`
2. **MonitoringView** → تب `monitoring`

### مراحل پیاده‌سازی:

```typescript
// src/views/UnifiedAdminView.tsx

type TabId = 'health' | 'monitoring' | 'diagnostics';

export default function UnifiedAdminView() {
  const activeTab = (searchParams.get('tab') as TabId) || 'health';
  
  const tabs: TabConfig[] = [
    { id: 'health', label: 'Health', component: HealthTab, default: true },
    { id: 'monitoring', label: 'Monitoring', component: MonitoringTab },
    { id: 'diagnostics', label: 'Diagnostics', component: DiagnosticsTab },
  ];
  
  // ... مشابه سایر هاب‌ها
}
```

```typescript
<Route path="/admin" element={<UnifiedAdminView />} />

<Route path="/health" element={<Navigate to="/admin?tab=health" replace />} />
<Route path="/monitoring" element={<Navigate to="/admin?tab=monitoring" replace />} />
```

---

## 📊 فاز 4: Dashboard Cleanup (اولویت: متوسط)

### هدف
حذف داده‌های بازار تکراری از Dashboard

### تغییرات:
1. حذف نمایش داده‌های بازار از `EnhancedDashboardView`
2. تمرکز Dashboard فقط روی Portfolio
3. اضافه کردن لینک به Market Analysis Hub

```typescript
// src/views/EnhancedDashboardView.tsx

// حذف کنید:
// - Market statistics cards
// - Real-time price charts
// - Symbol ribbon

// نگه دارید:
// - Portfolio value and PnL
// - Top signals panel
// - Health status indicator

// اضافه کنید:
<Link to="/market-analysis">View Market Data →</Link>
```

---

## ✅ چک‌لیست پیاده‌سازی

### فاز 1: Unified Trading Hub
- [ ] ایجاد `UnifiedTradingHubView.tsx`
- [ ] ایجاد 5 تب جداگانه (Charts, Spot, Futures, Positions, Portfolio)
- [ ] پیاده‌سازی Tab Navigation
- [ ] پیاده‌سازی WebSocket مشترک
- [ ] بهینه‌سازی داده‌ها با `useUnifiedTradingData`
- [ ] اضافه کردن Routes و Redirects
- [ ] به‌روزرسانی Navigation Menu
- [ ] تست تمام تب‌ها
- [ ] تست Redirects
- [ ] تست Deep Linking (URL parameters)

### فاز 2: Unified AI Lab
- [ ] ایجاد `UnifiedAILabView.tsx`
- [ ] ایجاد 5 تب جداگانه
- [ ] اضافه کردن Routes و Redirects
- [ ] تست workflow (Scanner → Training → Backtest)

### فاز 3: Unified Admin Hub
- [ ] ایجاد `UnifiedAdminView.tsx`
- [ ] ایجاد 3 تب جداگانه
- [ ] اضافه کردن Routes و Redirects

### فاز 4: Dashboard Cleanup
- [ ] حذف داده‌های بازار از Dashboard
- [ ] اضافه کردن لینک به Market Analysis Hub

---

## 🧪 تست‌ها

### تست‌های عملکردی:
1. ✅ همه تب‌ها به درستی کار می‌کنند
2. ✅ داده‌ها به درستی واکشی می‌شوند
3. ✅ WebSocket به درستی کار می‌کند
4. ✅ Redirects به درستی کار می‌کنند
5. ✅ Deep Linking کار می‌کند
6. ✅ Navigation Menu به‌روز شده است

### تست‌های عملکرد:
1. ✅ Lazy Loading برای تب Charts کار می‌کند
2. ✅ داده‌های مشترک فقط یکبار واکشی می‌شوند
3. ✅ زمان بارگذاری صفحه < 2 ثانیه

---

## 📝 نکات مهم

1. **حفظ سازگاری:** همه Route های قدیمی باید Redirect شوند
2. **Lazy Loading:** تب Charts (TradingView widgets) باید lazy load شود
3. **State Management:** State مشترک (مثل symbol انتخاب شده) باید بین تب‌ها به اشتراک گذاشته شود
4. **WebSocket:** یک اتصال WebSocket مشترک برای همه تب‌ها
5. **Error Handling:** مدیریت خطا برای همه تب‌ها
6. **Loading States:** نمایش Loading برای هر تب

---

## 🚀 شروع کار

1. ابتدا فاز 1 را کامل کنید (Unified Trading Hub)
2. بعد از تست کامل فاز 1، فاز 2 را شروع کنید
3. فاز 3 و 4 را در نهایت انجام دهید

---

## 📚 منابع

- گزارش کامل: `Comprehensive_Architecture_Analysis_Report.txt`
- داده‌های سازمان‌یافته: `architecture_pages_data.json`
- Route Mapping: `ROUTE_MAPPING.md`
- گزارش سازمان‌یافته: `ARCHITECTURE_REPORT_ORGANIZED.md`

---

**موفق باشید! 🚀**
