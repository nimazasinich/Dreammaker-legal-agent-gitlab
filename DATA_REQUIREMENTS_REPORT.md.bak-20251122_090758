# گزارش نیازمندی‌های داده برنامه

## 🎯 داده‌های مورد نیاز

برنامه Dreammaker برای تولید سیگنال‌های معاملاتی به این داده‌ها نیاز دارد:

### 1️⃣ OHLCV Data (داده‌های کندل استیک)
```
- Open (قیمت باز شدن)
- High (بالاترین قیمت)
- Low (پایین‌ترین قیمت)  
- Close (قیمت بسته شدن)
- Volume (حجم معاملات)
- Timestamp (زمان)
```

**حداقل مورد نیاز:** 50 کندل برای هر نماد  
**تایم‌فریم‌ها:** 1m, 5m, 15m, 1h, 4h, 1d  
**نمادها:** BTC, ETH, SOL, XRP, BNB و...

### 2️⃣ Real-time Prices (قیمت‌های لحظه‌ای)
```
- Symbol (نماد)
- Current Price (قیمت فعلی)
- 24h Change (تغییرات 24 ساعته)
- 24h Volume (حجم 24 ساعته)
- Market Cap (ارزش بازار)
```

### 3️⃣ Market Sentiment (احساسات بازار)
```
- Fear & Greed Index
- News Sentiment
- Social Media Sentiment
```

### 4️⃣ Technical Indicators (اندیکاتورها)
```
این‌ها از OHLCV محاسبه می‌شوند:
- RSI, MACD, Bollinger Bands
- Moving Averages (MA, EMA)
- Support/Resistance Levels
```

---

## 🔍 منابع داده (Data Providers)

برنامه از این منابع سعی می‌کند داده بگیرد:

### منبع اصلی (پیشنهادی): HuggingFace Data Engine
```
URL: https://really-amin-datasourceforcryptocurrency.hf.space
یا Local: http://localhost:8000

وضعیت: ❌ Access Denied (403)
```

**این سرویس چیست؟**
- یک Space در HuggingFace که داده‌های cryptocurrency را تأمین می‌کند
- از چندین API (Binance, CoinGecko, etc) داده جمع‌آوری می‌کند
- داده‌ها را یکپارچه و فرمت‌دهی شده برمی‌گرداند

**چرا کار نمی‌کند؟**
- محدودیت‌های شبکه فعلی محیط
- نیاز به VPN یا Proxy برای دسترسی
- یا باید Local اجرا شود

### منبع 1: HuggingFace Datasets API
```
Datasets:
- WinkingFace/CryptoLM-Bitcoin-BTC-USDT
- WinkingFace/CryptoLM-Ethereum-ETH-USDT
- WinkingFace/CryptoLM-Solana-SOL-USDT

وضعیت: ❌ HTTP 403 Forbidden
```

**چرا کار نمی‌کند؟**
- محدودیت‌های شبکه (IP restrictions)
- نیاز به HuggingFace API Token (در .env خالی است)
- Rate limiting

### منبع 2: Binance API
```
Endpoints:
- /api/v3/ticker/price
- /api/v3/klines
- /api/v3/ticker/24hr

وضعیت: ❌ HTTP 403 Forbidden
```

**چرا کار نمی‌کند؟**
```
Error: "Request failed with status code 403"

دلایل احتمالی:
1. محدودیت IP (Binance در بعضی مناطق محدود است)
2. نیاز به API Key برای rate limit بالاتر
3. نیاز به Proxy/VPN
```

### منبع 3: CoinGecko API
```
Endpoint: /api/v3/simple/price

وضعیت: ⚠️ Empty Response
```

**چرا داده نمی‌دهد؟**
- احتمالاً مشکل در query parameters
- یا rate limiting
- یا نیاز به API Key برای reliability

### منبع 4-6: سایر Providers
```
- CoinCap API: ⚠️ Empty Response
- CoinPaprika API: ⚠️ Empty Response  
- CryptoCompare API: ⚠️ Empty Response
- CoinLore API: ⚠️ Empty Response
```

همه این providers هم fail می‌شوند، احتمالاً به دلیل:
- محدودیت‌های شبکه
- نیاز به API Keys
- Rate limiting

---

## ❌ چرا سیگنال‌ها تولید نمی‌شوند؟

```bash
POST /api/analysis/signals
{
  "symbol": "BTCUSDT",
  "timeframe": "1h"
}

Response:
{
  "error": "Insufficient market data",
  "available": 0,
  "required": 50
}
```

**زنجیره شکست:**
```
1. همه 6 price provider fail می‌شوند
   ↓
2. هیچ OHLCV data لود نمی‌شود (0 bars)
   ↓
3. تحلیل تکنیکال امکان‌پذیر نیست (نیاز به حداقل 50 کندل)
   ↓
4. سیگنال تولید نمی‌شود ❌
```

---

## ✅ راه‌حل‌ها

### گزینه 1: راه‌اندازی HuggingFace Data Engine (بهترین راه‌حل)

**روش A: استفاده از Space موجود**
```bash
# نیاز به VPN/Proxy برای دسترسی
# یا تنظیم proxy در .env:
HTTP_PROXY=http://your-proxy:port
HTTPS_PROXY=http://your-proxy:port
```

**روش B: اجرای Local** (پیشنهادی)
```bash
# Clone کردن یا دانلود HuggingFace Space:
# https://huggingface.co/spaces/Really-amin/Datasourceforcryptocurrency

# اجرای local:
cd path/to/datasourceforcryptocurrency
python app.py  # یا uvicorn main:app --port 8000

# سپس در .env:
HF_ENGINE_BASE_URL=http://localhost:8000
HF_ENGINE_ENABLED=true
```

### گزینه 2: افزودن API Keys

```bash
# در فایل .env:

# HuggingFace (برای Datasets و ML)
HUGGINGFACE_API_KEY=hf_your_token_here

# CoinMarketCap (قیمت‌ها و market data)
CMC_API_KEY=your_cmc_key_here

# CryptoCompare (قیمت‌ها و historical data)
CRYPTOCOMPARE_KEY=your_key_here

# NewsAPI (اخبار و sentiment)
NEWSAPI_KEY=your_key_here

# Binance (اختیاری، برای rate limit بالاتر)
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
```

**مزایا:**
- دسترسی رایگان یا ارزان
- Rate limits بالاتر
- Reliability بیشتر

**نحوه دریافت:**
- HuggingFace: https://huggingface.co/settings/tokens
- CoinMarketCap: https://coinmarketcap.com/api/ (Free tier: 10k calls/month)
- CryptoCompare: https://www.cryptocompare.com/cryptopian/api-keys (Free: 100k calls/month)
- NewsAPI: https://newsapi.org/register (Free: 100 requests/day)

### گزینه 3: تنظیم Proxy/VPN

```bash
# در .env:
HTTP_PROXY=http://proxy-server:port
HTTPS_PROXY=http://proxy-server:port
USE_GLOBAL_PROXY_FOR_BINANCE=true

# یا استفاده از VPN برای bypass کردن محدودیت‌های IP
```

### گزینه 4: استفاده از Mock Data (برای Development)

```bash
# در .env:
APP_MODE=demo
USE_MOCK_DATA=true
ALLOW_FAKE_DATA=true

# این باعث می‌شود برنامه با داده‌های synthetic کار کند
```

**مزیت:** برنامه بدون نیاز به API های خارجی کار می‌کند  
**معایب:** داده‌ها واقعی نیستند

### گزینه 5: WebSocket به Binance (اگر HTTP مسدود است)

```bash
# ممکن است WebSocket باز باشد حتی اگر HTTP مسدود است
# برنامه قابلیت WebSocket connection دارد
```

---

## 🎯 توصیه نهایی

**برای Development:**
```bash
گزینه 4 (Mock Data) + تدریجاً اضافه کردن API Keys
```

**برای Production:**
```bash
گزینه 1 (HuggingFace Data Engine Local) + گزینه 2 (API Keys)
```

این ترکیب:
- ✅ یکپارچگی داده‌ها از HF Engine
- ✅ Fallback به API های مستقیم
- ✅ بدون وابستگی به شبکه خارجی
- ✅ Reliable و Scalable

---

## 📊 خلاصه وضعیت

| منبع داده | وضعیت | دلیل | راه‌حل |
|-----------|-------|------|--------|
| HF Data Engine | ❌ | Access Denied | VPN/Proxy یا Local |
| HF Datasets API | ❌ | HTTP 403 | API Token |
| Binance API | ❌ | HTTP 403 | VPN/Proxy یا API Key |
| CoinGecko | ⚠️ | Empty | API Key پیشنهادی |
| CoinCap | ⚠️ | Empty | بررسی query params |
| CryptoCompare | ⚠️ | Empty | API Key |
| Mock Data | ✅ | Available | Enable در .env |

---

## 🔧 Action Items

1. **فوری (برای تست):**
   - Enable کردن Mock Data mode
   - یا اضافه کردن HuggingFace API Token

2. **کوتاه‌مدت:**
   - دریافت API Keys رایگان (CMC, CryptoCompare)
   - تنظیم VPN/Proxy اگر امکان دارد

3. **بلندمدت:**
   - Setup کردن HF Data Engine به صورت Local
   - یا Deploy کردن آن در infrastructure خودتان

