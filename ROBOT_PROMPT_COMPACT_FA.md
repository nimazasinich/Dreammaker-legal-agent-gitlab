# 🤖 پرامپت خلاصه برای ربات - 4 فاز بازسازی معماری

## 🎯 ماموریت کلی

بازسازی پلتفرم Dreammaker Crypto از 18 صفحه به 8-9 صفحه با 4 فاز ادغام.

**تمپلیت‌ها آماده است در:** `component_templates/`  
**اسناد کامل در:** `architecture_reorganization/`

---

## 🔴 فاز 1: Trading Hub (2-3 هفته) - CRITICAL ⭐⭐⭐

### ادغام 4 صفحه → 1 صفحه:
- TradingViewDashboard + EnhancedTradingView + FuturesTradingView + TradingHubView
- **→** UnifiedTradingHubView در `/trading`

### 5 تب:
1. **Charts** ← TradingViewDashboard
2. **Spot** ← EnhancedTradingView
3. **Futures** (default) ← FuturesTradingView
4. **Positions** ← PositionsView
5. **Portfolio** ← PortfolioPage

### اقدامات:
```bash
# 1. کپی تمپلیت
cp -r component_templates/unifiedtradinghub/* src/views/trading-hub/

# 2. پیاده‌سازی UnifiedTradingHubView.tsx
# 3. مهاجرت محتوای هر تب از فایل‌های منبع
# 4. بهینه WebSocket (یک اتصال مشترک)
# 5. افزودن redirects:
```

```typescript
<Route path="/tradingview-dashboard" element={<Navigate to="/trading?tab=charts" />} />
<Route path="/enhanced-trading" element={<Navigate to="/trading?tab=spot" />} />
<Route path="/futures" element={<Navigate to="/trading?tab=futures" />} />
<Route path="/trading-hub" element={<Navigate to="/trading" />} />
<Route path="/positions" element={<Navigate to="/trading?tab=positions" />} />
<Route path="/portfolio" element={<Navigate to="/trading?tab=portfolio" />} />
```

### معیارهای موفقیت:
- ✅ 5 تب کار می‌کنند
- ✅ WebSocket بهینه (یک اتصال)
- ✅ زمان لود < 2 ثانیه
- ✅ Redirects کار می‌کنند

---

## 🟡 فاز 2: AI Lab (1-2 هفته) - HIGH ⭐⭐

### ادغام 3 صفحه → 1 صفحه:
- TrainingView + EnhancedStrategyLabView + ScannerView
- **→** UnifiedAILabView در `/ai-lab`

### 5 تب:
1. **Scanner** (default) ← ScannerView
2. **Training** ← TrainingView
3. **Backtest** ← EnhancedStrategyLabView
4. **Builder** ← EnhancedStrategyLabView
5. **Insights** ← EnhancedStrategyLabView

### اقدامات:
```bash
# 1. کپی تمپلیت
cp -r component_templates/unifiedailab/* src/views/ai-lab/

# 2. پیاده‌سازی UnifiedAILabView.tsx
# 3. مهاجرت محتوای تب‌ها
# 4. افزودن redirects:
```

```typescript
<Route path="/training" element={<Navigate to="/ai-lab?tab=training" />} />
<Route path="/strategylab" element={<Navigate to="/ai-lab?tab=backtest" />} />
<Route path="/scanner" element={<Navigate to="/ai-lab?tab=scanner" />} />
```

### معیارهای موفقیت:
- ✅ 5 تب کار می‌کنند
- ✅ Workflow AI/ML یکپارچه است
- ✅ Scanner integration کار می‌کند

---

## 🟢 فاز 3: Admin Hub (1 هفته) - MEDIUM ⭐

### ادغام 2 صفحه → 1 صفحه:
- HealthView + MonitoringView
- **→** UnifiedAdminView در `/admin`

### 3 تب:
1. **Health** (default) ← HealthView
2. **Monitoring** ← MonitoringView
3. **Diagnostics** ← HealthView

### اقدامات:
```bash
# 1. کپی تمپلیت
cp -r component_templates/unifiedadmin/* src/views/admin/

# 2. پیاده‌سازی UnifiedAdminView.tsx
# 3. مهاجرت محتوای تب‌ها
# 4. افزودن redirects:
```

```typescript
<Route path="/health" element={<Navigate to="/admin?tab=health" />} />
<Route path="/monitoring" element={<Navigate to="/admin?tab=monitoring" />} />
```

### معیارهای موفقیت:
- ✅ 3 تب کار می‌کنند
- ✅ تمام ابزارهای ادمین در دسترس
- ✅ هیچ feature از دست نرفته

---

## 🟢 فاز 4: Dashboard Cleanup (3-5 روز) - MEDIUM ⭐

### هدف:
Dashboard فقط Portfolio را نشان دهد، نه داده‌های بازار

### اقدامات:
1. حذف Modern Symbol Ribbon از Dashboard
2. حذف نمودارهای قیمت real-time
3. حذف نمایش قیمت BTC/ETH/SOL
4. نگه داشتن: Portfolio value, PnL, Top Signals, Health
5. افزودن لینک به Market Analysis Hub
6. به‌روزرسانی مستندات

### معیارهای موفقیت:
- ✅ Dashboard = Portfolio فقط
- ✅ داده‌های بازار در Market Analysis Hub
- ✅ لینک‌های واضح به سایر هاب‌ها

---

## 📊 نتیجه نهایی

| مورد | قبل | بعد | بهبود |
|------|-----|-----|-------|
| صفحات | 18 | 8-9 | -50% |
| کد تکراری | 2000 | <500 | -75% |
| کلیک‌ها | 3-4 | 0-1 | -75% |
| API calls | 8-12 | 4-6 | -40% |

---

## ✅ چک‌لیست کلی

**فاز 1: Trading Hub**
- [ ] کپی تمپلیت از `component_templates/unifiedtradinghub/`
- [ ] پیاده‌سازی 5 تب
- [ ] بهینه WebSocket
- [ ] افزودن 6 redirect
- [ ] تست < 2s load

**فاز 2: AI Lab**
- [ ] کپی تمپلیت از `component_templates/unifiedailab/`
- [ ] پیاده‌سازی 5 تب
- [ ] افزودن 3 redirect
- [ ] تست workflow

**فاز 3: Admin Hub**
- [ ] کپی تمپلیت از `component_templates/unifiedadmin/`
- [ ] پیاده‌سازی 3 تب
- [ ] افزودن 2 redirect
- [ ] تست ابزارها

**فاز 4: Dashboard**
- [ ] حذف داده‌های بازار
- [ ] افزودن لینک‌ها
- [ ] به‌روزرسانی docs

---

## 🚀 شروع کن!

1. شروع با **فاز 1** (بحرانی‌ترین)
2. تمپلیت‌ها آماده است، فقط محتوا را مهاجرت بده
3. تست در هر مرحله
4. بعد فاز 1 → فاز 2 → فاز 3 → فاز 4

**زمان کل:** 4-6 هفته  
**نتیجه:** 50% ساده‌تر، 75% کد کمتر، 40% API کمتر

موفق باشی! 🎉
