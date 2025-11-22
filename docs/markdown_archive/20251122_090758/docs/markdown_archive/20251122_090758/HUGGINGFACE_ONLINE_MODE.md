# راهنمای فعال‌سازی حالت واقعی (ONLINE) در Hugging Face Spaces

## 🎯 تفاوت حالت‌های مختلف

### DEMO Mode (پیش‌فرض)
- ✅ داده‌های نمونه و Mock
- ✅ بدون نیاز به API Key
- ✅ مصرف منابع کم
- ❌ قیمت‌ها واقعی نیستن

### ONLINE Mode (واقعی)
- ✅ قیمت‌های واقعی لحظه‌ای
- ✅ داده‌های بازار واقعی
- ✅ اخبار و تحلیل‌های واقعی
- ✅ قابلیت معامله واقعی
- ⚠️ نیاز به API Keys
- ⚠️ مصرف منابع بیشتر

---

## 🔑 API Keys مورد نیاز

### حداقل برای شروع (رایگان)

#### 1. CoinMarketCap API
**چرا؟** قیمت‌های واقعی ارزها

**دریافت:**
1. برو به https://coinmarketcap.com/api/
2. ثبت‌نام کن (رایگان)
3. API Key بگیر

**محدودیت رایگان:**
- 10,000 calls/ماه
- 333 calls/روز
- برای استفاده شخصی کافیه

**متغیر:**
```
COINMARKETCAP_API_KEY=your_key_here
```

---

#### 2. CryptoCompare API
**چرا؟** داده‌های تاریخی، نمودارها، آمار بازار

**دریافت:**
1. برو به https://www.cryptocompare.com/cryptopian/api-keys
2. ثبت‌نام کن
3. Create API Key

**محدودیت رایگان:**
- 100,000 calls/ماه
- Real-time data
- Historical data

**متغیر:**
```
CRYPTOCOMPARE_API_KEY=your_key_here
```

---

### اختیاری - برای ویژگی‌های پیشرفته

#### 3. News API
**چرا؟** اخبار crypto واقعی

**دریافت:**
1. برو به https://newsapi.org/register
2. ثبت‌نام کن

**محدودیت رایگان:**
- 100 requests/روز
- دسترسی به اخبار 1 ماه گذشته

**متغیر:**
```
NEWS_API_KEY=your_key_here
```

---

#### 4. Binance API (فقط برای معامله)
**⚠️ هشدار:** فقط اگه می‌خوای معاملات واقعی انجام بدی!

**دریافت:**
1. برو به https://www.binance.com/en/my/settings/api-management
2. Create API
3. **مهم:** فقط دسترسی "Read" رو فعال کن (نه Trade)
4. IP whitelist تنظیم کن

**متغیرها:**
```
BINANCE_API_KEY=your_key_here
BINANCE_API_SECRET=your_secret_here
```

---

#### 5. KuCoin API (فقط برای Futures)
**⚠️ هشدار:** خطرناک! فقط برای تست با مبالغ کم

**دریافت:**
1. برو به https://www.kucoin.com/account/api
2. Create API
3. تنظیم Passphrase

**متغیرها:**
```
KUCOIN_API_KEY=your_key_here
KUCOIN_API_SECRET=your_secret_here
KUCOIN_API_PASSPHRASE=your_passphrase_here
```

---

## ⚙️ نحوه تنظیم در Hugging Face Spaces

### مرحله 1: باز کردن Settings

1. برو به Space خودت:
   ```
   https://huggingface.co/spaces/Really-amin/DreammakerCryptoSignalAndTrader/settings
   ```

2. پایین بیا تا **"Variables and secrets"**

### مرحله 2: اضافه کردن Secrets

برای هر API Key:
1. کلیک روی **"New secret"**
2. **Name:** نام متغیر (مثل `COINMARKETCAP_API_KEY`)
3. **Value:** مقدار API Key
4. کلیک روی **"Save"**

### مرحله 3: تنظیمات اصلی

**این متغیرها رو حتماً اضافه کن:**

```bash
# حالت برنامه (ONLINE برای واقعی)
VITE_APP_MODE=ONLINE

# محیط (همیشه production)
NODE_ENV=production

# فعال‌سازی ویژگی‌ها
ENABLE_ML_SERVICE=false        # ML سنگینه، توصیه نمیشه
ENABLE_REDIS=false             # Redis در free tier نیست
ENABLE_TELEGRAM=false          # فعلاً غیرفعال
ENABLE_REAL_TRADING=false      # خیلی مهم: false بذار!
```

### مرحله 4: Rebuild Space

**روش 1: Factory Reboot**
1. Settings → پایین صفحه
2. کلیک روی **"Factory reboot"**

**روش 2: Push جدید**
1. یه تغییر کوچیک بزن
2. Git push کن
3. خودکار rebuild میشه

---

## 📊 پیکربندی‌های پیشنهادی

### برای استفاده شخصی (فقط مشاهده):
```bash
VITE_APP_MODE=ONLINE
NODE_ENV=production

COINMARKETCAP_API_KEY=your_key
CRYPTOCOMPARE_API_KEY=your_key

ENABLE_REAL_TRADING=false      # غیرفعال
ENABLE_ML_SERVICE=false
ENABLE_REDIS=false
```

### برای تست معاملات (خیلی محتاطانه):
```bash
VITE_APP_MODE=ONLINE
NODE_ENV=production

COINMARKETCAP_API_KEY=your_key
CRYPTOCOMPARE_API_KEY=your_key
BINANCE_API_KEY=your_key       # فقط Read permission
BINANCE_API_SECRET=your_secret

ENABLE_REAL_TRADING=false      # حتماً false!
ENABLE_ML_SERVICE=false
```

---

## 🔒 نکات امنیتی

### ✅ انجام بده:
- همیشه از Repository Secrets استفاده کن (نه Variables)
- Space رو **Private** نگه دار
- برای Binance فقط دسترسی Read بده
- IP Whitelist تنظیم کن
- API Keys رو دوره‌ای عوض کن
- `ENABLE_REAL_TRADING=false` بذار

### ❌ انجام نده:
- API Keys رو commit نکن
- Space رو Public نذار اگه API key واقعی داری
- بدون تست معامله واقعی نکن
- همه پولت رو روی یه معامله نذار
- به botهای ناشناس API key نده

---

## 🧪 تست بعد از راه‌اندازی

### 1. چک کردن Health
```
https://Really-amin-DreammakerCryptoSignalAndTrader.hf.space/api/health
```

باید ببینی:
```json
{
  "status": "ok",
  "mode": "ONLINE",
  "providers": {
    "coinmarketcap": "connected",
    "cryptocompare": "connected"
  }
}
```

### 2. چک کردن قیمت‌ها
برو به صفحه Markets و ببین قیمت‌ها واقعی هستن.

### 3. چک کردن Logs
```
https://huggingface.co/spaces/Really-amin/DreammakerCryptoSignalAndTrader/logs
```

اگه ارور API authentication دیدی، یعنی key اشتباهه.

---

## 🐛 عیب‌یابی

### قیمت‌ها واقعی نیستن؟
✅ چک کن `VITE_APP_MODE=ONLINE` تنظیم شده
✅ Space رو reboot کن
✅ Cache browser رو پاک کن

### ارور 401 Unauthorized؟
✅ API key رو دوباره چک کن
✅ مطمئن شو Space ها رو به عنوان Secret (نه Variable) اضافه کردی
✅ API key رو از سایت مربوطه تست کن

### ارور Rate Limit؟
✅ منتظر بمون تا limit reset بشه
✅ از چند API provider استفاده کن
✅ DEMO mode رو موقتاً فعال کن

---

## 💰 هزینه‌ها

### API Keys (همه رایگان)
- ✅ CoinMarketCap: رایگان (10K/ماه)
- ✅ CryptoCompare: رایگان (100K/ماه)
- ✅ News API: رایگان (100/روز)

### Hugging Face Spaces
- ✅ CPU Basic: رایگان
- ⚠️ GPU/بیشتر: پولی

### معاملات
- ⚠️ Binance/KuCoin: کارمزد معاملاتی (معمولاً 0.1%)
- ⚠️ ریسک از دست دادن سرمایه!

---

## 📚 منابع

- [CoinMarketCap API Docs](https://coinmarketcap.com/api/documentation/)
- [CryptoCompare API Docs](https://min-api.cryptocompare.com/documentation)
- [Binance API Docs](https://binance-docs.github.io/apidocs/)
- [Hugging Face Spaces Docs](https://huggingface.co/docs/hub/spaces)

---

## ⚠️ تذکر مهم

این پلتفرم برای آموزش و تحلیل طراحی شده. معاملات crypto ریسک بالایی دارن و ممکنه تمام سرمایت رو از دست بدی.

**هرگز:**
- با پول قرض معامله نکن
- بیشتر از اونچه می‌تونی از دست بدی سرمایه‌گذاری نکن
- بدون تحقیق معامله نکن
- به هیچ سیگنال یا ربات 100% اعتماد نکن

---

✅ **آماده‌ای؟** API Keys رو بگیر و تنظیم کن!
