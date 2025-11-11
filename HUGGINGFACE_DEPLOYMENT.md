# 🚀 راهنمای استقرار در Hugging Face Spaces
# 🚀 Hugging Face Spaces Deployment Guide

[فارسی](#راهنمای-فارسی) | [English](#english-guide)

---

## راهنمای فارسی

### 📋 پیش‌نیازها

1. یک حساب کاربری رایگان در [Hugging Face](https://huggingface.co/join)
2. Git نصب شده روی سیستم شما
3. (اختیاری) Docker برای تست محلی

### 🎯 مراحل استقرار

#### مرحله 1: ایجاد Space جدید

1. به [Hugging Face Spaces](https://huggingface.co/spaces) بروید
2. روی "Create new Space" کلیک کنید
3. اطلاعات زیر را وارد کنید:
   - **Space name**: نام دلخواه (مثلاً `crypto-trading-platform`)
   - **License**: Unlicense یا MIT
   - **Space SDK**: **Docker** را انتخاب کنید
   - **Visibility**: Public یا Private

#### مرحله 2: آپلود کد

دو روش برای آپلود وجود دارد:

##### روش 1: استفاده از Git (توصیه می‌شود)

```bash
# Clone کردن Space خالی شما
git clone https://huggingface.co/spaces/USERNAME/SPACE_NAME
cd SPACE_NAME

# کپی کردن فایل‌های پروژه
cp -r /path/to/DreammakerCryptoSignalAndTrader/* .

# استفاده از Dockerfile مخصوص Hugging Face
cp Dockerfile.huggingface Dockerfile

# Commit و Push
git add .
git commit -m "Initial deployment to Hugging Face Spaces"
git push
```

##### روش 2: استفاده از رابط وب

1. به Space خود بروید
2. روی "Files" کلیک کنید
3. فایل‌های پروژه را آپلود کنید
4. `Dockerfile.huggingface` را به نام `Dockerfile` تغییر نام دهید

#### مرحله 3: تنظیم متغیرهای محیطی (Environment Variables)

1. در Space خود، به تب "Settings" بروید
2. به بخش "Repository secrets" بروید
3. متغیرهای زیر را اضافه کنید:

**متغیرهای ضروری:**
```
NODE_ENV=production
VITE_APP_MODE=DEMO
```

**متغیرهای اختیاری (برای عملکرد کامل):**
```
COINMARKETCAP_API_KEY=your_key
CRYPTOCOMPARE_API_KEY=your_key
NEWS_API_KEY=your_key
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
KUCOIN_API_KEY=your_key
KUCOIN_API_SECRET=your_secret
KUCOIN_API_PASSPHRASE=your_passphrase
```

**فیچرهای قابل فعال‌سازی:**
```
ENABLE_ML_SERVICE=false
ENABLE_REDIS=false
ENABLE_TELEGRAM=false
ENABLE_REAL_TRADING=false
```

#### مرحله 4: Build و اجرا

Space به صورت خودکار شروع به Build می‌کند. این فرآیند 10-15 دقیقه طول می‌کشد.

وضعیت را در تب "Logs" مشاهده کنید.

#### مرحله 5: دسترسی به برنامه

پس از Build موفق، برنامه در آدرس زیر در دسترس است:
```
https://USERNAME-SPACE_NAME.hf.space
```

### 🧪 تست محلی قبل از استقرار

قبل از استقرار در Hugging Face، می‌توانید با Docker محلی تست کنید:

```bash
# Build کردن تصویر Docker
docker build -f Dockerfile.huggingface -t dreammaker-crypto .

# اجرای کانتینر
docker run -p 7860:7860 \
  -e VITE_APP_MODE=DEMO \
  -e NODE_ENV=production \
  dreammaker-crypto

# دسترسی به برنامه
# مرورگر خود را باز کرده و به http://localhost:7860 بروید
```

یا استفاده از docker-compose:

```bash
docker-compose -f docker-compose.huggingface.yml up
```

### ⚙️ حالت‌های مختلف برنامه

برنامه سه حالت دارد:

1. **DEMO** (توصیه‌شده برای Hugging Face Free):
   - از داده‌های نمونه استفاده می‌کند
   - نیازی به API Key ندارد
   - مصرف منابع کم
   - مناسب برای نمایش و تست

2. **TEST**:
   - ترکیبی از داده واقعی و نمونه
   - نیاز به برخی API Key ها
   - برای تست و توسعه

3. **ONLINE**:
   - استفاده کامل از API های واقعی
   - نیاز به تمام API Key ها
   - مصرف منابع بالا
   - برای محیط تولید

### 💡 نکات مهم

1. **محدودیت‌های سرویس رایگان:**
   - CPU: 2 cores
   - RAM: 16GB
   - ذخیره‌سازی: محدود
   - Sleep بعد از 48 ساعت عدم فعالیت

2. **بهینه‌سازی برای سرویس رایگان:**
   - حالت `DEMO` را استفاده کنید
   - سرویس ML را غیرفعال کنید
   - Redis را غیرفعال کنید
   - معاملات واقعی را غیرفعال کنید

3. **امنیت:**
   - هرگز API Key ها را در کد قرار ندهید
   - از Repository Secrets استفاده کنید
   - Space را Private نگه دارید اگر از API Key های واقعی استفاده می‌کنید

### 🐛 عیب‌یابی

**مشکل: Build شکست می‌خورد**
```bash
# چک کردن Logs در تب Logs
# معمولاً به دلیل کمبود حافظه یا timeout
```

**مشکل: برنامه اجرا نمی‌شود**
```bash
# چک کردن اینکه PORT=7860 تنظیم شده
# چک کردن health endpoint: https://your-space.hf.space/api/health
```

**مشکل: خطای 500**
```bash
# چک کردن متغیرهای محیطی
# چک کردن Logs برای جزئیات خطا
```

### 📚 منابع بیشتر

- [Hugging Face Spaces Documentation](https://huggingface.co/docs/hub/spaces)
- [Docker Spaces Guide](https://huggingface.co/docs/hub/spaces-sdks-docker)
- [Repository GitHub](https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader)

---

## English Guide

### 📋 Prerequisites

1. A free [Hugging Face](https://huggingface.co/join) account
2. Git installed on your system
3. (Optional) Docker for local testing

### 🎯 Deployment Steps

#### Step 1: Create a New Space

1. Go to [Hugging Face Spaces](https://huggingface.co/spaces)
2. Click "Create new Space"
3. Fill in the details:
   - **Space name**: Your desired name (e.g., `crypto-trading-platform`)
   - **License**: Unlicense or MIT
   - **Space SDK**: Select **Docker**
   - **Visibility**: Public or Private

#### Step 2: Upload Code

Two methods to upload your code:

##### Method 1: Using Git (Recommended)

```bash
# Clone your empty Space
git clone https://huggingface.co/spaces/USERNAME/SPACE_NAME
cd SPACE_NAME

# Copy project files
cp -r /path/to/DreammakerCryptoSignalAndTrader/* .

# Use Hugging Face specific Dockerfile
cp Dockerfile.huggingface Dockerfile

# Commit and push
git add .
git commit -m "Initial deployment to Hugging Face Spaces"
git push
```

##### Method 2: Using Web Interface

1. Navigate to your Space
2. Click on "Files"
3. Upload project files
4. Rename `Dockerfile.huggingface` to `Dockerfile`

#### Step 3: Configure Environment Variables

1. In your Space, go to "Settings" tab
2. Navigate to "Repository secrets" section
3. Add the following variables:

**Required Variables:**
```
NODE_ENV=production
VITE_APP_MODE=DEMO
```

**Optional Variables (for full functionality):**
```
COINMARKETCAP_API_KEY=your_key
CRYPTOCOMPARE_API_KEY=your_key
NEWS_API_KEY=your_key
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
KUCOIN_API_KEY=your_key
KUCOIN_API_SECRET=your_secret
KUCOIN_API_PASSPHRASE=your_passphrase
```

**Feature Flags:**
```
ENABLE_ML_SERVICE=false
ENABLE_REDIS=false
ENABLE_TELEGRAM=false
ENABLE_REAL_TRADING=false
```

#### Step 4: Build and Run

The Space will automatically start building. This process takes 10-15 minutes.

Monitor the progress in the "Logs" tab.

#### Step 5: Access Your Application

After successful build, your app will be available at:
```
https://USERNAME-SPACE_NAME.hf.space
```

### 🧪 Local Testing Before Deployment

Test locally with Docker before deploying to Hugging Face:

```bash
# Build Docker image
docker build -f Dockerfile.huggingface -t dreammaker-crypto .

# Run container
docker run -p 7860:7860 \
  -e VITE_APP_MODE=DEMO \
  -e NODE_ENV=production \
  dreammaker-crypto

# Access the application
# Open browser to http://localhost:7860
```

Or using docker-compose:

```bash
docker-compose -f docker-compose.huggingface.yml up
```

### ⚙️ Application Modes

The application has three modes:

1. **DEMO** (Recommended for Hugging Face Free):
   - Uses mock/sample data
   - No API keys required
   - Low resource consumption
   - Perfect for demonstration and testing

2. **TEST**:
   - Mix of real and mock data
   - Some API keys required
   - For development and testing

3. **ONLINE**:
   - Full real API usage
   - All API keys required
   - High resource consumption
   - For production environment

### 💡 Important Notes

1. **Free Tier Limitations:**
   - CPU: 2 cores
   - RAM: 16GB
   - Storage: Limited
   - Sleeps after 48 hours of inactivity

2. **Optimization for Free Tier:**
   - Use `DEMO` mode
   - Disable ML service
   - Disable Redis
   - Disable real trading

3. **Security:**
   - Never commit API keys in code
   - Use Repository Secrets
   - Keep Space private if using real API keys

### 🐛 Troubleshooting

**Issue: Build fails**
```bash
# Check Logs in the Logs tab
# Usually due to memory constraints or timeout
```

**Issue: Application doesn't run**
```bash
# Verify PORT=7860 is set
# Check health endpoint: https://your-space.hf.space/api/health
```

**Issue: 500 errors**
```bash
# Check environment variables
# Review Logs for error details
```

### 📚 Additional Resources

- [Hugging Face Spaces Documentation](https://huggingface.co/docs/hub/spaces)
- [Docker Spaces Guide](https://huggingface.co/docs/hub/spaces-sdks-docker)
- [GitHub Repository](https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader)

---

## 🎨 Features Available in DEMO Mode

Even in DEMO mode, you get access to:

- ✅ Real-time mock market data
- ✅ Interactive trading charts
- ✅ Technical analysis indicators
- ✅ Signal generation and scoring
- ✅ Portfolio management (simulated)
- ✅ Risk management tools
- ✅ Backtesting engine
- ✅ Market scanner
- ✅ Trading strategies

---

## 📝 License

This project is unlicensed and free to use.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

## 📧 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/issues)
- Hugging Face Discussions: Use the Discussions tab in your Space
