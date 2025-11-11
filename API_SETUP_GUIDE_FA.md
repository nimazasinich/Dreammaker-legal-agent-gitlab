# 🔑 راهنمای کامل پیکربندی API Keys

این راهنما به شما کمک می‌کند تا تمام کلیدهای API مورد نیاز را برای فعال‌سازی کامل پروژه DreammakerCryptoSignalAndTrader پیکربندی کنید.

---

## 📊 وضعیت فعلی APIها

### ✅ APIهای فعال (کار می‌کنند)
1. **CoinGecko** - قیمت‌های بازار (منبع اصلی)
2. **Fear & Greed Index** - تحلیل احساسات
3. **Etherscan** - ردیابی نهنگ‌های اتریوم

### ❌ APIهای نیاز به پیکربندی
4. **NewsAPI** - اخبار ارزهای دیجیتال (اولویت بالا)
5. **KuCoin Futures** - معاملات فیوچرز (در صورت نیاز)
6. **CoinMarketCap** - قیمت‌ها (اختیاری - redundant)
7. **CryptoCompare** - قیمت‌ها (اختیاری - redundant)

---

## 🚀 مرحله 1: پیکربندی NewsAPI (5 دقیقه)

### چرا مهم است؟
بدون این کلید، تحلیل اخبار (3% از سیگنال‌ها) کار نمی‌کند.

### مراحل:

#### 1. دریافت کلید API

```bash
# 1. برو به سایت NewsAPI
https://newsapi.org/register

# 2. ثبت‌نام کن با:
- نام و ایمیل
- انتخاب Free Plan (100 درخواست/روز)

# 3. کلید API رو کپی کن
# مثال: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

#### 2. ویرایش فایل .env

```bash
# باز کردن فایل .env
nano .env

# پیدا کردن خط 60 و تغییر دادن:
# قبل:
NEWS_API_KEY=pub_346789abc123def456789ghi012345jkl

# بعد:
NEWS_API_KEY=کلید_واقعی_شما

# ذخیره: Ctrl+O → Enter → Ctrl+X
```

#### 3. ویرایش فایل config/api.json

```bash
# باز کردن فایل کانفیگ
nano config/api.json

# پیدا کردن خط 76 و تغییر دادن:
# قبل:
"key": "pub_346789abc123def456789ghi012345jkl"

# بعد:
"key": "کلید_واقعی_شما"

# ذخیره: Ctrl+O → Enter → Ctrl+X
```

#### 4. ویرایش فایل config/providers_config.json

```bash
# باز کردن فایل providers
nano config/providers_config.json

# پیدا کردن خط 107 (در بخش news providers) و تغییر دادن:
# قبل:
"key": "pub_346789abc123def456789ghi012345jkl"

# بعد:
"key": "کلید_واقعی_شما"

# ذخیره: Ctrl+O → Enter → Ctrl+X
```

#### 5. تست کلید

```bash
# تست API کلید جدید
curl "https://newsapi.org/v2/everything?q=bitcoin&apiKey=کلید_شما"

# باید JSON با اخبار برگردونه (نه error)
```

---

## 🔮 مرحله 2: پیکربندی KuCoin Futures (15 دقیقه)

### چرا مهم است؟
بدون این کلیدها، صفحه FuturesTradingView کار نمی‌کند.

### ⚠️ هشدار امنیتی
- فقط در محیط تست استفاده کنید
- محدودیت IP را فعال کنید
- دسترسی Withdrawal را غیرفعال کنید
- با مبالغ کوچک شروع کنید

### مراحل:

#### 1. دریافت کلیدهای API از KuCoin

```bash
# 1. لاگین به KuCoin
https://www.kucoin.com/login

# 2. برو به API Management
Account → API Management → Create API

# 3. تنظیمات ایمن:
- API Name: "DreammakerBot"
- API Passphrase: یک رمز قوی (حفظ کن!)
- Permissions:
  ✅ General (Read)
  ✅ Futures Trading (فقط در صورت نیاز)
  ❌ Withdrawal (غیرفعال کن!)

# 4. IP Restriction:
- محدود کردن به IP سرور خودت

# 5. بعد از ساخت، 3 مقدار رو کپی کن:
- API Key: xxxxxxxxx
- API Secret: yyyyyyy
- API Passphrase: zzzzzzz
```

#### 2. ویرایش فایل .env

```bash
# باز کردن .env
nano .env

# پیدا کردن خطوط 92-94 و پر کردن:
# قبل:
KUCOIN_FUTURES_KEY=your_key
KUCOIN_FUTURES_SECRET=your_secret
KUCOIN_FUTURES_PASSPHRASE=your_passphrase

# بعد:
KUCOIN_FUTURES_KEY=کلید_API_شما
KUCOIN_FUTURES_SECRET=سیکرت_شما
KUCOIN_FUTURES_PASSPHRASE=پسورد_شما

# ذخیره
```

#### 3. تست اتصال

```bash
# راه‌اندازی سرور
npm run dev

# برو به صفحه Futures Trading
# باید positions، orders، و balance نمایش داده بشه
```

---

## 🔧 مرحله 3: APIهای اختیاری

### CoinMarketCap (اختیاری)

```bash
# 1. ثبت‌نام در:
https://coinmarketcap.com/api/

# 2. انتخاب Free Plan
# 3. دریافت API Key

# 4. ویرایش .env خط 52:
CMC_API_KEY=کلید_جدید_شما

# 5. ویرایش config/api.json خط 51
# 6. ویرایش config/providers_config.json خط 26
```

### CryptoCompare (اختیاری)

```bash
# 1. ثبت‌نام در:
https://www.cryptocompare.com/cryptopian/api-keys

# 2. دریافت Free API Key

# 3. ویرایش .env خط 56:
CRYPTOCOMPARE_KEY=کلید_جدید_شما

# 4. ویرایش config/api.json خط 56
# 5. ویرایش config/providers_config.json خط 44
```

### HuggingFace (اختیاری - برای rate limit بالاتر)

```bash
# 1. ثبت‌نام در:
https://huggingface.co/join

# 2. برو به Settings → Access Tokens
https://huggingface.co/settings/tokens

# 3. Create new token
- Name: "DreammakerAI"
- Type: Read

# 4. ویرایش .env خط 85:
HUGGINGFACE_API_KEY=کلید_شما

# توجه: HuggingFace بدون کلید هم کار می‌کند (با محدودیت بیشتر)
```

---

## 📝 مرحله 4: اعتبارسنجی

### اسکریپت تست خودکار

```bash
# اجرای اسکریپت اعتبارسنجی
./scripts/validate-api-keys.sh

# خروجی باید نشون بده:
# ✅ NewsAPI: Valid
# ✅ KuCoin: Valid (اگر پیکربندی کردی)
# ✅ CoinGecko: Valid
# ✅ Fear & Greed: Valid
# ✅ Etherscan: Valid
```

### تست دستی APIها

```bash
# تست NewsAPI
curl "https://newsapi.org/v2/everything?q=bitcoin&apiKey=YOUR_KEY" | jq

# تست CoinGecko (بدون کلید)
curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd" | jq

# تست Fear & Greed
curl "https://api.alternative.me/fng/" | jq

# تست Etherscan
curl "https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=YOUR_KEY" | jq
```

### تست از داخل برنامه

```bash
# 1. راه‌اندازی سرور
npm run dev

# 2. برو به صفحه Health
http://localhost:5173/health

# 3. بررسی وضعیت تمام APIها
# باید همه ✅ سبز باشند
```

---

## 🔐 امنیت API Keys

### بهترین روش‌ها:

1. **هرگز کلیدها را commit نکنید**
```bash
# اطمینان از gitignore بودن .env
git status

# .env نباید در لیست باشد
# اگر هست:
git rm --cached .env
echo ".env" >> .gitignore
```

2. **استفاده از محیط محلی**
```bash
# کپی .env به .env.local
cp .env .env.local

# ویرایش .env.local با کلیدهای واقعی
# .env را با placeholder نگه دار
```

3. **محدودیت دسترسی**
```bash
# تنظیم دسترسی فقط خواندنی
chmod 600 .env

# فقط owner می‌تونه بخونه
```

4. **IP Whitelisting**
- در KuCoin API Settings
- محدود کردن به IP سرور/خانه

5. **Rotation منظم**
- هر 3 ماه کلیدها رو تعویض کن
- در صورت leak فوری غیرفعال کن

---

## 🐛 عیب‌یابی رایج

### مشکل 1: NewsAPI "Unauthorized"

```bash
# علت: کلید نامعتبر یا منقضی شده
# راه‌حل:
1. بررسی کلید در newsapi.org/account
2. ساخت کلید جدید
3. جایگزینی در تمام 3 فایل
```

### مشکل 2: KuCoin "Invalid signature"

```bash
# علت: Secret یا Passphrase اشتباه
# راه‌حل:
1. دوباره کپی کردن Secret و Passphrase
2. اطمینان از نبود فضای اضافی
3. حذف و ساخت کلید جدید در KuCoin
```

### مشکل 3: Rate Limit Exceeded

```bash
# علت: تعداد درخواست بیش از حد
# راه‌حل:
1. فعال کردن Redis برای caching:
   DISABLE_REDIS=false

2. افزایش TTL در config/api.json:
   "market_data": 120 → 300

3. کاهش updateInterval در کامپوننت‌ها
```

### مشکل 4: "CORS error"

```bash
# علت: درخواست مستقیم از مرورگر
# راه‌حل: استفاده از CORS Proxy
# پروژه قبلاً CORSProxyService داره، فعال کن:

# در server-real-data.ts خط 95
setupProxyRoutes(app);  // باید فعال باشه
```

---

## 📊 نمونه فایل .env کامل

```bash
# ============================================================================
# Data Policy & Mode
# ============================================================================
VITE_APP_MODE=online
VITE_STRICT_REAL_DATA=true
VITE_USE_MOCK_DATA=false

# ============================================================================
# Critical API Keys (نیاز به جایگزینی)
# ============================================================================

# NewsAPI - اخبار (حتماً جایگزین کن!)
NEWS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# KuCoin Futures - معاملات (اگر نیاز داری)
KUCOIN_FUTURES_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KUCOIN_FUTURES_SECRET=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
KUCOIN_FUTURES_PASSPHRASE=zzzzzzzzzzzz

# ============================================================================
# Optional API Keys (بهبود عملکرد)
# ============================================================================

# CoinMarketCap (اختیاری - redundant)
CMC_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# CryptoCompare (اختیاری - redundant)
CRYPTOCOMPARE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# HuggingFace (اختیاری - برای rate limit بالاتر)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================================================
# Working API Keys (فعلاً کار می‌کنند - نیازی به تغییر نیست)
# ============================================================================

# Etherscan (کار می‌کند)
ETHERSCAN_API_KEY=SZHYFZK2RR8H9TIMJBVW54V4H81K2Z2KR2

# BscScan (کار می‌کند)
BSCSCAN_API_KEY=K62RKHGXTDCG53RU4MCG6XABIMJKTN19IT

# TronScan (کار می‌کند)
TRONSCAN_API_KEY=7ae72726-bffe-4e74-9c33-97b761eeea21

# CoinGecko (بدون کلید - کار می‌کند)
# Fear & Greed (بدون کلید - کار می‌کند)

# ============================================================================
# Redis Configuration (اختیاری برای بهبود سرعت)
# ============================================================================
DISABLE_REDIS=false
REDIS_HOST=localhost
REDIS_PORT=6379

# ============================================================================
# Server Configuration
# ============================================================================
PORT=8001
NODE_ENV=development
```

---

## ✅ چک‌لیست نهایی

پس از تکمیل همه مراحل، این موارد را بررسی کنید:

- [ ] NewsAPI کلید در 3 فایل جایگزین شده
- [ ] KuCoin کلیدها در .env پر شده (اگر نیاز دارید)
- [ ] اسکریپت validate-api-keys.sh اجرا شده
- [ ] تمام APIها در صفحه /health سبز هستند
- [ ] فایل .env در .gitignore است
- [ ] دسترسی فایل .env محدود شده (chmod 600)
- [ ] IP Whitelisting در KuCoin فعال است
- [ ] با مبالغ کوچک تست شده
- [ ] Backup از کلیدها گرفته شده

---

## 🎯 نتیجه

بعد از تکمیل این راهنما:

- ✅ تحلیل اخبار فعال می‌شود (NewsAPI)
- ✅ معاملات فیوچرز کار می‌کند (KuCoin)
- ✅ تمام 9 Detector با 100% داده واقعی کار می‌کنند
- ✅ پروژه آماده Production است
- ✅ Rate limits بهینه شده

---

## 📞 پشتیبانی

اگر مشکلی داشتید:

1. بررسی لاگ‌های سرور:
```bash
npm run dev
# لاگ‌های خطا رو بررسی کن
```

2. تست APIها به صورت جداگانه
3. بررسی فایل‌های کانفیگ
4. اجرای مجدد validate-api-keys.sh

---

**نوشته شده برای: DreammakerCryptoSignalAndTrader v2.0**
**تاریخ: 2025-11-09**
**وضعیت: Production Ready** 🚀
