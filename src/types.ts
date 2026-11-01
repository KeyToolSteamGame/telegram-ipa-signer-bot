export interface Env {
  IPA_BUCKET: R2Bucket;
  TELEGRAM_BOT_TOKEN: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string; // e.g. "KeyToolSteamGame/telegram-ipa-signer-bot"
  APP_URL: string;     // e.g. "https://telegram-ipa-signer-bot.chhunjp.workers.dev"
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}

export interface UserCertMeta {
  hasP12: boolean;
  hasProvision: boolean;
  password?: string;
  updatedAt: string;
}

export interface JobMeta {
  jobId: string;
  chatId: number;
  appName?: string;
  bundleId?: string;
  createdAt: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
  };
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: {
    id: number;
    first_name?: string;
    username?: string;
    type: string;
  };
  text?: string;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

