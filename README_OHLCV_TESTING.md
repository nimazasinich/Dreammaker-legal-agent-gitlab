# راهنمای تست و بررسی داده‌های OHLCV

این راهنما نحوه استفاده از اسکریپت‌های تست برای بررسی صحت داده‌های OHLCV از APIهای مختلف را توضیح می‌دهد.

## 🚀 شروع سریع

### تست کامل (توصیه می‌شود)

```bash
npm run test:ohlcv
```

این دستور:
- تمام APIهای پیکربندی شده را تست می‌کند
- داده‌ها را اعتبارسنجی می‌کند
- گزارش جامع JSON تولید می‌کند
- نتایج را در کنسول نمایش می‌دهد

### تست ساده (برای بررسی سریع)

```bash
npm run test:ohlcv:simple
```

این دستور:
- تست‌های سریع روی endpointهای اصلی انجام می‌دهد
- خروجی خلاصه‌تر دارد
- برای بررسی اولیه مناسب است

## 📋 پیش‌نیازها

1. **سرور باید در حال اجرا باشد**:
   ```bash
   npm run dev:server
   # یا
   npm run start:server
   ```

2. **بررسی سلامت سرور**:
   ```bash
   curl http://localhost:8000/api/health
   ```

## 🔍 APIهای تست شده

### 1. CoinGecko
- **Endpoint**: `/api/proxy/coingecko/coins/bitcoin/ohlc`
- **داده مورد انتظار**: 30 روز داده روزانه
- **فرمت**: `[timestamp, open, high, low, close]`

### 2. Binance
- **Endpoint**: `/api/proxy/binance/klines`
- **داده مورد انتظار**: 365 روز داده روزانه
- **فرمت**: `[openTime, open, high, low, close, volume, ...]`

### 3. CryptoCompare
- **Endpoint**: `/api/market/cryptocompare-prices`
- **داده مورد انتظار**: 200 روز داده تاریخی
- **فرمت**: `{time, open, high, low, close, volumefrom, volumeto}`

### 4. CoinMarketCap
- **Endpoint**: `/api/market/coinmarketcap-prices`
- **نکته**: نسخه رایگان ممکن است داده تاریخی OHLCV نداشته باشد

### 5. KuCoin
- **Endpoint**: `/api/market/ohlcv`
- **داده مورد انتظار**: 200 روز داده روزانه
- **نیاز به**: API credentials (اختیاری)

## 📊 بررسی‌های انجام شده

برای هر API، اسکریپت موارد زیر را بررسی می‌کند:

✅ **کامل بودن داده‌ها**
- تعداد داده‌های دریافت شده با مقدار مورد انتظار مطابقت دارد
- هیچ داده‌ای از دست نرفته است

✅ **اعتبار داده‌ها**
- هیچ مقدار null یا undefined وجود ندارد
- روابط قیمتی صحیح است (high >= low, high >= open, etc.)
- حجم معاملات مثبت است

✅ **سازگاری داده‌ها**
- تایم‌استمپ‌ها متوالی هستند
- هیچ فاصله زمانی بزرگی وجود ندارد
- داده‌ها مرتب هستند

✅ **دقت داده‌ها**
- قیمت‌ها منطقی هستند
- حجم معاملات معتبر است
- داده‌ها به‌روز هستند

## 📁 خروجی

### گزارش JSON

گزارش کامل در فایل JSON ذخیره می‌شود:
```
cursor_reports/ohlcv-verification-{timestamp}.json
```

### ساختار گزارش

```json
{
  "timestamp": "2025-01-27T00:00:00.000Z",
  "totalApis": 5,
  "successfulApis": 4,
  "failedApis": 1,
  "results": [
    {
      "api": "CoinGecko",
      "success": true,
      "dataPoints": 30,
      "expectedDataPoints": 30,
      "missingDataPoints": 0,
      "errors": [],
      "warnings": [],
      "responseTime": 1234,
      "dataQuality": {
        "hasNulls": false,
        "hasGaps": false,
        "priceConsistency": true,
        "volumeConsistency": true
      },
      "sampleData": [...]
    }
  ],
  "summary": {
    "bestPerformer": "CoinGecko",
    "worstPerformer": "API_NAME",
    "averageResponseTime": 1500,
    "totalDataPoints": 795
  }
}
```

## 🛠️ استفاده پیشرفته

### تست با URL سفارشی

```bash
API_BASE_URL=http://localhost:8000 npm run test:ohlcv
```

### تست مستقیم APIها (بدون proxy)

اگر سرور در حال اجرا نیست، می‌توانید مستقیماً APIها را تست کنید:

```bash
# CoinGecko
curl "https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30"

# Binance
curl "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=365"

# CryptoCompare
curl "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=200"
```

### استفاده در CI/CD

می‌توانید این تست را در pipeline خود اضافه کنید:

```yaml
# .github/workflows/test.yml
- name: Test OHLCV Data
  run: npm run test:ohlcv
```

## 🔧 عیب‌یابی

### مشکل: سرور در حال اجرا نیست

```bash
# بررسی وضعیت
curl http://localhost:8000/api/health

# راه‌اندازی سرور
npm run dev:server
```

### مشکل: API key نامعتبر

```bash
# بررسی تنظیمات
cat config/api.json
cat config/providers_config.json

# اعتبارسنجی API keys
node scripts/validate-data-sources.js
```

### مشکل: timeout یا خطای شبکه

```bash
# تست اتصال به APIهای خارجی
curl -I https://api.coingecko.com/api/v3/ping
curl -I https://api.binance.com/api/v3/ping

# بررسی proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

### مشکل: داده ناقص

- بررسی rate limits API
- بررسی لاگ‌های سرور
- تست مستقیم endpoint با curl

## 📈 تفسیر نتایج

### ✅ موفق (Success)
- `success: true`
- `dataPoints >= expectedDataPoints * 0.95` (حداقل 95% داده)
- `errors.length === 0`
- `dataQuality` همه true

### ⚠️ هشدار (Warning)
- `success: true` اما `warnings.length > 0`
- `missingDataPoints > 0` اما کمتر از 10%
- مشکلات جزئی در کیفیت داده

### ❌ ناموفق (Failed)
- `success: false`
- `errors.length > 0`
- `dataPoints < expectedDataPoints * 0.5`
- مشکلات جدی در کیفیت داده

## 🎯 معیارهای موفقیت

تست موفق است اگر:
- ✅ حداقل 3 از 5 API موفق باشند
- ✅ CoinGecko و Binance حتماً موفق باشند
- ✅ میانگین response time کمتر از 5 ثانیه باشد
- ✅ هیچ خطای بحرانی وجود نداشته باشد
- ✅ حداقل 80% داده‌های مورد انتظار دریافت شود

## 📝 استفاده در Cursor

برای استفاده در Cursor:

1. فایل `CURSOR_PROMPT_OHLCV_VERIFICATION.md` را باز کنید
2. محتوای آن را به Cursor بدهید
3. از Cursor بخواهید تست را اجرا کند:
   ```
   Please run the OHLCV verification test: npm run test:ohlcv
   ```

یا مستقیماً دستور را اجرا کنید:
```bash
npm run test:ohlcv
```

## 🔄 تست منظم

توصیه می‌شود این تست را به صورت منظم اجرا کنید:

- **روزانه**: برای بررسی سلامت APIها
- **قبل از deploy**: برای اطمینان از صحت داده‌ها
- **بعد از تغییرات**: برای اطمینان از عدم شکستن چیزی

می‌توانید یک cron job اضافه کنید:

```bash
# هر روز ساعت 2 صبح
0 2 * * * cd /path/to/project && npm run test:ohlcv >> logs/ohlcv-test.log 2>&1
```

## 📚 منابع بیشتر

- [گزارش تحلیل داده‌ها](./DATA_RETRIEVAL_ANALYSIS_REPORT.json)
- [راهنمای تست داده‌ها](./README_DATA_RETRIEVAL.md)
- [پرامپت Cursor](./CURSOR_PROMPT_OHLCV_VERIFICATION.md)

## 💡 نکات

1. **Rate Limiting**: برخی APIها محدودیت درخواست دارند، بین تست‌ها فاصله بگذارید
2. **API Keys**: برای APIهای premium، کلیدهای معتبر لازم است
3. **Network**: اطمینان حاصل کنید که دسترسی به اینترنت دارید
4. **Cache**: اگر داده‌های قدیمی می‌بینید، cache را پاک کنید

## 🆘 پشتیبانی

اگر مشکلی پیش آمد:
1. لاگ‌های سرور را بررسی کنید
2. گزارش JSON را بررسی کنید
3. تست‌های دستی با curl انجام دهید
4. تنظیمات API را بررسی کنید

---

**نکته**: این تست‌ها برای اطمینان از صحت و کامل بودن داده‌های OHLCV طراحی شده‌اند. اجرای منظم آن‌ها به حفظ کیفیت داده‌ها کمک می‌کند.
