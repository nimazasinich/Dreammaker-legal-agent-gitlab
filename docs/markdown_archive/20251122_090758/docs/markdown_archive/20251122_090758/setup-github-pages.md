# راهنمای فعال‌سازی GitHub Pages

## مرحله 1: فعال‌سازی GitHub Pages در تنظیمات Repository

1. به آدرس زیر بروید:
   ```
   https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/settings/pages
   ```

2. در بخش **"Build and deployment"**:
   - **Source**: GitHub Actions را انتخاب کنید (نه Deploy from a branch)

3. روی **Save** کلیک کنید

## مرحله 2: تنظیم متغیرهای محیطی (اختیاری اما توصیه می‌شود)

1. به بخش Settings > Secrets and variables > Actions بروید:
   ```
   https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/settings/variables/actions
   ```

2. دو متغیر زیر را اضافه کنید:
   - `PAGES_VITE_API_BASE`: آدرس API شما (مثال: `https://api.example.com`)
   - `PAGES_VITE_WS_BASE`: آدرس WebSocket شما (مثال: `wss://ws.example.com`)

## مرحله 3: اجرای Manual Workflow

1. به صفحه Actions بروید:
   ```
   https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/actions
   ```

2. روی workflow "Build & Publish to gh-pages branch" کلیک کنید

3. روی "Run workflow" کلیک کنید و branch "main" را انتخاب کنید

4. منتظر بمانید تا workflow با موفقیت اجرا شود

## مرحله 4: بررسی نتیجه

پس از اتمام workflow، سایت شما در آدرس زیر در دسترس خواهد بود:
```
https://nimazasinich.github.io/DreammakerCryptoSignalAndTrader/
```

## عیب‌یابی

### اگر workflow شکست خورد:
- لاگ‌های workflow را بررسی کنید
- مطمئن شوید که dependencies نصب می‌شوند
- بررسی کنید که build با موفقیت انجام می‌شود

### اگر صفحه 404 نمایش داده شد:
- چند دقیقه صبر کنید (deployment ممکن است زمان ببرد)
- مطمئن شوید که GitHub Pages در تنظیمات فعال است
- بررسی کنید که `gh-pages` branch ساخته شده است

## اطلاعات فنی

### Workflows موجود:
1. **gh-pages.yml**: استفاده از GitHub Actions native deployment
2. **publish-gh-pages-branch.yml**: استفاده از peaceiris/actions-gh-pages

### تنظیمات Vite:
- Base path: `/DreammakerCryptoSignalAndTrader/`
- Build output: `dist/`
- SPA routing: فعال (404.html = index.html)
