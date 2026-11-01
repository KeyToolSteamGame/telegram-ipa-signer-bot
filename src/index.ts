import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { Env, TelegramUpdate, UserCertMeta } from './types';
import { TelegramBot } from './telegram';
import { generateManifestXml } from './manifest';
import { renderInstallPage } from './views/installPage';
import { renderWebApp } from './views/webApp';
import {
  verifyTelegramWebAppData,
  verifyTelegramLoginWidget,
  createSessionToken,
  verifySessionToken,
} from './auth';
import { createPresignedUploadUrl } from './s3';
import { triggerGitHubSigningWorkflow } from './github';

const app = new Hono<{ Bindings: Env }>();

// Landing / Web App
app.get('/', (c) => {
  return c.redirect('/app');
});

// Web App Page
app.get('/app', (c) => {
  const botUsername = 'ipa_signerkh_bot';
  const html = renderWebApp({
    botUsername,
    appUrl: c.env.APP_URL,
  });
  return c.html(html);
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

// --- API Authentication Endpoints ---

// 1. Verify Telegram Mini App initData
app.post('/api/auth/verify-tma', async (c) => {
  try {
    const body: any = await c.req.json();
    const initData = body.initData;
    if (!initData) return c.json({ ok: false, error: 'Missing initData' }, 400);

    const user = await verifyTelegramWebAppData(initData, c.env.TELEGRAM_BOT_TOKEN);
    if (!user) {
      return c.json({ ok: false, error: 'Invalid Telegram signature' }, 401);
    }

    const sessionToken = await createSessionToken(user.id, c.env.TELEGRAM_BOT_TOKEN);
    setCookie(c, 'auth_session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 30 * 24 * 60 * 60,
    });

    return c.json({ ok: true, user, token: sessionToken });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// 2. Verify Telegram Login Widget Callback
app.post('/api/auth/verify-widget', async (c) => {
  try {
    const userData: any = await c.req.json();
    const user = await verifyTelegramLoginWidget(userData, c.env.TELEGRAM_BOT_TOKEN);
    if (!user) {
      return c.json({ ok: false, error: 'Invalid Telegram Widget signature' }, 401);
    }

    const sessionToken = await createSessionToken(user.id, c.env.TELEGRAM_BOT_TOKEN);
    setCookie(c, 'auth_session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 30 * 24 * 60 * 60,
    });

    return c.json({ ok: true, user, token: sessionToken });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// Helper: Get authenticated user ID from request
async function getAuthUserId(c: any): Promise<number | null> {
  const cookieToken = getCookie(c, 'auth_session');
  const authHeader = c.req.header('Authorization')?.replace('Bearer ', '');
  const token = cookieToken || authHeader;
  if (!token) return null;
  return await verifySessionToken(token, c.env.TELEGRAM_BOT_TOKEN);
}

// 3. Get User Status & Certificate Info
app.get('/api/user-status', async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const metaObj = await c.env.IPA_BUCKET.get(`certs/${userId}/meta.json`);
  let meta: UserCertMeta = { hasP12: false, hasProvision: false, updatedAt: new Date().toISOString() };
  if (metaObj) {
    meta = await metaObj.json();
  }

  return c.json({ ok: true, user: { id: userId }, meta });
});

// 4. Upload Certificate Files (.p12, .mobileprovision) directly via Web
app.post('/api/upload-cert', async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ ok: false, error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.parseBody();
    const p12File = body['p12'] as File | undefined;
    const provFile = body['provision'] as File | undefined;
    const password = body['password'] as string | undefined;

    const metaObj = await c.env.IPA_BUCKET.get(`certs/${userId}/meta.json`);
    let meta: UserCertMeta = metaObj ? await metaObj.json() : { hasP12: false, hasProvision: false, updatedAt: '' };

    if (p12File && typeof p12File === 'object') {
      const buffer = await p12File.arrayBuffer();
      await c.env.IPA_BUCKET.put(`certs/${userId}/cert.p12`, buffer);
      meta.hasP12 = true;
    }

    if (provFile && typeof provFile === 'object') {
      const buffer = await provFile.arrayBuffer();
      await c.env.IPA_BUCKET.put(`certs/${userId}/profile.mobileprovision`, buffer);
      meta.hasProvision = true;
    }

    if (password !== undefined) {
      meta.password = password;
    }

    meta.updatedAt = new Date().toISOString();
    await c.env.IPA_BUCKET.put(`certs/${userId}/meta.json`, JSON.stringify(meta), {
      httpMetadata: { contentType: 'application/json' },
    });

    return c.json({ ok: true, meta });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// 5. Generate Presigned URL for Direct 5GB Upload to Cloudflare R2
app.post('/api/get-presigned-url', async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ ok: false, error: 'Unauthorized' }, 401);

  const accountId = c.env.R2_ACCOUNT_ID || 'd02ea3805efd909e0451459a19c09dd9';
  const accessKeyId = c.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return c.json({ ok: false, error: 'R2 credentials not configured on Worker' }, 500);
  }

  const jobId = 'job_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const ipaKey = `unsigned/${jobId}.ipa`;

  try {
    const uploadUrl = await createPresignedUploadUrl({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName: 'ipa-storage',
      key: ipaKey,
      expiresInSeconds: 7200, // 2 hours for big uploads
    });

    return c.json({ ok: true, uploadUrl, jobId, ipaKey });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// 6. Trigger Signing Engine (GitHub Actions)
app.post('/api/start-sign', async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ ok: false, error: 'Unauthorized' }, 401);

  const { jobId, ipaKey, appName, bundleId } = await c.req.json();

  const metaObj = await c.env.IPA_BUCKET.get(`certs/${userId}/meta.json`);
  if (!metaObj) {
    return c.json({ ok: false, error: 'Missing Certificate. Please upload .p12 and .mobileprovision first.' }, 400);
  }
  const meta: UserCertMeta = await metaObj.json();
  if (!meta.hasP12 || !meta.hasProvision) {
    return c.json({ ok: false, error: 'Certificate or Provisioning Profile is missing' }, 400);
  }

  // Save job meta
  await c.env.IPA_BUCKET.put(`jobs/${jobId}.json`, JSON.stringify({
    jobId,
    chatId: userId,
    appName: appName || 'iOS App',
    bundleId: bundleId || '',
    createdAt: new Date().toISOString(),
  }));

  // Trigger GitHub Actions workflow
  const result = await triggerGitHubSigningWorkflow({
    githubToken: c.env.GITHUB_TOKEN,
    githubRepo: c.env.GITHUB_REPO,
    payload: {
      job_id: jobId,
      chat_id: userId,
      p12_key: `certs/${userId}/cert.p12`,
      p12_password: meta.password || '',
      provision_key: `certs/${userId}/profile.mobileprovision`,
      ipa_key: ipaKey,
      app_url: c.env.APP_URL,
      app_name: appName,
      bundle_id: bundleId,
    },
  });

  if (!result.success) {
    return c.json({ ok: false, error: result.error }, 500);
  }

  return c.json({ ok: true, jobId });
});

// 7. Check Job Signing Status (Polling)
app.get('/api/job-status/:id', async (c) => {
  const jobId = c.req.param('id');
  const signedObj = await c.env.IPA_BUCKET.get(`signed/${jobId}.ipa`);

  if (signedObj) {
    return c.json({ status: 'COMPLETED' });
  }

  return c.json({ status: 'IN_PROGRESS' });
});

// --- iOS OTA Endpoints ---

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

// Apple OTA Manifest Plist Endpoint
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
