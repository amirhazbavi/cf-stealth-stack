# cf-stealth-stack

پروژه‌ی سرورلس VLESS-over-WebSocket + DoH روی Cloudflare Workers/Pages
با کانفیگ‌های آماده برای **ژاپن** و **روسیه**.

## Languages
- [中文](./docs/README.zh.md)
- [日本語](./docs/README.ja.md)
- [Русский](./docs/README.ru.md)

## نصب سریع
1. `npm install`
2. `bash scripts/gen-uuid.sh` → UUID را در `wrangler.toml` بگذارید
3. `npx wrangler login`
4. `UUID=... bash scripts/deploy.sh`
5. دامنه‌ی Pages/Workers را به کلاینت بدهید (Clash / sing-box / v2rayN)

## نکته‌ها
- فقط TCP پشتیبانی می‌شود (بدون UDP).
- پلن رایگان: ۱۰۰٬۰۰۰ درخواست در روز.
- برای کاهش SNI از دامنه‌ی CNAME سفارشی استفاده کنید.
