# راهنمای سریع Deploy به Hugging Face Spaces

## مرحله 1: ساخت Space (اگر نساختید)

1. برید به: https://huggingface.co/new-space
2. اطلاعات رو پر کنید:
   - **Owner**: نام کاربری خودتون
   - **Space name**: `dreammaker-crypto` (یا هر اسم دیگه)
   - **License**: MIT
   - **Select the Space SDK**: حتماً **Docker** رو انتخاب کنید
   - **Space hardware**: CPU basic (رایگان)
   - **Visibility**: Public

3. روی "Create Space" کلیک کنید

## مرحله 2: Clone کردن Space خالی

```bash
# جایگزین کنید USERNAME و SPACE_NAME رو
git clone https://huggingface.co/spaces/USERNAME/SPACE_NAME hf-space
cd hf-space
```

اگر پرسید برای login:
```bash
# اول login کنید
huggingface-cli login
# بعد دوباره clone کنید
```

## مرحله 3: کپی فایل‌های پروژه

```bash
# فرض کنیم پروژه اصلی در این مسیر هست:
PROJECT_PATH="/home/user/DreammakerCryptoSignalAndTrader"

# کپی فایل‌های ضروری
cp -r $PROJECT_PATH/src .
cp -r $PROJECT_PATH/config .
cp -r $PROJECT_PATH/data .
cp -r $PROJECT_PATH/public .
cp $PROJECT_PATH/package*.json .
cp $PROJECT_PATH/tsconfig*.json .
cp $PROJECT_PATH/vite.config.ts .
cp $PROJECT_PATH/tailwind.config.js .
cp $PROJECT_PATH/postcss.config.js . 2>/dev/null || true
cp $PROJECT_PATH/.dockerignore .

# مهم: استفاده از Dockerfile جدید با nginx
cp $PROJECT_PATH/Dockerfile.huggingface ./Dockerfile

# کپی README
cp $PROJECT_PATH/HUGGINGFACE_DEPLOYMENT.md ./README.md
```

## مرحله 4: Commit و Push

```bash
git add .
git commit -m "Deploy with nginx and supervisor configuration"
git push
```

## مرحله 5: تنظیم Environment Variables

1. برید به Space خودتون: `https://huggingface.co/spaces/USERNAME/SPACE_NAME`
2. برید به تب **Settings**
3. برید به بخش **Variables and secrets**
4. این متغیرها رو اضافه کنید:

**حداقل متغیرها برای حالت DEMO:**
```
NODE_ENV=production
VITE_APP_MODE=DEMO
```

**برای حالت کامل (اختیاری):**
```
COINMARKETCAP_API_KEY=your_key
CRYPTOCOMPARE_API_KEY=your_key
NEWS_API_KEY=your_key
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
```

## مرحله 6: منتظر Build بمونید

Build حدود 10-15 دقیقه طول میکشه. وضعیت رو در تب **Logs** ببینید.

## مرحله 7: دسترسی به برنامه

بعد از Build موفق، برید به:
```
https://USERNAME-SPACE_NAME.hf.space
```

## عیب‌یابی

**اگر Build شکست خورد:**
1. تب Logs رو چک کنید
2. مطمئن بشید Space SDK روی Docker تنظیم شده
3. مطمئن بشید فایل `Dockerfile` (بدون پسوند) وجود داره

**اگر برنامه اجرا نشد:**
1. چک کنید که PORT=7860 در Environment Variables تنظیم نشده (پیش‌فرض خوبه)
2. Health endpoint رو چک کنید: `https://your-space.hf.space/api/health`

## یک‌خطی برای کپی سریع

```bash
# تنظیم متغیرها
export HF_USERNAME="your-username"
export HF_SPACE="dreammaker-crypto"
export PROJECT_PATH="/home/user/DreammakerCryptoSignalAndTrader"

# Clone و Setup
git clone https://huggingface.co/spaces/$HF_USERNAME/$HF_SPACE hf-deploy && \
cd hf-deploy && \
cp -r $PROJECT_PATH/{src,config,data,public,package*.json,tsconfig*.json,vite.config.ts,tailwind.config.js,.dockerignore} . && \
cp $PROJECT_PATH/Dockerfile.huggingface ./Dockerfile && \
cp $PROJECT_PATH/HUGGINGFACE_DEPLOYMENT.md ./README.md && \
git add . && \
git commit -m "Initial deployment with nginx and supervisor" && \
git push && \
echo "✅ Deployed! Check: https://huggingface.co/spaces/$HF_USERNAME/$HF_SPACE"
```
