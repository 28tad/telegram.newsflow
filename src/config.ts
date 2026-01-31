import 'dotenv/config'

export const config = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  telegram: {
    botToken: process.env.BOT_TOKEN || '',
    moderationChatId: process.env.TG_MODERATION_CHAT_ID || '',
    publishChannelId: process.env.TG_PUBLISH_CHANNEL_ID || '',
  },
  api: {
    port: parseInt(process.env.API_PORT || '3010'),
    host: process.env.API_HOST || '0.0.0.0',
  },
  isDev: process.env.NODE_ENV !== 'production',
}
