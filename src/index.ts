import { Hono } from 'hono';
import { Env, TelegramUpdate } from './types';
import { TelegramBot } from './telegram';
import { generateManifestXml } from './manifest';
import { renderInstallPage } from './views/installPage';

const app = new Hono<{ Bindings: Env }>();

// Health & Landing
app.get('/', (c) => {
  return c.text('🤖 iOS IPA Signer & Installer Bot is running smoothly on Cloudflare Workers!');
});

// Setup Telegram Webhook easily in browser
app.get('/setup-webhook', async (c) => {
  const token = c.env.TELEGRAM_BOT_TOKEN;
  const workerUrl = c.env.APP_URL;

  if (!token || !workerUrl) {
    return c.text('❌ TELEGRAM_BOT_TOKEN or APP_URL is not configured.', 400);
  }

  const webhookUrl = `${workerUrl.replace(/\/+$/, '')}/webhook/telegram`;
  const setUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

  const res = await fetch(setUrl);
  const data: any = await res.json();

  return c.json({
    message: 'Webhook configuration result',
    configuredUrl: webhookUrl,
    telegramResponse: data,
  });
});

// Telegram Webhook Handler
app.post('/webhook/telegram', async (c) => {
  try {
    const update: TelegramUpdate = await c.req.json();
    const bot = new TelegramBot(c.env);

    if (update.message) {
      await bot.handleMessage(update.message);
    } else if (update.callback_query && update.callback_query.message) {
      const data = update.callback_query.data;
      const chatId = update.callback_query.message.chat.id;

      if (data === 'check_cert') {
        await bot.handleMessage({ ...update.callback_query.message, text: '/mycert' });
      } else if (data === 'help') {
        await bot.handleMessage({ ...update.callback_query.message, text: '/help' });
      }
    }

    return c.text('OK');
  } catch (err: any) {
    console.error('Error in webhook:', err);
    return c.text('Error', 500);
  }
});

// Safari Web Page: One-click "Install Application"
app.get('/install/:id', async (c) => {
  const jobId = c.req.param('id');
  const jobMetaObj = await c.env.IPA_BUCKET.get(`jobs/${jobId}.json`);

  let appName = 'iOS App';
  if (jobMetaObj) {
    const meta: any = await jobMetaObj.json();
    if (meta.appName) appName = meta.appName;
  }

  const workerUrl = c.env.APP_URL.replace(/\/+$/, '');
  const manifestUrl = `${workerUrl}/manifest/${jobId}`;

  const html = renderInstallPage({
    jobId,
    appName,
    manifestUrl,
  });

  return c.html(html);
});

// Apple OTA Manifest Plist Endpoint (Required for itms-services://)
app.get('/manifest/:id', async (c) => {
  const jobId = c.req.param('id');
  const jobMetaObj = await c.env.IPA_BUCKET.get(`jobs/${jobId}.json`);

  let appName = 'iOS App';
  let bundleId = 'com.app.signed';
  if (jobMetaObj) {
    const meta: any = await jobMetaObj.json();
    if (meta.appName) appName = meta.appName;
    if (meta.bundleId) bundleId = meta.bundleId;
  }

  const workerUrl = c.env.APP_URL.replace(/\/+$/, '');
  const ipaDownloadUrl = `${workerUrl}/download/${jobId}`;

  const xml = generateManifestXml({
    ipaDownloadUrl,
    bundleId,
    appName,
  });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

// Direct IPA Stream Endpoint from Cloudflare R2
app.get('/download/:id', async (c) => {
  const jobId = c.req.param('id');
  const cleanId = jobId.replace(/\.ipa$/i, '');
  const ipaKey = `signed/${cleanId}.ipa`;

  const ipaObj = await c.env.IPA_BUCKET.get(ipaKey);
  if (!ipaObj) {
    return c.text('❌ ឯកសារ IPA រកមិនឃើញ ឬត្រូវបានលុបរួចហើយ!', 404);
  }

  const headers = new Headers();
  ipaObj.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${cleanId}.ipa"`);
  headers.set('etag', ipaObj.httpEtag);

  return new Response(ipaObj.body, {
    headers,
  });
});

export default app;

