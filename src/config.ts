import 'dotenv/config'

export const config = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  bot: {
    token: process.env.BOT_TOKEN || '',
  },
  api: {
    port: parseInt(process.env.API_PORT || '3010'),
    host: process.env.API_HOST || '0.0.0.0',
  },
  isDev: process.env.NODE_ENV !== 'production',
}
