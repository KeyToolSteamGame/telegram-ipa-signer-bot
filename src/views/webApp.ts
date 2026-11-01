export function renderWebApp(params: {
  botUsername: string;
  appUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>iPA Signer &amp; Installer Pro</title>
  <!-- Telegram Web App SDK -->
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(255, 255, 255, 0.05);
      --card-border: rgba(255, 255, 255, 0.1);
      --primary: #007aff;
      --primary-hover: #0056b3;
      --success: #34c759;
      --danger: #ff3b30;
      --warning: #ff9500;
      --text: #ffffff;
      --text-muted: #94a3b8;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
    }
    .container {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 40px;
    }
    .header {
      text-align: center;
      padding: 12px 0;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .header p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 20px;
      backdrop-filter: blur(20px);
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 600;
    }
    .user-name {
      font-size: 16px;
      font-weight: 600;
    }
    .user-sub {
      font-size: 12px;
      color: var(--text-muted);
    }
    .cert-status-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 14px;
    }
    .cert-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .badge {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 8px;
      font-weight: 500;
    }
    .badge-ok { background: rgba(52, 199, 89, 0.2); color: var(--success); }
    .badge-miss { background: rgba(255, 59, 48, 0.2); color: var(--danger); }
    .badge-warn { background: rgba(255, 149, 0, 0.2); color: var(--warning); }
    
    .dropzone {
      border: 2px dashed var(--card-border);
      border-radius: 16px;
      padding: 28px 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.02);
    }
    .dropzone:hover, .dropzone.dragover {
      border-color: var(--primary);
      background: rgba(0, 122, 255, 0.08);
    }
    .dropzone-icon {
      font-size: 40px;
      margin-bottom: 8px;
    }
    .dropzone-text {
      font-size: 15px;
      font-weight: 600;
    }
    .dropzone-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .file-input { display: none; }

    .file-selected {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: rgba(0, 122, 255, 0.1);
      border: 1px solid var(--primary);
      border-radius: 12px;
      margin-top: 12px;
      font-size: 14px;
    }

    .form-group {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 13px;
      color: var(--text-muted);
    }
    .form-control {
      width: 100%;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      color: var(--text);
      font-size: 14px;
      outline: none;
    }
    .form-control:focus {
      border-color: var(--primary);
    }

    .btn {
      display: block;
      width: 100%;
      padding: 15px;
      border: none;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      transition: all 0.2s;
      margin-top: 16px;
    }
    .btn-primary {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 4px 15px rgba(0, 122, 255, 0.4);
    }
    .btn-primary:active { transform: scale(0.98); }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .btn-success {
      background: var(--success);
      color: #fff;
      box-shadow: 0 4px 15px rgba(52, 199, 89, 0.4);
    }

    .progress-box {
      margin-top: 16px;
      display: none;
    }
    .progress-bar-bg {
      width: 100%;
      height: 10px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
      overflow: hidden;
      margin-top: 6px;
    }
    .progress-bar-fill {
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #007aff, #5856d6);
      transition: width 0.2s ease;
    }
    .progress-status {
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      color: var(--text-muted);
    }

    #loginSection {
      text-align: center;
      padding: 40px 20px;
    }
    .telegram-btn-wrapper {
      margin-top: 24px;
      display: flex;
      justify-content: center;
    }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 iPA Signer Pro</h1>
      <p>ចុះហត្ថលេខា និងដំឡើងឯកសារ iOS IPA រហូតដល់ 5GB</p>
    </div>

    <!-- Login Section (for external browser) -->
    <div id="loginSection" class="card">
      <div style="font-size: 48px; margin-bottom: 12px;">🔐</div>
      <h2 style="font-size: 20px; margin-bottom: 6px;">ចូលប្រើប្រាស់គណនី</h2>
      <p style="font-size: 14px; color: var(--text-muted);">
        សូមចូលដោយប្រើគណនី Telegram របស់អ្នក ដើម្បីទាញយក Certificate និងចាប់ផ្តើម Sign
      </p>
      <div class="telegram-btn-wrapper">
        <script async src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-login="${params.botUsername}"
          data-size="large"
          data-userpic="false"
          data-onauth="onTelegramAuth(user)"
          data-request-access="write"></script>
      </div>
    </div>

    <!-- Main App Section (shown when logged in) -->
    <div id="appSection" class="hidden" style="display: flex; flex-direction: column; gap: 16px;">
      <!-- User Info Card -->
      <div class="card">
        <div class="user-info">
          <div class="avatar" id="userAvatar">👤</div>
          <div>
            <div class="user-name" id="userName">User</div>
            <div class="user-sub" id="userSub">ID: ...</div>
          </div>
        </div>
      </div>

      <!-- Certificate Status Card -->
      <div class="card">
        <div class="card-title">
          <span>🔐 ស្ថានភាព Certificate</span>
          <span style="font-size: 12px; color: var(--primary); cursor: pointer;" onclick="toggleCertUpload()">🔄 ប្តូរ Cert</span>
        </div>
        <div class="cert-status-list">
          <div class="cert-item">
            <span>ឯកសារ .p12</span>
            <span class="badge" id="p12Badge">កំពុងពិនិត្យ...</span>
          </div>
          <div class="cert-item">
            <span>Password P12</span>
            <span class="badge" id="passBadge">កំពុងពិនិត្យ...</span>
          </div>
          <div class="cert-item">
            <span>ឯកសារ .mobileprovision</span>
            <span class="badge" id="provBadge">កំពុងពិនិត្យ...</span>
          </div>
        </div>

        <!-- Optional In-page Cert Upload Form -->
        <div id="certUploadForm" class="hidden" style="margin-top: 16px; border-top: 1px solid var(--card-border); padding-top: 14px;">
          <div class="form-group">
            <label>ឯកសារ Certificate (.p12):</label>
            <input type="file" id="p12FileInput" accept=".p12" class="form-control">
          </div>
          <div class="form-group">
            <label>Password P12:</label>
            <input type="text" id="p12PasswordInput" placeholder="Password (បើគ្មាន ទុកទទេ)" class="form-control">
          </div>
          <div class="form-group">
            <label>Provisioning Profile (.mobileprovision):</label>
            <input type="file" id="provFileInput" accept=".mobileprovision" class="form-control">
          </div>
          <button class="btn btn-primary" onclick="uploadCerts()" style="padding: 10px; font-size: 14px;">💾 រក្សាទុក Certificate</button>
        </div>
      </div>

      <!-- IPA Signer Card -->
      <div class="card">
        <div class="card-title">
          <span>📦 ចុះហត្ថលេខាលើឯកសារ IPA</span>
          <span style="font-size: 12px; color: var(--success);">Max 5GB</span>
        </div>

        <!-- Drag & Drop Zone -->
        <div class="dropzone" id="dropzone" onclick="document.getElementById('ipaFileInput').click()">
          <div class="dropzone-icon">📥</div>
          <div class="dropzone-text">ចុចដើម្បីជ្រើសរើសឯកសារ .ipa</div>
          <div class="dropzone-sub">ឬអូសទម្លាក់ឯកសារមកទីនេះ (រហូតដល់ 5GB)</div>
          <input type="file" id="ipaFileInput" accept=".ipa" class="file-input" onchange="onFileSelected(this.files[0])">
        </div>

        <div id="selectedFileInfo" class="file-selected hidden">
          <span id="selectedFileName">file.ipa</span>
          <span id="selectedFileSize" style="color: var(--text-muted); font-size: 12px;">0 MB</span>
        </div>

        <div class="form-group">
          <label>ឈ្មោះកម្មវិធី (App Name - Optional):</label>
          <input type="text" id="customAppName" placeholder="ឧ. Mobile Legends Mod" class="form-control">
        </div>

        <div class="form-group">
          <label>Bundle Identifier (Optional):</label>
          <input type="text" id="customBundleId" placeholder="ឧ. com.game.mod" class="form-control">
        </div>

        <!-- Progress Box -->
        <div class="progress-box" id="progressBox">
          <div class="progress-status">
            <span id="progressText">កំពុង Upload...</span>
            <span id="progressPercent">0%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="progressBar"></div>
          </div>
        </div>

        <!-- Sign Action Button -->
        <button class="btn btn-primary" id="btnSign" onclick="startUploadAndSign()">
          🚀 ចាប់ផ្តើម Sign ឥឡូវនេះ
        </button>

        <!-- Result Box -->
        <div id="resultBox" class="hidden" style="margin-top: 18px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 6px;">🎉</div>
          <h3 style="font-size: 18px; margin-bottom: 6px;">ចុះហត្ថលេខាជោគជ័យ!</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
            ឯកសាររបស់អ្នកបាន Sign រួចរាល់។ សូមចុចប៊ូតុងខាងក្រោមដើម្បីដំឡើងលើ iPhone:
          </p>
          <a href="#" id="btnInstallOta" class="btn btn-success">
            📲 ចុចដើម្បីដំឡើង (Install App)
          </a>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentUser = null;
    let selectedIpaFile = null;

    // Check if running inside Telegram Mini App
    window.addEventListener('DOMContentLoaded', async () => {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        // Verify TMA initData with server
        try {
          const res = await fetch('/api/auth/verify-tma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: window.Telegram.WebApp.initData })
          });
          const data = await res.json();
          if (data.ok && data.user) {
            setupUser(data.user);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Check existing session
      try {
        const res = await fetch('/api/user-status');
        const data = await res.json();
        if (data.ok && data.user) {
          setupUser(data.user);
        }
      } catch (e) {}
    });

    // Callback from Telegram Login Widget
    window.onTelegramAuth = async function(user) {
      try {
        const res = await fetch('/api/auth/verify-widget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
        const data = await res.json();
        if (data.ok) {
          setupUser(data.user);
        } else {
          alert('Login failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error during login');
      }
    };

    function setupUser(user) {
      currentUser = user;
      document.getElementById('loginSection').classList.add('hidden');
      document.getElementById('appSection').classList.remove('hidden');

      document.getElementById('userName').textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
      document.getElementById('userSub').textContent = '@' + (user.username || 'user') + ' (ID: ' + user.id + ')';
      if (user.first_name) {
        document.getElementById('userAvatar').textContent = user.first_name.charAt(0);
      }

      loadCertStatus();
    }

    async function loadCertStatus() {
      try {
        const res = await fetch('/api/user-status');
        const data = await res.json();
        if (data.meta) {
          updateCertBadges(data.meta);
        }
      } catch (e) {}
    }

    function updateCertBadges(meta) {
      const p12 = document.getElementById('p12Badge');
      const pass = document.getElementById('passBadge');
      const prov = document.getElementById('provBadge');

      if (meta.hasP12) {
        p12.textContent = 'រួចរាល់ ✅';
        p12.className = 'badge badge-ok';
      } else {
        p12.textContent = 'ខ្វះ ❌';
        p12.className = 'badge badge-miss';
      }

      if (meta.password) {
        pass.textContent = 'បានកំណត់ ✅';
        pass.className = 'badge badge-ok';
      } else {
        pass.textContent = 'មិនទាន់កំណត់ ⚠️';
        pass.className = 'badge badge-warn';
      }

      if (meta.hasProvision) {
        prov.textContent = 'រួចរាល់ ✅';
        prov.className = 'badge badge-ok';
      } else {
        prov.textContent = 'ខ្វះ ❌';
        prov.className = 'badge badge-miss';
      }
    }

    function toggleCertUpload() {
      const form = document.getElementById('certUploadForm');
      form.classList.toggle('hidden');
    }

    async function uploadCerts() {
      const p12File = document.getElementById('p12FileInput').files[0];
      const provFile = document.getElementById('provFileInput').files[0];
      const password = document.getElementById('p12PasswordInput').value;

      if (!p12File && !provFile && !password) {
        alert('សូមជ្រើសរើសឯកសារដើម្បី Upload');
        return;
      }

      const formData = new FormData();
      if (p12File) formData.append('p12', p12File);
      if (provFile) formData.append('provision', provFile);
      if (password !== undefined) formData.append('password', password);

      try {
        const res = await fetch('/api/upload-cert', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.ok) {
          alert('✅ បានរក្សាទុក Certificate ដោយជោគជ័យ!');
          toggleCertUpload();
          loadCertStatus();
        } else {
          alert('❌ បរាជ័យ: ' + data.error);
        }
      } catch (e) {
        alert('❌ Error uploading certs');
      }
    }

    function onFileSelected(file) {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.ipa')) {
        alert('⚠️ សូមជ្រើសរើសតែឯកសារដែលមានកន្ទុយ .ipa ប៉ុណ្ណោះ!');
        return;
      }
      selectedIpaFile = file;
      document.getElementById('selectedFileName').textContent = file.name;
      document.getElementById('selectedFileSize').textContent = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      document.getElementById('selectedFileInfo').classList.remove('hidden');

      if (!document.getElementById('customAppName').value) {
        document.getElementById('customAppName').value = file.name.replace(/\.ipa$/i, '');
      }
    }

    // Drag and Drop
    const dropzone = document.getElementById('dropzone');
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        onFileSelected(e.dataTransfer.files[0]);
      }
    });

    async function startUploadAndSign() {
      if (!selectedIpaFile) {
        alert('⚠️ សូមជ្រើសរើសឯកសារ .ipa ជាមុនសិន!');
        return;
      }

      const btnSign = document.getElementById('btnSign');
      const progressBox = document.getElementById('progressBox');
      const progressText = document.getElementById('progressText');
      const progressPercent = document.getElementById('progressPercent');
      const progressBar = document.getElementById('progressBar');

      btnSign.disabled = true;
      progressBox.style.display = 'block';
      progressText.textContent = 'កំពុងបង្កើត Upload Link...';
      progressBar.style.width = '5%';

      try {
        // 1. Get presigned upload URL directly to R2
        const resUrl = await fetch('/api/get-presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedIpaFile.name })
        });
        const urlData = await resUrl.json();
        if (!urlData.ok || !urlData.uploadUrl) {
          throw new Error(urlData.error || 'Failed to get upload URL');
        }

        const { uploadUrl, jobId, ipaKey } = urlData;

        // 2. Upload file via XMLHttpRequest with progress
        progressText.textContent = 'កំពុង Upload ចូល Cloud Storage...';
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl, true);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              progressBar.style.width = percent + '%';
              progressPercent.textContent = percent + '%';
              progressText.textContent = 'Uploading (' + (e.loaded / (1024*1024)).toFixed(1) + 'MB / ' + (e.total / (1024*1024)).toFixed(1) + 'MB)...';
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error('Upload failed with status ' + xhr.status));
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(selectedIpaFile);
        });

        // 3. Trigger Signing Engine
        progressText.textContent = '⚡ កំពុងចាប់ផ្តើម Sign លើ GitHub Runner...';
        progressBar.style.width = '100%';
        progressPercent.textContent = '100%';

        const appName = document.getElementById('customAppName').value || selectedIpaFile.name.replace(/\.ipa$/i, '');
        const bundleId = document.getElementById('customBundleId').value || '';

        const resSign = await fetch('/api/start-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, ipaKey, appName, bundleId })
        });
        const signData = await resSign.json();
        if (!signData.ok) {
          throw new Error(signData.error || 'Failed to trigger signing');
        }

        progressText.textContent = '⏳ កំពុងដំណើរការ Sign... (សូមរង់ចាំ 1-2 នាទី)';
        pollJobStatus(jobId, appName);

      } catch (err) {
        alert('❌ Error: ' + err.message);
        btnSign.disabled = false;
        progressBox.style.display = 'none';
      }
    }

    function pollJobStatus(jobId, appName) {
      const progressText = document.getElementById('progressText');
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/job-status/' + jobId);
          const data = await res.json();
          if (data.status === 'COMPLETED') {
            clearInterval(interval);
            document.getElementById('progressBox').style.display = 'none';
            document.getElementById('btnSign').style.display = 'none';

            const resultBox = document.getElementById('resultBox');
            resultBox.classList.remove('hidden');
            document.getElementById('btnInstallOta').href = '/install/' + jobId;

            alert('🎉 ចុះហត្ថលេខាជោគជ័យ! អ្នកអាចដំឡើងលើ iPhone ឥឡូវនេះបានហើយ។');
          } else if (data.status === 'FAILED') {
            clearInterval(interval);
            alert('❌ ការចុះហត្ថលេខាបរាជ័យ! សូមពិនិត្យ Certificate របស់អ្នក។');
            document.getElementById('btnSign').disabled = false;
          }
        } catch (e) {}
      }, 5000);
    }
  </script>
</body>
</html>`;
}
