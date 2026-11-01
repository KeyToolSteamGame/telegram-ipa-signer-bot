import { Env, TelegramMessage, UserCertMeta } from './types';
import { triggerGitHubSigningWorkflow } from './github';

export class TelegramBot {
  private token: string;
  private env: Env;

  constructor(env: Env) {
    this.token = env.TELEGRAM_BOT_TOKEN;
    this.env = env;
  }

  // Send a text message to a chat
  async sendMessage(chatId: number, text: string, replyMarkup?: any): Promise<any> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  }

  // Edit an existing message
  async editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any): Promise<any> {
    const url = `https://api.telegram.org/bot${this.token}/editMessageText`;
    const payload: any = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML',
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  }

  // Download a file from Telegram (for files < 20MB)
  async downloadTelegramFile(fileId: string): Promise<{ buffer: ArrayBuffer; fileName?: string } | null> {
    try {
      const getFileUrl = `https://api.telegram.org/bot${this.token}/getFile?file_id=${fileId}`;
      const fileRes = await fetch(getFileUrl);
      const fileData: any = await fileRes.json();

      if (!fileData.ok || !fileData.result?.file_path) {
        return null;
      }

      const filePath = fileData.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${this.token}/${filePath}`;
      const res = await fetch(downloadUrl);

      if (!res.ok) return null;
      const buffer = await res.arrayBuffer();
      return { buffer };
    } catch (e) {
      console.error('Error downloading Telegram file:', e);
      return null;
    }
  }

  // Get User Certificate Metadata from R2
  async getUserCertMeta(chatId: number): Promise<UserCertMeta> {
    const metaKey = `certs/${chatId}/meta.json`;
    const metaObj = await this.env.IPA_BUCKET.get(metaKey);
    if (!metaObj) {
      return { hasP12: false, hasProvision: false, updatedAt: new Date().toISOString() };
    }
    return await metaObj.json();
  }

  // Save User Certificate Metadata to R2
  async saveUserCertMeta(chatId: number, meta: UserCertMeta): Promise<void> {
    const metaKey = `certs/${chatId}/meta.json`;
    await this.env.IPA_BUCKET.put(metaKey, JSON.stringify(meta), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  // Main Message Router
  async handleMessage(msg: TelegramMessage): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text?.trim() || '';

    // 1. Handle Commands
    if (text === '/start') {
      await this.sendWelcome(chatId);
      return;
    }

    if (text === '/help') {
      await this.sendHelp(chatId);
      return;
    }

    if (text === '/mycert') {
      await this.checkCertStatus(chatId);
      return;
    }

    if (text.startsWith('/setpass')) {
      await this.handleSetPassword(chatId, text);
      return;
    }

    if (text === '/delcert') {
      await this.handleDeleteCert(chatId);
      return;
    }

    if (text.startsWith('/sign')) {
      const parts = text.split(/\s+/);
      if (parts.length < 2) {
        await this.sendMessage(chatId, '⚠️ សូមបញ្ជាក់ Direct URL របស់ IPA:\n<code>/sign https://example.com/app.ipa</code>');
        return;
      }
      const ipaUrl = parts[1];
      const customName = parts[2]; // optional
      await this.startSigningJob(chatId, { ipaUrl, appName: customName });
      return;
    }

    // 2. Handle File Uploads (Documents)
    if (msg.document) {
      await this.handleDocumentUpload(chatId, msg.document);
      return;
    }

    // 3. Fallback: Check if message is a direct link to an .ipa
    if (text.startsWith('http://') || text.startsWith('https://')) {
      if (text.toLowerCase().includes('.ipa') || text.includes('drive.google.com') || text.includes('mediafire.com')) {
        await this.startSigningJob(chatId, { ipaUrl: text });
        return;
      }
    }

    // Default Reply
    await this.sendMessage(chatId, '👋 សូមជ្រើសរើសបញ្ជា:\n/mycert - ពិនិត្យមើល Certificate\n/help - របៀបប្រើប្រាស់');
  }

  private async sendWelcome(chatId: number): Promise<void> {
    const text = `🎉 <b>សូមស្វាគមន៍មកកាន់ iOS IPA Signer & Installer Bot!</b>

Bot នេះជួយអ្នក Sign ឯកសារ IPA ជាមួយ Apple Developer Certificate ផ្ទាល់ខ្លួនរបស់អ្នក និងបង្កើត Link ដំឡើងលើ iPhone/iPad ដោយផ្ទាល់ (OTA)។

📌 <b>របៀបចាប់ផ្តើម៖</b>
1️⃣ ផ្ញើឯកសារ <b>.p12</b> របស់អ្នកមកកាន់ទីនេះ
2️⃣ កំណត់ Password ដោយវាយ: <code>/setpass YOUR_PASSWORD</code>
3️⃣ ផ្ញើឯកសារ <b>.mobileprovision</b>
4️⃣ ផ្ញើឯកសារ <b>.ipa</b> ឬ Direct Link: <code>/sign https://.../app.ipa</code>

ចុច /help ដើម្បីអានការណែនាំបន្ថែម!`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '📜 ពិនិត្យមើល Cert របស់ខ្ញុំ', callback_data: 'check_cert' }],
        [{ text: '📖 ការណែនាំ (Help)', callback_data: 'help' }],
      ],
    };

    await this.sendMessage(chatId, text, keyboard);
  }

  private async sendHelp(chatId: number): Promise<void> {
    const text = `📖 <b>ការណែនាំអំពីការប្រើប្រាស់ Bot:</b>

🔹 <b>តម្រូវការចាំបាច់:</b>
- Apple Developer Certificate (ឯកសារ <code>.p12</code>)
- Provisioning Profile (ឯកសារ <code>.mobileprovision</code> ដែលមានបញ្ចូល UDID របស់ទូរសព្ទអ្នក)

🔹 <b>បញ្ជាសំខាន់ៗ:</b>
• /mycert - ពិនិត្យមើលថាអ្នកបាន Upload Cert & Provision រួចឬនៅ
• <code>/setpass 1234</code> - កំណត់ password សម្រាប់ឯកសារ .p12
• <code>/sign &lt;url&gt;</code> - Sign ឯកសារ IPA តាម Link
• /delcert - លុប Cert ចេញពីប្រព័ន្ធ

💡 <b>ចំណាំសំខាន់:</b>
Telegram កំណត់ទំហំ Upload ឯកសារបានត្រឹមតែ 20MB សម្រាប់ Bot ធម្មតា។ ប្រសិនបើឯកសារ IPA របស់អ្នកមានទំហំធំជាង 20MB សូម Upload វាទៅកាន់ Host ណាមួយ (Google Drive / DropBox / Direct Server) រួចផ្ញើ Link មក Bot តាមទម្រង់:
<code>/sign https://example.com/app.ipa</code>`;

    await this.sendMessage(chatId, text);
  }

  private async checkCertStatus(chatId: number): Promise<void> {
    const meta = await this.getUserCertMeta(chatId);

    const p12Status = meta.hasP12 ? '✅ បាន Upload រួច' : '❌ មិនទាន់មាន';
    const passStatus = meta.password ? '✅ បានកំណត់' : '⚠️ មិនទាន់កំណត់ (ប្រើ /setpass)';
    const provStatus = meta.hasProvision ? '✅ បាន Upload រួច' : '❌ មិនទាន់មាន';

    const text = `🔐 <b>ព័ត៌មាន Certificate របស់អ្នក:</b>

• <b>ឯកសារ .p12:</b> ${p12Status}
• <b>Password P12:</b> ${passStatus}
• <b>ឯកសារ .mobileprovision:</b> ${provStatus}

${meta.hasP12 && meta.hasProvision ? '✨ <b>អ្នករួចរាល់ក្នុងការ Sign ឯកសារ IPA ហើយ!</b> សូមផ្ញើឯកសារ .ipa ឬ link មកបាន។' : '⚠️ សូម Upload ឯកសារដែលខ្វះជាមុនសិន។'}`;

    await this.sendMessage(chatId, text);
  }

  private async handleSetPassword(chatId: number, text: string): Promise<void> {
    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      await this.sendMessage(chatId, '⚠️ សូមវាយ Password ភ្ជាប់ជាមួយផង ឧទាហរណ៍:\n<code>/setpass 123456</code>\n(បើគ្មាន password ទេ សូមវាយ: <code>/setpass none</code>)');
      return;
    }

    const password = parts[1] === 'none' ? '' : parts[1];
    const meta = await this.getUserCertMeta(chatId);
    meta.password = password;
    meta.updatedAt = new Date().toISOString();
    await this.saveUserCertMeta(chatId, meta);

    await this.sendMessage(chatId, '✅ <b>បានរក្សាទុក Password Certificate ដោយជោគជ័យ!</b>');
  }

  private async handleDeleteCert(chatId: number): Promise<void> {
    await this.env.IPA_BUCKET.delete(`certs/${chatId}/cert.p12`);
    await this.env.IPA_BUCKET.delete(`certs/${chatId}/profile.mobileprovision`);
    await this.env.IPA_BUCKET.delete(`certs/${chatId}/meta.json`);

    await this.sendMessage(chatId, '🗑️ <b>បានលុប Certificates និង Provisioning Profiles របស់អ្នកចេញពីប្រព័ន្ធរួចរាល់!</b>');
  }

  private async handleDocumentUpload(chatId: number, doc: NonNullable<TelegramMessage['document']>): Promise<void> {
    const fileName = doc.file_name?.toLowerCase() || '';

    // Handle .p12 file
    if (fileName.endsWith('.p12')) {
      const waitMsg = await this.sendMessage(chatId, '⏳ កំពុងទទួលយកឯកសារ Certificate (.p12)...');
      const file = await this.downloadTelegramFile(doc.file_id);
      if (!file) {
        await this.editMessage(chatId, waitMsg.result.message_id, '❌ មិនអាចទាញយកឯកសារពី Telegram បានទេ។');
        return;
      }

      await this.env.IPA_BUCKET.put(`certs/${chatId}/cert.p12`, file.buffer);
      const meta = await this.getUserCertMeta(chatId);
      meta.hasP12 = true;
      meta.updatedAt = new Date().toISOString();
      await this.saveUserCertMeta(chatId, meta);

      await this.editMessage(
        chatId,
        waitMsg.result.message_id,
        '✅ <b>បានរក្សាទុកឯកសារ .p12 ដោយជោគជ័យ!</b>\n\n👉 សូមកំណត់ Password ដោយវាយ:\n<code>/setpass YOUR_PASSWORD</code>\n(បើគ្មាន password ទេ វាយ: <code>/setpass none</code>)'
      );
      return;
    }

    // Handle .mobileprovision file
    if (fileName.endsWith('.mobileprovision')) {
      const waitMsg = await this.sendMessage(chatId, '⏳ កំពុងទទួលយកឯកសារ Provisioning Profile...');
      const file = await this.downloadTelegramFile(doc.file_id);
      if (!file) {
        await this.editMessage(chatId, waitMsg.result.message_id, '❌ មិនអាចទាញយកឯកសារពី Telegram បានទេ។');
        return;
      }

      await this.env.IPA_BUCKET.put(`certs/${chatId}/profile.mobileprovision`, file.buffer);
      const meta = await this.getUserCertMeta(chatId);
      meta.hasProvision = true;
      meta.updatedAt = new Date().toISOString();
      await this.saveUserCertMeta(chatId, meta);

      await this.editMessage(
        chatId,
        waitMsg.result.message_id,
        '✅ <b>បានរក្សាទុកឯកសារ .mobileprovision ដោយជោគជ័យ!</b>'
      );
      return;
    }

    // Handle .ipa file direct upload (if under 20MB)
    if (fileName.endsWith('.ipa')) {
      if ((doc.file_size || 0) > 20 * 1024 * 1024) {
        await this.sendMessage(
          chatId,
          '⚠️ <b>ឯកសារធំពេក (លើសពី 20MB)!</b>\n\nTelegram មិនអនុញ្ញាតឱ្យ Bot ទាញយកឯកសារផ្ទាល់លើសពី 20MB ឡើយ។\n👉 សូម Upload ឯកសារ IPA របស់អ្នកទៅកាន់ Google Drive / Dropbox / Direct Link រួចផ្ញើមក Bot តាមទម្រង់:\n<code>/sign DIRECT_LINK_HERE</code>'
        );
        return;
      }

      const waitMsg = await this.sendMessage(chatId, '⏳ កំពុងទាញយកឯកសារ IPA ពី Telegram...');
      const file = await this.downloadTelegramFile(doc.file_id);
      if (!file) {
        await this.editMessage(chatId, waitMsg.result.message_id, '❌ មិនអាចទាញយក IPA ពី Telegram បានទេ។');
        return;
      }

      const jobId = 'job_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const ipaKey = `unsigned/${jobId}.ipa`;
      await this.env.IPA_BUCKET.put(ipaKey, file.buffer);

      const appName = doc.file_name?.replace(/\.ipa$/i, '') || 'iOS App';
      await this.startSigningJob(chatId, { ipaKey, appName, messageId: waitMsg.result.message_id, jobId });
      return;
    }

    await this.sendMessage(chatId, '⚠️ ប្រភេទឯកសារមិនត្រឹមត្រូវ។ សូមផ្ញើតែឯកសារ <code>.p12</code>, <code>.mobileprovision</code>, ឬ <code>.ipa</code>។');
  }

  // Trigger Signing Engine (GitHub Actions)
  private async startSigningJob(
    chatId: number,
    options: { ipaUrl?: string; ipaKey?: string; appName?: string; bundleId?: string; messageId?: number; jobId?: string }
  ): Promise<void> {
    const meta = await this.getUserCertMeta(chatId);

    if (!meta.hasP12 || !meta.hasProvision) {
      await this.sendMessage(
        chatId,
        '❌ <b>ខ្វះ Certificate!</b>\n\nអ្នកមិនទាន់បាន Upload ឯកសារ <code>.p12</code> ឬ <code>.mobileprovision</code> ឡើយ។\nសូមវាយ /mycert ដើម្បីពិនិត្យ។'
      );
      return;
    }

    const jobId = options.jobId || 'job_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const appName = options.appName || 'iOS App';

    let initialMsgId = options.messageId;
    if (!initialMsgId) {
      const sent = await this.sendMessage(
        chatId,
        `🚀 <b>បានបញ្ជូនទៅកាន់ Signing Engine!</b>\n\n📦 <b>Job ID:</b> <code>${jobId}</code>\n⏳ កំពុងចាប់ផ្តើម GitHub Actions Runner...`
      );
      initialMsgId = sent.result.message_id;
    } else {
      await this.editMessage(
        chatId,
        initialMsgId,
        `🚀 <b>បានបញ្ជូនទៅកាន់ Signing Engine!</b>\n\n📦 <b>Job ID:</b> <code>${jobId}</code>\n⏳ កំពុងចាប់ផ្តើម GitHub Actions Runner...`
      );
    }

    // Save initial job meta
    await this.env.IPA_BUCKET.put(`jobs/${jobId}.json`, JSON.stringify({
      jobId,
      chatId,
      appName,
      bundleId: options.bundleId,
      createdAt: new Date().toISOString(),
    }));

    // Trigger GitHub Action
    const result = await triggerGitHubSigningWorkflow({
      githubToken: this.env.GITHUB_TOKEN,
      githubRepo: this.env.GITHUB_REPO,
      payload: {
        job_id: jobId,
        chat_id: chatId,
        message_id: initialMsgId,
        p12_key: `certs/${chatId}/cert.p12`,
        p12_password: meta.password || '',
        provision_key: `certs/${chatId}/profile.mobileprovision`,
        ipa_key: options.ipaKey,
        ipa_url: options.ipaUrl,
        app_url: this.env.APP_URL,
        app_name: appName,
        bundle_id: options.bundleId,
      },
    });

    if (!result.success) {
      await this.editMessage(
        chatId,
        initialMsgId,
        `❌ <b>មានបញ្ហាក្នុងការបញ្ជា GitHub Action:</b>\n<code>${result.error}</code>\n\nសូមពិនិត្យមើល GITHUB_TOKEN និង GITHUB_REPO របស់អ្នក។`
      );
    }
  }
}

