import sodium from 'libsodium-wrappers';

const REPO = process.env.GITHUB_REPO || 'KeyToolSteamGame/telegram-ipa-signer-bot';
const TOKEN = process.env.GITHUB_TOKEN || '';

async function setSecret(name: string, value: string) {
  await sodium.ready;

  // 1. Get repo public key
  const keyRes = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/public-key`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Setup-Script',
    },
  });

  const { key_id, key } = (await keyRes.json()) as { key_id: string; key: string };

  // 2. Encrypt secret
  const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const binsec = sodium.from_string(value);
  const encBytes = sodium.crypto_box_seal(binsec, binkey);
  const encrypted_value = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

  // 3. Put secret
  const putRes = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/${name}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Setup-Script',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      encrypted_value,
      key_id,
    }),
  });

  if (putRes.status === 201 || putRes.status === 204) {
    console.log(`✅ Secret "${name}" uploaded successfully!`);
  } else {
    console.error(`❌ Failed to set secret "${name}":`, await putRes.text());
  }
}

async function main() {
  const [secretName, secretValue] = process.argv.slice(2);
  if (!secretName || !secretValue) {
    console.log('Usage: bun scripts/set-secret.ts <NAME> <VALUE>');
    return;
  }
  await setSecret(secretName, secretValue);
}

main();
