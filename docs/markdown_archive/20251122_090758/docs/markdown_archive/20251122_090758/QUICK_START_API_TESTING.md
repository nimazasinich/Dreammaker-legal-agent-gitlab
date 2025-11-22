# 🚀 شروع سریع - ماژول تست API

## نصب و اجرا در 3 دقیقه

### گام 1: نصب وابستگی‌ها

```bash
npm install
```

### گام 2: اجرای سرور (در ترمینال جداگانه)

```bash
npm run dev:server
```

### گام 3: اجرای تست‌ها

```bash
# تست تمام endpoint‌ها
npm run test:api

# یا فقط Market API
npm run test:api:market
```

---

## دستورات سریع

```bash
# تست‌های مختلف
npm run test:api              # همه تست‌ها
npm run test:api:market       # Market API
npm run test:api:performance  # Performance
npm run test:api:security     # Security

# تست‌های پیشرفته
npm run test:api:concurrent   # 20 درخواست همزمان
npm run test:api:load         # Load testing

# تولید گزارش
npm run test:api:report       # گزارش کامل
```

---

## مثال سریع در کد

### 1. تست ساده

```typescript
import { APITestFramework } from './src/testing';

const framework = new APITestFramework({
  baseURL: 'http://localhost:3001',
});

const result = await framework.runTest({
  name: 'Health Check',
  method: 'GET',
  endpoint: '/api/health',
  expectedStatus: 200,
});

console.log(result.passed ? '✅ موفق' : '❌ ناموفق');
```

### 2. اعتبارسنجی ورودی

```typescript
import { RequestValidator, CommonSchemas } from './src/testing';

const data = { symbols: 'BTC,ETH' };
const result = RequestValidator.validate(data, CommonSchemas.marketPriceRequest);

if (!result.valid) {
  console.error('خطاها:', result.errors);
}
```

### 3. تست یکپارچه

```typescript
import { IntegrationTestRunner } from './src/testing';

const runner = new IntegrationTestRunner();
const results = await runner.runAllTests();

console.log(`موفق: ${results[0].passed}, ناموفق: ${results[0].failed}`);
```

---

## اجرای مثال‌های عملی

```bash
tsx examples/api-testing-example.ts
```

---

## استفاده با CLI

```bash
# راهنما
tsx src/testing/cli.ts help

# تست با آدرس سفارشی
tsx src/testing/cli.ts all --base-url http://localhost:8001

# ذخیره گزارش
tsx src/testing/cli.ts market --output ./reports --format json
```

---

## پیکربندی سریع

فایل `.env` ایجاد کنید:

```env
API_BASE_URL=http://localhost:3001
```

---

## مستندات کامل

- 📖 [راهنمای کامل فارسی](docs/API_TESTING_GUIDE.md)
- 📖 [راهنمای سریع](src/testing/README.md)
- 📖 [خلاصه ماژول](API_TESTING_MODULE_SUMMARY.md)

---

## نکات مهم

### ✅ انجام دهید

```typescript
// تست با اعتبارسنجی کامل
{
  name: 'Get Prices',
  method: 'GET',
  endpoint: '/api/market/prices',
  params: { symbols: 'BTC,ETH' },
  expectedStatus: 200,
  validateResponse: (res) => res.data.BTC > 0,
}
```

### ❌ انجام ندهید

```typescript
// تست بدون اعتبارسنجی
{
  name: 'Test',
  method: 'GET',
  endpoint: '/api/data',
}
```

---

## رفع مشکلات سریع

### خطای Connection Refused

```bash
# مطمئن شوید سرور در حال اجرا است
npm run dev:server
```

### خطای Timeout

```typescript
// Timeout را افزایش دهید
const framework = new APITestFramework({
  baseURL: 'http://localhost:3001',
  timeout: 30000, // 30 ثانیه
});
```

### خطای Module Not Found

```bash
# وابستگی‌ها را دوباره نصب کنید
npm install
```

---

## ویژگی‌های کلیدی

✅ **تست خودکار** با Retry هوشمند
✅ **اعتبارسنجی پیشرفته** Request و Response
✅ **مدیریت خطا** با گزارش‌دهی جامع
✅ **Performance Testing** و Load Testing
✅ **Security Testing** و Input Sanitization
✅ **CLI Tool** برای اجرای آسان
✅ **گزارش‌های JSON و Markdown**
✅ **مستندات کامل فارسی**

---

## پشتیبانی

برای راهنمایی بیشتر:

1. مستندات کامل را مطالعه کنید
2. مثال‌های عملی را اجرا کنید
3. Issue ایجاد کنید

---

**آماده برای استفاده در Production** ✅

