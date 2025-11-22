# 🚀 راهنمای سریع: فعال‌سازی حالت ONLINE (واقعی)

## گام 1: دریافت API Keys (رایگان)

### 1️⃣ CoinMarketCap (ضروری)
**چرا؟** قیمت‌های واقعی crypto

1. برو به: https://coinmarketcap.com/api/
2. کلیک روی **"GET YOUR FREE API KEY NOW"**
3. ثبت‌نام کن (با ایمیل)
4. API Key رو کپی کن

**محدودیت رایگان:** 10,000 calls/ماه (333/روز) ✅

---

### 2️⃣ CryptoCompare (ضروری)
**چرا؟** داده‌های تاریخی و نمودارها

1. برو به: https://www.cryptocompare.com/cryptopian/api-keys
2. ثبت‌نام کن
3. **"Create API Key"** → کپی کن

**محدودیت رایگان:** 100,000 calls/ماه ✅

---

### 3️⃣ NewsAPI (پیشنهادی)
**چرا؟** اخبار واقعی crypto

1. برو به: https://newsapi.org/register
2. ثبت‌نام کن
3. API Key رو کپی کن

**محدودیت رایگان:** 100 requests/روز ✅

---

### 4️⃣ Binance (اختیاری - فقط برای قیمت‌های بیشتر)
**⚠️ هشدار:** فقط برای READ، نه TRADE!

1. برو به: https://www.binance.com/en/my/settings/api-management
2. **"Create API"**
3. Label: `ReadOnly-HF`
4. **فقط "Enable Reading" رو تیک بزن** (نه Trade!)
5. API Key + Secret رو کپی کن

**توصیه:** IP Restriction فعال کن

---

### 5️⃣ Hugging Face Token (اختیاری)
**چرا؟** برای ML models

1. برو به: https://huggingface.co/settings/tokens
2. **"New token"**
3. Role: Read
4. کپی کن (با `hf_` شروع میشه)

---

## گام 2: تنظیم در Hugging Face Spaces

### باز کردن تنظیمات

1. برو به Space خودت:
   ```
   https://huggingface.co/spaces/Really-amin/DreammakerCryptoSignalAndTrader/settings
   ```

2. پایین بیا تا بخش **"Variables and secrets"**

---

### اضافه کردن Environment Variables

برای هر یک از موارد زیر:
1. کلیک روی **"New secret"**
2. Name و Value رو وارد کن
3. **Save** کن

---

## 📋 لیست متغیرها (کپی-پیست کن)

### **حالت برنامه (حتماً)**
```
Name: VITE_APP_MODE
Value: ONLINE
```

```
Name: APP_MODE
Value: ONLINE
```

```
Name: NODE_ENV
Value: production
```

```
Name: VITE_STRICT_REAL_DATA
Value: true
```

---

### **API Keys اصلی**

**CoinMarketCap:**
```
Name: CMC_API_KEY
Value: [API key که گرفتی]
```

**CryptoCompare:**
```
Name: CRYPTOCOMPARE_KEY
Value: [API key که گرفتی]
```

**NewsAPI (اختیاری):**
```
Name: NEWS_API_KEY
Value: [API key که گرفتی]
```

---

### **Binance (اختیاری - فقط اگه گرفتی):**
```
Name: BINANCE_API_KEY
Value: [API key]
```

```
Name: BINANCE_SECRET_KEY
Value: [Secret key]
```

---

### **Hugging Face (اختیاری):**
```
Name: HUGGINGFACE_API_KEY
Value: [token که با hf_ شروع میشه]
```

```
Name: HF_TOKEN
Value: [همون token]
```

---

### **تنظیمات امنیتی (مهم!)**

```
Name: ENABLE_REAL_TRADING
Value: false
```
**⚠️ خیلی مهم: همیشه false بذار!**

```
Name: FEATURE_FUTURES
Value: false
```

```
Name: ENABLE_ML_SERVICE
Value: false
```

```
Name: DISABLE_REDIS
Value: true
```

---

## گام 3: Rebuild کردن Space

### روش 1: Factory Reboot (سریع‌تر)

1. همون صفحه Settings
2. پایین‌ترین بخش: **"Factory reboot"**
3. کلیک روی **"Reboot this Space"**
4. تأیید کن

### روش 2: Push جدید

فایل README رو یکم تغییر بده و push کن:
```bash
git commit --allow-empty -m "Trigger rebuild"
git push
```

---

## گام 4: منتظر Build بمون

Build حدود **10-15 دقیقه** طول میکشه.

**چک کردن پیشرفت:**
https://huggingface.co/spaces/Really-amin/DreammakerCryptoSignalAndTrader/logs

**چیزهایی که باید ببینی:**
```
✅ nginx نصب شد
✅ supervisor نصب شد
✅ Build frontend موفق
✅ Build backend موفق
✅ Container شروع شد
```

---

## گام 5: تست برنامه

### دسترسی به برنامه:
```
https://Really-amin-DreammakerCryptoSignalAndTrader.hf.space
```

### چک کردن Health:
```
https://Really-amin-DreammakerCryptoSignalAndTrader.hf.space/api/health
```

**باید ببینی:**
```json
{
  "status": "ok",
  "mode": "ONLINE",
  "timestamp": "...",
  "providers": {
    "coinmarketcap": "connected",
    "cryptocompare": "connected"
  }
}
```

---

## 🎯 چک‌لیست نهایی

قبل از استفاده، مطمئن شو:

- ✅ `VITE_APP_MODE=ONLINE` تنظیم شده
- ✅ `CMC_API_KEY` اضافه شده
- ✅ `CRYPTOCOMPARE_KEY` اضافه شده
- ✅ `ENABLE_REAL_TRADING=false` هست
- ✅ Space rebuild شده
- ✅ Build موفق بوده
- ✅ Health endpoint جواب میده
- ✅ قیمت‌ها واقعی هستن

---

## 🐛 عیب‌یابی

### قیمت‌ها واقعی نیستن؟
1. Settings رو چک کن → `VITE_APP_MODE` باید `ONLINE` باشه
2. Factory reboot کن
3. Cache مرورگر رو پاک کن (Ctrl+Shift+R)

### ارور 401 Unauthorized؟
1. API key رو دوباره چک کن
2. مطمئن شو به عنوان **Secret** (نه Variable) اضافه کردی
3. Space رو reboot کن

### Build شکست میخوره؟
1. Logs رو چک کن
2. مطمئن شو Space SDK روی **Docker** هست
3. از آخرین commit استفاده کن (a7c9b06)

### برنامه اصلاً load نمیشه؟
1. منتظر بمون تا build کامل بشه (15 دقیقه)
2. Logs رو برای ارور چک کن
3. Health endpoint رو امتحان کن

---

## ⚠️ نکات امنیتی

### ✅ انجام بده:
- Space رو **Private** نگه دار
- فقط API keys ضروری رو اضافه کن
- API keys رو دوره‌ای تغییر بده
- Binance رو فقط **Read-only** کن
- IP Whitelist فعال کن

### ❌ انجام نده:
- `ENABLE_REAL_TRADING=true` نذار
- API keys رو share نکن
- با پول واقعی زیاد test نکن
- Space رو Public نکن اگه API key واقعی داری

---

## 💰 هزینه‌ها (همه رایگان!)

- ✅ CoinMarketCap: رایگان
- ✅ CryptoCompare: رایگان
- ✅ NewsAPI: رایگان
- ✅ Hugging Face Spaces (CPU): رایگان
- ✅ Binance (بدون معامله): رایگان

**جمع کل: 0 تومان!** 🎉

---

## 📞 کمک

اگه مشکلی داشتی:
1. Logs رو چک کن
2. این فایل رو دوباره بخون
3. Health endpoint رو test کن
4. Issue باز کن در GitHub

---

## ✅ آماده‌ای؟

1. API Keys رو بگیر (15 دقیقه)
2. در Hugging Face تنظیم کن (5 دقیقه)
3. Reboot کن (15 دقیقه build)
4. استفاده کن! 🚀

**موفق باشی!** 💪
