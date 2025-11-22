# دستورالعمل Restart Frontend

## 🔴 مشکل فعلی

WebSocket هنوز به `/ws/ws` متصل می‌شود به جای `/ws`

## ✅ راه‌حل اعمال شده

### 1. اصلاح فایل‌های `.env`
- ✅ `.env.local`: `VITE_WS_BASE=ws://localhost:3001` (بدون `/ws`)
- ✅ `.env`: `VITE_WS_BASE=ws://localhost:3001` (بدون `/ws`)

### 2. اضافه کردن endpoint گم‌شده
- ✅ `/hf/ohlcv` endpoint به سرور اضافه شد

## 🔄 مراحل Restart Frontend

### روش 1: Restart کامل (توصیه می‌شود)

#### در terminal که `npm run dev:client` یا `npm run dev` اجرا شده:

1. **متوقف کردن Vite**:
   ```
   Ctrl + C
   ```

2. **پاک کردن cache Vite**:
   ```powershell
   Remove-Item -Path "node_modules/.vite" -Recurse -Force -ErrorAction SilentlyContinue
   ```

3. **راه‌اندازی مجدد**:
   ```powershell
   npm run dev:client
   ```

### روش 2: Hard Refresh مرورگر (سریع‌تر)

1. **در مرورگر**:
   - Chrome/Edge: `Ctrl + Shift + R` یا `Ctrl + F5`
   - Firefox: `Ctrl + Shift + R`

2. **اگر کار نکرد، Clear Cache**:
   - Chrome: F12 > Application > Clear storage > Clear site data
   - Firefox: F12 > Storage > Clear All

3. **سپس Reload**:
   - `F5` یا `Ctrl + R`

### روش 3: Restart کامل (اگر روش‌های بالا کار نکردند)

```powershell
# 1. متوقف کردن همه process های node
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. پاک کردن cache
Remove-Item -Path "node_modules/.vite" -Recurse -Force -ErrorAction SilentlyContinue

# 3. راه‌اندازی مجدد سرور
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD' ; `$env:PORT=3001 ; npx tsx watch --clear-screen=false src/server-real-data.ts"

# 4. صبر کنید 5 ثانیه
Start-Sleep -Seconds 5

# 5. راه‌اندازی frontend
npm run dev:client
```

## 🧪 بررسی نهایی

پس از restart، در Console مرورگر باید ببینید:

### ✅ صحیح:
```
WebSocket connection to 'ws://localhost:3001/ws'
✅ WebSocket connected successfully
```

### ❌ اشتباه (قبل از restart):
```
WebSocket connection to 'ws://localhost:3001/ws/ws' failed
```

## 📋 چک‌لیست

- [x] `.env.local` اصلاح شد: `VITE_WS_BASE=ws://localhost:3001`
- [x] `.env` اصلاح شد: `VITE_WS_BASE=ws://localhost:3001`
- [x] `/hf/ohlcv` endpoint به سرور اضافه شد
- [ ] Frontend را restart کنید
- [ ] مرورگر را Hard Refresh کنید
- [ ] Console را بررسی کنید (باید `/ws` باشد نه `/ws/ws`)

## 💡 نکات مهم

### چرا نیاز به Restart است؟

Vite متغیرهای محیطی (`.env`) را فقط در **startup** می‌خواند. تغییرات `.env` بدون restart اعمال نمی‌شوند.

### چگونه مطمئن شویم که کار کرد؟

1. **Console مرورگر**: باید `ws://localhost:3001/ws` ببینید (نه `/ws/ws`)
2. **Network tab**: WebSocket connection باید status 101 (Switching Protocols) داشته باشد
3. **خطاها**: نباید "Unexpected response code: 400" ببینید

### اگر هنوز `/ws/ws` است:

1. مطمئن شوید Vite را restart کردید (نه فقط refresh مرورگر)
2. Cache Vite را پاک کنید: `node_modules/.vite`
3. Cache مرورگر را پاک کنید
4. مرورگر را ببندید و دوباره باز کنید

## 🎯 نتیجه مورد انتظار

پس از restart:

```javascript
// در Console مرورگر:
✅ WebSocket connected successfully
✅ Connected to: ws://localhost:3001/ws

// در Network tab:
✅ ws://localhost:3001/ws - Status: 101 Switching Protocols

// خطاهای قبلی:
❌ دیگر نباید ببینید:
   - WebSocket connection to 'ws://localhost:3001/ws/ws' failed
   - GET http://localhost:3001/hf/ohlcv 404 (Not Found)
   - CORS policy errors
```

## 🚀 دستور سریع

اگر عجله دارید، فقط این را اجرا کنید:

```powershell
# در terminal که Vite اجرا شده:
# 1. Ctrl + C (متوقف کردن Vite)
# 2. سپس:
Remove-Item -Path "node_modules/.vite" -Recurse -Force -ErrorAction SilentlyContinue ; npm run dev:client
```

سپس در مرورگر: `Ctrl + Shift + R`

---

**آخرین بروزرسانی**: تمام تغییرات Backend اعمال شدند ✅  
**اقدام بعدی**: Restart Frontend 🔄  
**زمان تخمینی**: 30 ثانیه ⏱️

