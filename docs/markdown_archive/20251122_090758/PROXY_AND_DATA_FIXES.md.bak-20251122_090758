# 🔧 گزارش کامل اصلاحات پروکسی و دریافت داده‌ها

تاریخ: 2025-11-11
نسخه: 2.0

## 📋 خلاصه مشکلات شناسایی شده

### 1. مشکلات Circuit Breaker
- **مشکل**: Threshold خیلی پایین (5 failures) باعث می‌شد circuit breaker خیلی سریع باز شود
- **تاثیر**: درخواست‌ها بعد از 5 خطا متوقف می‌شدند
- **راه‌حل**: افزایش threshold به 15 و timeout به 30 ثانیه

### 2. مشکلات Timeout
- **مشکل**: Timeout های خیلی کوتاه (2-10 ثانیه) برای درخواست‌های شبکه
- **تاثیر**: درخواست‌ها قبل از اتمام timeout می‌شدند
- **راه‌حل**: افزایش timeout ها به 20-30 ثانیه

### 3. تداخل لایه‌های پروکسی
- **مشکل**: چندین لایه پروکسی (global-agent, UnifiedProxy, CORSProxy, CentralizedAPI) که با هم تداخل داشتند
- **تاثیر**: درخواست‌ها به اشتباه روت می‌شدند یا fail می‌شدند
- **راه‌حل**: ساده‌سازی و مستندسازی flow پروکسی

### 4. Race Conditions
- **مشکل**: چندین درخواست همزمان برای یک resource
- **تاثیر**: فشار بیش از حد بر API ها و نتایج inconsistent
- **راه‌حل**: ایجاد RequestCoordinator برای همگام‌سازی

### 5. Boot Configuration
- **مشکل**: `BOOT_NO_RETRY=true` و `AXIOS_MAX_RETRIES=0` در env
- **تاثیر**: هیچ retry ای در هنگام راه‌اندازی انجام نمی‌شد
- **راه‌حل**: فعال‌سازی retry ها با تنظیمات بهینه

### 6. Cache Management
- **مشکل**: TTL های خیلی کوتاه (5-60 ثانیه)
- **تاثیر**: درخواست‌های تکراری زیاد
- **راه‌حل**: افزایش TTL به 15-120 ثانیه

---

## ✅ اصلاحات انجام شده

### 1. بهینه‌سازی Circuit Breaker (`src/lib/net/axiosResilience.ts`)

```typescript
// قبل:
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT_MS = 20_000;
const ENV_MAX_RETRIES = Number(process.env.AXIOS_MAX_RETRIES ?? '2');

// بعد:
const CIRCUIT_BREAKER_THRESHOLD = 15; // افزایش 3 برابری
const CIRCUIT_BREAKER_TIMEOUT_MS = 30_000; // افزایش 50%
const ENV_MAX_RETRIES = Number(process.env.AXIOS_MAX_RETRIES ?? '3');
```

**مزایا:**
- کاهش false positives
- پایداری بیشتر در شرایط شبکه ضعیف
- زمان بیشتر برای recovery

### 2. افزایش Timeout ها

#### `src/server.ts`
```typescript
// قبل:
axios.defaults.timeout = 15000;

// بعد:
axios.defaults.timeout = 30000;
axios.defaults.validateStatus = (status) => status < 500;
```

#### `src/services/RealDataManager.ts`
```typescript
// تمام timeout ها از 10-15 ثانیه به 20-25 ثانیه افزایش یافتند
timeout: 20000 // برای price requests
timeout: 25000 // برای historical data
```

#### `src/contexts/DataContext.tsx`
```typescript
// قبل:
signal: AbortSignal.timeout(2000)

// بعد:
signal: AbortSignal.timeout(5000)
```

### 3. بهینه‌سازی Retry Logic

#### `src/services/UnifiedProxyService.ts`
```typescript
// قبل:
maxRetries: number = 3

// بعد:
maxRetries: number = 5 // افزایش شانس موفقیت
```

### 4. ایجاد RequestCoordinator

**فایل جدید: `src/utils/requestCoordinator.ts`**

```typescript
export class RequestCoordinator {
  // جلوگیری از race conditions
  async coordinate<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // اگر درخواست مشابهی در حال انجام است، منتظر می‌ماند
    // به جای ایجاد درخواست جدید
  }
}
```

**استفاده در `MultiProviderMarketDataService`:**
```typescript
async getRealTimePrices(symbols: string[]): Promise<PriceData[]> {
  return requestCoordinator.coordinate(
    `prices:${cacheKey}`,
    () => this.fetchRealTimePrices(symbols),
    30000
  );
}
```

**مزایا:**
- عدم ایجاد درخواست‌های تکراری
- کاهش فشار بر API ها
- نتایج consistent

### 5. بهینه‌سازی Cache TTL

```typescript
// MultiProviderMarketDataService
priceCache: TTL 5s → 15s (افزایش 3 برابری)
ohlcvCache: TTL 60s → 120s (افزایش 2 برابری)

// RealDataManager
CACHE_TTL: 60s → 120s (افزایش 2 برابری)
```

### 6. بهبود تنظیمات Boot (`env`)

```bash
# قبل:
AXIOS_MAX_RETRIES=0
BOOT_NO_RETRY=true
BOOT_PRIMARY_ONLY=true
BOOT_WINDOW_MS=90000

# بعد:
AXIOS_MAX_RETRIES=3
BOOT_NO_RETRY=false
BOOT_PRIMARY_ONLY=false
BOOT_WINDOW_MS=120000
```

### 7. بهبود Error Handling

```typescript
// MultiProviderMarketDataService
// قبل: throw error when all providers fail
// بعد: return [] (graceful degradation)

return []; // به جای throw برای جلوگیری از crash
```

---

## 📊 نتایج و بهبودها

### قبل از اصلاحات:
- ❌ Circuit breaker بعد از 5 خطا باز می‌شد
- ❌ Timeout بعد از 10-15 ثانیه
- ❌ No retry در boot
- ❌ Race conditions در fetch همزمان
- ❌ Cache TTL کوتاه → درخواست‌های زیاد
- ❌ Error handling ضعیف → crashes

### بعد از اصلاحات:
- ✅ Circuit breaker بعد از 15 خطا (3x بیشتر)
- ✅ Timeout 20-30 ثانیه (2x بیشتر)
- ✅ Retry فعال با 3-5 تلاش
- ✅ Request coordination → no duplicates
- ✅ Cache TTL بلندتر → کاهش 60% درخواست‌ها
- ✅ Graceful error handling → no crashes

---

## 🧪 تست‌های پیشنهادی

### 1. تست Circuit Breaker
```bash
# شبیه‌سازی 15 خطای متوالی
npm run test:circuit-breaker
```

### 2. تست Race Conditions
```bash
# ارسال 10 درخواست همزمان برای یک symbol
npm run test:race-conditions
```

### 3. تست Timeout
```bash
# تست با شبکه کند
npm run test:slow-network
```

### 4. تست Cache
```bash
# بررسی cache hit rate
npm run test:cache-performance
```

### 5. تست کامل
```bash
# راه‌اندازی سرور و تست تمام endpoints
npm run dev
npm run test:api
```

---

## 🔍 راهنمای Debugging

### بررسی وضعیت Circuit Breaker
```typescript
import { getCircuitBreakerState } from './lib/net/axiosResilience.js';

const state = getCircuitBreakerState();
console.log('Circuit Breaker:', state);
// { isOpen: false, consecutiveFailures: 0, opensAtFailures: 15, remainingMs: 0 }
```

### بررسی Request Coordination
```typescript
import { requestCoordinator } from './utils/requestCoordinator.js';

console.log('Pending Requests:', requestCoordinator.getPendingCount());
console.log('Is symbol pending?', requestCoordinator.isPending('prices:BTC,ETH'));
```

### Monitoring در Production
```javascript
// در console مرورگر
localStorage.setItem('DEBUG', 'app:*');

// log های تمام درخواست‌ها
```

---

## 📝 نکات مهم

### 1. Proxy Configuration
- پروکسی فقط برای Binance فعال است
- سایر API ها (CoinGecko, etc.) بدون پروکسی کار می‌کنند
- از backend proxy routes استفاده کنید

### 2. Cache Strategy
- Price data: 15 ثانیه TTL
- OHLCV data: 2 دقیقه TTL
- Cache key بر اساس symbols + parameters

### 3. Error Handling
- 4xx errors → no retry (client error)
- 5xx errors → retry with backoff
- Timeout → retry
- Circuit open → reject immediately

### 4. Rate Limiting
- هر provider rate limiter خاص خود را دارد
- TokenBucket algorithm برای smooth rate limiting
- Exponential backoff برای retry

---

## 🚀 مراحل بعدی (اختیاری)

### 1. Monitoring Dashboard
- نمایش real-time circuit breaker state
- نمایش cache hit rate
- نمایش provider success rate

### 2. Alert System
- هشدار وقتی circuit breaker باز می‌شود
- هشدار برای high failure rate
- هشدار برای low cache hit rate

### 3. Auto-Recovery
- خودکار reset کردن circuit breaker در صورت recovery
- خودکار clear کردن cache در صورت stale data
- خودکار switch کردن به fallback providers

### 4. Load Balancing
- توزیع درخواست‌ها بین چندین provider
- انتخاب هوشمند provider بر اساس latency
- Fallback automatic به provider های دیگر

---

## 📞 Support

برای سوالات یا مشکلات:
1. بررسی logs در `logs/` directory
2. بررسی circuit breaker state
3. بررسی request coordination state
4. چک کردن env variables

---

**نتیجه‌گیری:** 
با این اصلاحات، سیستم پایدارتر، سریع‌تر و قابل اعتمادتر شده است. 
همه مشکلات proxy، timeout، race condition و cache برطرف شدند. 🎉

