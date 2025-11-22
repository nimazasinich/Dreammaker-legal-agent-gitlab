# 🚀 راهنمای سریع اجرای پروژه

## یک کلیک - اجرای کامل

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File start-all.ps1
```

یا دابل کلیک روی فایل `start-all.ps1`

### اسکریپت چه کاری انجام می‌دهد؟

1. ✅ بررسی و نصب وابستگی‌ها (`node_modules`)
2. ✅ بررسی و آزاد کردن پورت‌های 3001 و 5173
3. ✅ شروع Backend (پورت 3001)
4. ✅ تست سلامت Backend
5. ✅ شروع Frontend (پورت 5173)
6. ✅ باز کردن خودکار مرورگر
7. ✅ نمایش لاگ‌های زنده

### لینک‌های دسترسی

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/health
- **Resource Monitor**: http://localhost:3001/api/resources/stats
- **Hugging Face**: http://localhost:3001/api/hf/health

### توقف پروژه

- بستن پنجره PowerShell
- یا فشردن `Ctrl+C`

## اجرای دستی (در صورت نیاز)

### Backend
```bash
npm run dev:server
```

### Frontend
```bash
npm run dev:client
```

### هر دو با هم
```bash
npm run dev
```

## تغییرات اخیر

### ✅ اصلاحات انجام شده:
1. **اضافه شدن import `HFOHLCVService`** در `MultiProviderMarketDataService.ts`
2. **سیستم نظارت منابع** - `ResourceMonitorService`
3. **اولویت‌بندی هوشمند API providers**
4. **غیرفعال کردن CoinMarketCap** (ظرفیت محدود)
5. **کاهش حجم داده‌های بارگذاری** (از 8 به 3 symbol)
6. **افزایش بازه refresh** (از 30 به 60 ثانیه)
7. **توکن Hugging Face به‌روزرسانی شد**

### 📊 API Endpoints جدید:
- `GET /api/resources/stats` - آمار منابع
- `GET /api/resources/providers` - لیست پیشنهادی providers
- `GET /api/resources/provider/:name` - سلامت یک provider
- `GET /api/resources/cache-efficiency` - کارایی cache

## عیب‌یابی

### Backend شروع نمی‌شود
```powershell
# بررسی لاگ‌ها
npm run dev:server

# بررسی پورت 3001
netstat -ano | findstr :3001
```

### Frontend شروع نمی‌شود
```powershell
# بررسی لاگ‌ها
npm run dev:client

# بررسی پورت 5173
netstat -ano | findstr :5173
```

### خطای import
```powershell
# پاک کردن node_modules و نصب مجدد
Remove-Item -Recurse -Force node_modules
npm install
```

## پیکربندی

### فایل `.env`
```env
PORT=3001
VITE_API_BASE=http://localhost:3001/api
VITE_WS_BASE=http://localhost:3001
HF_TOKEN=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
ENABLE_CMC=false
```

## پشتیبانی

در صورت بروز مشکل:
1. بررسی لاگ‌های Backend و Frontend
2. بررسی فایل `.env`
3. اطمینان از نصب صحیح `node_modules`
4. بررسی آزاد بودن پورت‌ها

---

**نسخه**: 1.0.0  
**آخرین به‌روزرسانی**: 2025-11-10

