export function renderInstallPage(params: {
  jobId: string;
  appName: string;
  manifestUrl: string;
}): string {
  const otaUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(params.manifestUrl)}`;

  return `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Install ${escapeHtml(params.appName)} - iOS OTA</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(255, 255, 255, 0.05);
      --border: rgba(255, 255, 255, 0.1);
      --primary: #007aff;
      --primary-hover: #0056b3;
      --text: #ffffff;
      --text-muted: #94a3b8;
      --success: #34c759;
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
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      width: 100%;
      max-width: 420px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 28px;
      padding: 32px 24px;
      text-align: center;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .app-icon {
      width: 96px;
      height: 96px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #007aff, #5856d6);
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0, 122, 255, 0.35);
      font-size: 42px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .job-badge {
      display: inline-block;
      font-size: 12px;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.07);
      padding: 4px 12px;
      border-radius: 12px;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .btn-install {
      display: block;
      width: 100%;
      padding: 16px 20px;
      background: var(--primary);
      color: #ffffff;
      text-decoration: none;
      font-size: 17px;
      font-weight: 600;
      border-radius: 16px;
      transition: all 0.2s ease;
      box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
      margin-bottom: 20px;
    }
    .btn-install:active {
      transform: scale(0.98);
      background: var(--primary-hover);
    }
    .instructions {
      text-align: left;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      margin-top: 10px;
    }
    .instructions h3 {
      font-size: 14px;
      color: var(--primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .instructions ol {
      font-size: 13px;
      color: var(--text-muted);
      padding-left: 18px;
      line-height: 1.6;
    }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="app-icon">📦</div>
    <h1>${escapeHtml(params.appName)}</h1>
    <div class="job-badge">Job ID: ${escapeHtml(params.jobId)}</div>

    <a href="${otaUrl}" class="btn-install" id="installBtn">
      📲 ចុចដើម្បីដំឡើង (Install App)
    </a>

    <div class="instructions">
      <h3>📌 របៀបបើកដំណើរការបន្ទាប់ពីដំឡើង</h3>
      <ol>
        <li>ចុចប៊ូតុងខាងលើ ហើយចុច <b>"Install"</b> នៅពេល Safari លោតសួរ។</li>
        <li>ចូលទៅកាន់ Home Screen ដើម្បីរង់ចាំកម្មវិធីទាញយកចប់។</li>
        <li>ចូល <b>Settings (ការកំណត់)</b> លើ iPhone។</li>
        <li>ចូល <b>General</b> &gt; <b>VPN &amp; Device Management</b>។</li>
        <li>ជ្រើសរើសឈ្មោះ Certificate របស់អ្នក រួចចុច <b>Trust</b>។</li>
      </ol>
    </div>

    <div class="footer">
      Powered by Cloudflare Workers &amp; GitHub Actions
    </div>
  </div>

  <script>
    // Automatically trigger install prompt when opened on iOS Safari
    document.getElementById('installBtn').addEventListener('click', function() {
      setTimeout(function() {
        alert('សូមត្រឡប់ទៅ Home Screen ដើម្បីពិនិត្យមើលដំណើរការដំឡើង!');
      }, 1000);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(unsafe: string): string {
  return unsafe.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

