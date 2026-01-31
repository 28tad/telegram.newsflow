import { config } from './config'
import { connectDatabase, disconnectDatabase } from './db/client'
import { startBot } from './bot'

async function main() {
  console.log('Starting NewsFlow...')
  console.log(`Environment: ${config.isDev ? 'development' : 'production'}`)

  // Connect to database
  try {
    await connectDatabase()
  } catch (err) {
    console.error('Database connection failed:', err)
    process.exit(1)
  }

  // Start Telegram bot
  if (config.telegram.botToken) {
    await startBot()
  } else {
    console.warn('BOT_TOKEN not set, bot disabled')
  }

  // TODO: Start API server
  // TODO: Start scheduler

  console.log('NewsFlow started successfully')
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await disconnectDatabase()
  process.exit(0)
})

main().catch((err) => {
  console.error('Failed to start NewsFlow:', err)
  process.exit(1)
})
