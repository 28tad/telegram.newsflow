import { config } from './config'
import { pool } from './db/client'
import { startBot } from './bot'

async function main() {
  console.log('Starting NewsFlow...')
  console.log(`Environment: ${config.isDev ? 'development' : 'production'}`)

  // Test database connection
  try {
    await pool.query('SELECT 1')
    console.log('Database connected')
  } catch (err) {
    console.error('Database connection failed:', err)
    process.exit(1)
  }

  // Start Telegram bot
  if (config.bot.token) {
    await startBot()
  } else {
    console.warn('BOT_TOKEN not set, bot disabled')
  }

  // TODO: Start API server
  // TODO: Start scheduler

  console.log('NewsFlow started successfully')
}

main().catch((err) => {
  console.error('Failed to start NewsFlow:', err)
  process.exit(1)
})
