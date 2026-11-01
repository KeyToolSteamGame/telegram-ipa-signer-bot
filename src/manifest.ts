export function generateManifestXml(params: {
  ipaDownloadUrl: string;
  bundleId: string;
  appName: string;
  bundleVersion?: string;
}): string {
  const version = params.bundleVersion || '1.0.0';
  const safeTitle = escapeXml(params.appName || 'iOS App');
  const safeBundleId = escapeXml(params.bundleId || 'com.app.signed');
  const safeUrl = escapeXml(params.ipaDownloadUrl);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${safeUrl}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${safeBundleId}</string>
        <key>bundle-version</key>
        <string>${version}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${safeTitle}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

