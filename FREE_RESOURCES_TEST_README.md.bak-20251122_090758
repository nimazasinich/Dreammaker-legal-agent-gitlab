# Free Resources Self-Test

## 📋 Overview

این مجموعه تست‌ها برای بررسی سلامت و در دسترس بودن APIهای رایگان خارجی و endpoint های محلی backend طراحی شده است.

## 🎯 هدف

- ✅ تست APIهای رایگان خارجی (CoinGecko, Binance, Alternative.me و غیره)
- ✅ تست endpoint های محلی backend روی پورت 8001
- ✅ تشخیص مشکلات قبل از اجرای اصلی برنامه
- ✅ گزارش‌دهی دقیق از وضعیت هر endpoint

## 📦 فایل‌های موجود

```
free_resources_selftest.mjs    # اسکریپت اصلی تست (Node.js)
test_free_endpoints.sh         # اسکریپت bash برای Linux/Mac
test_free_endpoints.ps1        # اسکریپت PowerShell برای Windows
```

## 🚀 نحوه استفاده

### پیش‌نیازها

1. **Node.js 18+** باید نصب باشد
2. **Backend باید روی پورت 8001 در حال اجرا باشد**

```bash
# شروع backend
npm run dev
```

### روش 1: استفاده از npm scripts (توصیه می‌شود)

```bash
# اجرای مستقیم
npm run test:free-resources

# اجرا با PowerShell (Windows)
npm run test:free-resources:win

# اجرا با bash (Linux/Mac)
npm run test:free-resources:sh
```

### روش 2: اجرای مستقیم

```bash
# Node.js (همه پلتفرم‌ها)
node free_resources_selftest.mjs

# Bash (Linux/Mac)
./test_free_endpoints.sh

# PowerShell (Windows)
.\test_free_endpoints.ps1
```

### روش 3: تغییر API Base URL

```bash
# با متغیر محیطی
API_BASE=http://localhost:3001/api npm run test:free-resources

# با آرگومان (bash)
./test_free_endpoints.sh http://localhost:3001/api

# با آرگومان (PowerShell)
.\test_free_endpoints.ps1 -ApiBase "http://localhost:3001/api"
```

## 📊 خروجی‌ها

### 1. خروجی Console

تست نتایج را به صورت رنگی در console نمایش می‌دهد:

```
✅ OK   [REQ] CoinGecko Simple Price
✅ OK   [REQ] Binance Klines BTCUSDT 1h
✅ OK   [REQ] Alternative.me Fear & Greed
⚠️  FAIL [OPT] Reddit r/cryptocurrency top
✅ OK   [REQ] Local: Health Check
✅ OK   [REQ] Local: Market Prices
```

### 2. فایل JSON (artifacts/free_resources_selftest.json)

گزارش کامل با جزئیات هر endpoint:

```json
{
  "ts": "2025-11-10T12:00:00.000Z",
  "apiBase": "http://localhost:8001/api",
  "totals": {
    "all": 11,
    "ok": 9,
    "failed": 2,
    "requiredOk": 6,
    "requiredTotal": 6
  },
  "failures": [...],
  "results": [...]
}
```

### 3. فایل LOG (artifacts/free_resources_selftest.log)

خلاصه قابل خواندن برای انسان:

```
================================================================================
FREE RESOURCES SELF-TEST REPORT
================================================================================
Timestamp: 2025-11-10T12:00:00.000Z
API Base: http://localhost:8001/api

SUMMARY:
  Total Tests:      11
  Passed:           9 ✅
  Failed:           2 ❌
  Required Passed:  6/6
  Optional Passed:  3/5
...
```

## 🔍 Endpoint های تست شده

### External APIs (Required)

| Endpoint | توضیحات |
|----------|---------|
| CoinGecko Simple Price | قیمت BTC و ETH |
| Binance Klines | داده‌های کندل استیک |
| Alternative.me Fear & Greed | شاخص ترس و طمع |

### External APIs (Optional)

| Endpoint | توضیحات |
|----------|---------|
| Reddit r/cryptocurrency | پست‌های برتر Reddit |
| CoinDesk RSS | فید خبری CoinDesk |
| CoinTelegraph RSS | فید خبری CoinTelegraph |

### Local Backend (Required)

| Endpoint | توضیحات |
|----------|---------|
| `/api/health` | بررسی سلامت backend |
| `/api/market/prices` | قیمت‌های بازار |

### Local Backend (Optional)

| Endpoint | توضیحات |
|----------|---------|
| `/api/hf/ohlcv` | داده‌های OHLCV از Hugging Face |
| `/api/hf/sentiment` | تحلیل احساسات با HF |
| `/api/sentiment/fear-greed` | شاخص ترس و طمع محلی |
| `/api/social/aggregate` | جمع‌آوری احساسات اجتماعی |

## ⚠️ Exit Codes

- `0`: همه تست‌های required موفق بودند ✅
- `1`: خطای fatal در اجرای تست ❌
- `2`: برخی از endpoint های required شکست خوردند ❌

## 🔧 عیب‌یابی

### مشکل: "Backend does not appear to be running"

**راه‌حل:**
```bash
# Backend را شروع کنید
npm run dev

# یا در ترمینال جداگانه
npm run dev:server
```

### مشکل: "Node.js version 18+ is required"

**راه‌حل:**
```bash
# بررسی نسخه فعلی
node -v

# ارتقا Node.js از https://nodejs.org/
```

### مشکل: "Some required endpoints failed"

**راه‌حل:**
1. گزارش `artifacts/free_resources_selftest.log` را بررسی کنید
2. اتصال اینترنت خود را چک کنید
3. مطمئن شوید backend در حال اجرا است
4. پورت صحیح را بررسی کنید (پیش‌فرض: 8001)

### مشکل: Optional endpoints شکست می‌خورند

**توجه:** این مشکل نیست! endpoint های optional می‌توانند به دلایل زیر شکست بخورند:
- Rate limiting
- CORS restrictions
- موقتاً در دسترس نبودن سرویس
- نیاز به API key

تست همچنان pass می‌شود اگر همه required endpoint ها کار کنند.

## 📝 یادداشت‌ها

- این تست‌ها **non-destructive** هستند و هیچ تغییری در سیستم ایجاد نمی‌کنند
- فقط عملیات **read-only** انجام می‌دهند
- برای CI/CD pipeline مناسب هستند
- می‌توانید آن‌ها را در pre-deployment checks استفاده کنید

## 🤝 مشارکت

برای افزودن endpoint های جدید:

1. فایل `free_resources_selftest.mjs` را ویرایش کنید
2. endpoint جدید را با `probeJson()` یا `probeText()` اضافه کنید
3. مشخص کنید که `required: true` یا `required: false` است
4. یک validator مناسب اضافه کنید

مثال:

```javascript
results.push(await probeJson(
  'My New Endpoint',
  `${API_BASE}/my/new/endpoint`,
  { 
    required: false,
    validator: (d)=> d && d.success === true
  }
));
```

## 📄 License

این فایل‌ها بخشی از پروژه DreammakerCryptoSignalAndTrader هستند.

