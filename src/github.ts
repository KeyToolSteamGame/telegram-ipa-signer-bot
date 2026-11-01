export async function triggerGitHubSigningWorkflow(params: {
  githubToken: string;
  githubRepo: string; // e.g. "username/telegram-ipa-signer-bot"
  payload: {
    job_id: string;
    chat_id: number;
    message_id?: number;
    p12_key: string;
    p12_password?: string;
    provision_key: string;
    ipa_key?: string;
    ipa_url?: string;
    app_url: string;
    app_name?: string;
    bundle_id?: string;
  };
}): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.github.com/repos/${params.githubRepo}/dispatches`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${params.githubToken}`,
        'User-Agent': 'Cloudflare-Worker-Signer-Bot',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'sign-ipa',
        client_payload: params.payload,
      }),
    });

    if (response.status === 204) {
      return { success: true };
    }

    const errText = await response.text();
    return {
      success: false,
      error: `GitHub API returned ${response.status}: ${errText}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown network error calling GitHub API',
    };
  }
}

