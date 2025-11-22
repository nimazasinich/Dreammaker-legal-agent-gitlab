# 🧪 ماژول تست API - راهنمای سریع

> یک ماژول قدرتمند برای تست خودکار API با قابلیت‌های پیشرفته

## 🎯 هدف

این ماژول برای **جلوگیری از بازگشت خطاها** و **اطمینان از صحت عملکرد API‌ها** طراحی شده است.

## ⚡ شروع سریع

### 1. نصب

```bash
npm install
```

### 2. اجرای سرور

```bash
npm run dev:server
```

### 3. اجرای تست‌ها

```bash
# تست تمام API‌ها
npm run test:api

# تست Market API
npm run test:api:market

# تست Performance
npm run test:api:performance
```

## 📋 دستورات موجود

| دستور | توضیح |
|-------|-------|
| `npm run test:api` | اجرای تمام تست‌ها |
| `npm run test:api:market` | تست Market API |
| `npm run test:api:integration` | تست‌های یکپارچه‌سازی |
| `npm run test:api:performance` | تست Performance |
| `npm run test:api:security` | تست Security |
| `npm run test:api:concurrent` | تست 20 درخواست همزمان |
| `npm run test:api:load` | تست Load (10 req/s) |
| `npm run test:api:report` | تولید گزارش کامل |

## 🎨 ویژگی‌ها

✅ **تست خودکار** - اجرای خودکار با Retry هوشمند
✅ **اعتبارسنجی** - Schema و Type Validation
✅ **مدیریت خطا** - Error Handling پیشرفته
✅ **Performance** - Load و Concurrent Testing
✅ **Security** - SQL Injection و XSS Prevention
✅ **گزارش‌دهی** - JSON, Markdown, Console
✅ **CLI Tool** - اجرای آسان از خط فرمان
✅ **مستندات** - راهنمای کامل فارسی

## 📚 مستندات

- 📖 **[راهنمای کامل](docs/API_TESTING_GUIDE.md)** - مستندات جامع
- 📖 **[راهنمای سریع](src/testing/README.md)** - شروع سریع
- 📖 **[Quick Start](QUICK_START_API_TESTING.md)** - نصب در 3 دقیقه
- 💻 **[مثال‌های عملی](examples/api-testing-example.ts)** - 9 مثال

## 🔧 استفاده در کد

```typescript
import { APITestFramework } from './src/testing';

const framework = new APITestFramework({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  retries: 3,
});

const result = await framework.runTest({
  name: 'Health Check',
  method: 'GET',
  endpoint: '/api/health',
  expectedStatus: 200,
});

console.log(result.passed ? '✅ موفق' : '❌ ناموفق');
```

## 🎯 موارد استفاده

### 1. تست قبل از انتشار

```bash
npm run test:api:report
```

### 2. تست در CI/CD

```yaml
- name: Run API Tests
  run: npm run test:api
```

### 3. مانیتورینگ سلامت

```bash
npm run test:api:market
```

### 4. تست Performance

```bash
npm run test:api:load
```

## 📊 مثال خروجی

```
🧪 Running Test Suite: Market API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ▶ Health Check - API is running...
    ✅ PASSED (45ms)

  ▶ Get Market Prices - Multiple symbols...
    ✅ PASSED (234ms)

  ▶ Get Single Symbol Price - BTC...
    ✅ PASSED (189ms)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Test Suite Results:
   Total: 10
   ✅ Passed: 10
   ❌ Failed: 0
   ⏭️  Skipped: 0
   ⏱️  Duration: 1234ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🛠️ ساختار فایل‌ها

```
src/testing/
├── api-test-framework.ts    # چارچوب اصلی
├── request-validator.ts      # اعتبارسنجی
├── integration-tests.ts      # تست‌های یکپارچه
├── market-api.test.ts        # تست Market
├── cli.ts                    # ابزار CLI
├── index.ts                  # Exports
└── __tests__/               # Unit Tests
```

## 🔐 امنیت

ماژول شامل ویژگی‌های امنیتی:

- ✅ Input Sanitization
- ✅ SQL Injection Prevention
- ✅ XSS Prevention
- ✅ Rate Limiting Tests

```typescript
import { RequestValidator } from './src/testing';

const clean = RequestValidator.sanitizeInput(userInput);
```

## 📈 Performance Testing

```bash
# تست 50 درخواست همزمان
tsx src/testing/cli.ts concurrent 50

# تست 20 درخواست در ثانیه به مدت 30 ثانیه
tsx src/testing/cli.ts load 20 30
```

## 🐛 رفع مشکلات

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

## 🤝 مشارکت

برای مشارکت:

1. تست‌های جدید اضافه کنید
2. مستندات را بهبود دهید
3. Bug Report ارسال کنید
4. Feature Request ارائه دهید

## 📞 پشتیبانی

- 📖 مستندات کامل: `docs/API_TESTING_GUIDE.md`
- 💻 مثال‌ها: `examples/api-testing-example.ts`
- 🐛 گزارش مشکل: ایجاد Issue

## 📝 لایسنس

Unlicense - استفاده آزاد

---

## ✅ وضعیت

**نسخه**: 1.0.0
**وضعیت**: ✅ آماده استفاده در Production
**تاریخ**: 2025-11-10

---

**برای اطلاعات بیشتر، فایل‌های زیر را مطالعه کنید:**

- 📄 [API_TESTING_COMPLETE.md](API_TESTING_COMPLETE.md) - خلاصه کامل
- 📄 [API_TESTING_MODULE_SUMMARY.md](API_TESTING_MODULE_SUMMARY.md) - خلاصه ماژول
- 📄 [QUICK_START_API_TESTING.md](QUICK_START_API_TESTING.md) - شروع سریع

---

**ساخته شده با ❤️ برای DreamMaker Crypto Trader**

