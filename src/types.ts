export interface Env {
  IPA_BUCKET: R2Bucket;
  TELEGRAM_BOT_TOKEN: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string; // e.g. "username/telegram-ipa-signer-bot"
  APP_URL: string;     // e.g. "https://your-worker.workers.dev"
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

