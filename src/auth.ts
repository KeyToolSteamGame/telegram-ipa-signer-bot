// Telegram Authentication Verifier using Web Crypto API

export interface AuthenticatedTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
}

// 1. Verify Telegram Mini App (TMA) initData
export async function verifyTelegramWebAppData(
  initData: string,
  botToken: string
): Promise<AuthenticatedTelegramUser | null> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    // Sort keys alphabetically
    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys.map((key) => `${key}=${params.get(key)}`).join('\n');

    const encoder = new TextEncoder();

    // Key 1: HMAC-SHA256(key="WebAppData", message=botToken)
    const webAppDataKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secretKeyBytes = await crypto.subtle.sign('HMAC', webAppDataKey, encoder.encode(botToken));

    // Key 2: HMAC-SHA256(key=secretKeyBytes, message=dataCheckString)
    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const calculatedHashBytes = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(dataCheckString)
    );

    const calculatedHash = Array.from(new Uint8Array(calculatedHashBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (calculatedHash !== hash) {
      return null;
    }

    const userRaw = params.get('user');
    if (!userRaw) return null;

    const user = JSON.parse(userRaw);
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      auth_date: parseInt(params.get('auth_date') || '0', 10),
    };
  } catch (err) {
    console.error('Error verifying TMA data:', err);
    return null;
  }
}

// 2. Verify Standalone Telegram Login Widget callback
export async function verifyTelegramLoginWidget(
  data: Record<string, string>,
  botToken: string
): Promise<AuthenticatedTelegramUser | null> {
  try {
    const hash = data.hash;
    if (!hash) return null;

    const filtered = Object.keys(data)
      .filter((k) => k !== 'hash')
      .sort()
      .map((k) => `${k}=${data[k]}`)
      .join('\n');

    const encoder = new TextEncoder();

    // Secret = SHA256(botToken)
    const secretHash = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));
    const key = await crypto.subtle.importKey(
      'raw',
      secretHash,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const calculatedHashBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(filtered));
    const calculatedHash = Array.from(new Uint8Array(calculatedHashBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (calculatedHash !== hash) return null;

    return {
      id: parseInt(data.id, 10),
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      photo_url: data.photo_url,
      auth_date: parseInt(data.auth_date, 10),
    };
  } catch (err) {
    console.error('Error verifying Login Widget data:', err);
    return null;
  }
}

// 3. Lightweight HMAC-Signed Session Token (Cookie / Header)
export async function createSessionToken(userId: number, botToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const timestamp = Date.now();
  const payload = `${userId}:${timestamp}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(botToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sig = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${payload}:${sig}`;
}

export async function verifySessionToken(token: string, botToken: string): Promise<number | null> {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return null;

    const [userIdStr, timestampStr, expectedSig] = parts;
    const userId = parseInt(userIdStr, 10);
    const timestamp = parseInt(timestampStr, 10);

    // Expire after 30 days
    if (Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    const encoder = new TextEncoder();
    const payload = `${userId}:${timestamp}`;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(botToken),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const calculatedSig = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (calculatedSig === expectedSig) {
      return userId;
    }
    return null;
  } catch {
    return null;
  }
}
