# 📱 iOS IPA Signer & Installer Telegram Bot

ប្រព័ន្ធ Telegram Bot សម្រាប់ Sign និង Install ឯកសារ iOS IPA តាមរយៈ **Cloudflare Workers** (Bot & OTA Web Server) និង **GitHub Actions** (Signing Engine ឥតគិតថ្លៃ ១០០%)។

---

## 🏗️ ស្ថាបត្យកម្មប្រព័ន្ធ (Architecture)

1. **Cloudflare Workers & R2 Storage:**
   - ទទួលសារ និងបញ្ជាពី Telegram Bot តាមរយៈ Webhook។
   - ផ្ទុក Certificates (`.p12`), Provisioning Profiles (`.mobileprovision`), និងឯកសារ IPA លើ **Cloudflare R2**។
   - បម្រើជា Apple OTA Plist Server (`manifest.plist`) និង Safari Install Page សម្រាប់ចុចដំឡើងលើ iPhone។

2. **GitHub Actions Runner:**
   - ដំណើរការនៅលើ Ubuntu Runner (RAM 7GB+, CPU លឿន)។
   - ប្រើប្រាស់ tool `zsign` ដើម្បីដកស្រង់ Mach-O និងចុះហត្ថលេខាលើ IPA ឡើងវិញ។
   - Upload Signed IPA ត្រឡប់ទៅកាន់ Cloudflare R2 រួចផ្ញើសារប្រាប់ User លើ Telegram ភ្លាមៗ។

---

## 📋 ការរៀបចំដំបូង (Setup Guide)

### ១. បង្កើត Telegram Bot
1. ចូលទៅកាន់ Telegram រួចស្វែងរក `@BotFather`
2. វាយ `/newbot` រួចកំណត់ឈ្មោះ Bot របស់អ្នក
3. ចម្លងយក `TELEGRAM_BOT_TOKEN`

### ២. បង្កើត GitHub Repository & Secrets
1. បង្កើត Repository ថ្មីមួយលើ GitHub (Private ឬ Public ក៏បាន) រួច Push កូដទាំងអស់នេះឡើងទៅ
2. បង្កើត **Personal Access Token (Classic)**:
   - ចូល GitHub -> **Settings** -> **Developer Settings** -> **Personal Access Tokens** -> **Tokens (classic)**
   - ចុច **Generate new token (classic)**
   - ជ្រើសរើស Scope: `repo` និង `workflow`
   - ចម្លង Token នោះទុក (`GITHUB_TOKEN`)
3. កំណត់ **GitHub Repository Secrets**:
   - ចូលទៅ Repo របស់អ្នក -> **Settings** -> **Secrets and variables** -> **Actions**
   - បង្កើត Secrets ដូចខាងក្រោម:
     - `TELEGRAM_BOT_TOKEN`: Token របស់ Bot អ្នក
     - `R2_ACCOUNT_ID`: Cloudflare Account ID របស់អ្នក
     - `R2_ACCESS_KEY_ID`: Cloudflare R2 Access Key ID
     - `R2_SECRET_ACCESS_KEY`: Cloudflare R2 Secret Access Key
     - `R2_BUCKET_NAME`: ឈ្មោះ Bucket (ឧ. `ipa-storage`)

### ៣. រៀបចំ Cloudflare R2 & Secrets
1. ចូលទៅកាន់ [Cloudflare Dashboard](https://dash.cloudflare.com) -> **R2**
2. បង្កើត Bucket មួយដែលមានឈ្មោះថា: `ipa-storage`
3. ចូលទៅ **Manage R2 API Tokens** រួចបង្កើត API Token ថ្មី (Permission: Object Read & Write) ដើម្បីយក `Access Key ID` និង `Secret Access Key` សម្រាប់ដាក់ក្នុង GitHub Secrets។
4. កំណត់ Cloudflare Workers Secrets ដោយប្រើ Wrangler:
```bash
# កំណត់ Telegram Bot Token
wrangler secret put TELEGRAM_BOT_TOKEN

# កំណត់ GitHub Personal Access Token
wrangler secret put GITHUB_TOKEN
```

### ៤. កែប្រែ `wrangler.toml`
បើកឯកសារ `wrangler.toml` រួចប្តូរតម្លៃ:
- `GITHUB_REPO`: `ឈ្មោះគណនី_GitHub/ឈ្មោះ_Repo` (ឧទាហរណ៍: `chhun/telegram-ipa-signer-bot`)
- `APP_URL`: URL របស់ Cloudflare Worker របស់អ្នក (ឧទាហរណ៍: `https://telegram-ipa-signer-bot.yourname.workers.dev`)

---

## 🚀 របៀប Deploy ទៅកាន់ Cloudflare Workers

```bash
# ដំឡើង dependencies
bun install   # ឬ npm install

# Deploy ទៅកាន់ Cloudflare
bun run deploy   # ឬ npm run deploy
```

បន្ទាប់ពី Deploy ចប់ អ្នកនឹងទទួលបាន URL របស់ Worker (ឧទាហរណ៍: `https://my-bot.workers.dev`)។

### 🔗 ភ្ជាប់ Telegram Webhook (តែមួយចុច):
បើក Browser (Chrome ឬ Safari) រួចចូលទៅកាន់ URL:
```text
https://my-bot.workers.dev/setup-webhook
```
ប្រសិនបើឃើញ `{"message":"Webhook configuration result", "telegramResponse":{"ok":true...}}` មានន័យថា Bot របស់អ្នកបានភ្ជាប់ជាមួយ Cloudflare Worker ដោយជោគជ័យ ១០០% ហើយ!

---

## 📱 របៀបប្រើប្រាស់ Bot លើ Telegram

1. ផ្ញើ `/start` ទៅកាន់ Bot
2. ផ្ញើឯកសារ Certificate **`.p12`**
3. កំណត់ Password ដោយវាយ: `/setpass YOUR_PASSWORD` (បើគ្មាន password វាយ: `/setpass none`)
4. ផ្ញើឯកសារ Provisioning Profile **`.mobileprovision`**
5. ផ្ញើឯកសារ **`.ipa`** របស់អ្នក (បើក្រោម 20MB) ឬផ្ញើ Direct URL:
   ```text
   /sign https://example.com/myapp.ipa
   ```
6. រង់ចាំប្រហែល ៣០-៦០ វិនាទី GitHub Actions នឹង Sign រួច Bot នឹងផ្ញើប៊ូតុង **"📲 Install App"** មកកាន់អ្នក។
7. ចុចលើប៊ូតុងនោះតាម Safari លើ iPhone ដើម្បីដំឡើងភ្លាមៗ!

