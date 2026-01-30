import { Telegraf, Markup } from 'telegraf'
import { config } from '../config'
import { query } from '../db/client'

export const bot = new Telegraf(config.bot.token)

// Start command
bot.start((ctx) => {
  ctx.reply(
    '👋 NewsFlow Bot\n\n' +
    'Я помогаю модерировать новости.\n\n' +
    'Команды:\n' +
    '/stats — статистика\n' +
    '/pending — новости на модерации'
  )
})

// Stats command
bot.command('stats', async (ctx) => {
  try {
    const stats = await query(`
      SELECT
        status,
        COUNT(*) as count
      FROM news
      GROUP BY status
    `)

    const pending = stats.rows.find(r => r.status === 'pending')?.count || 0
    const approved = stats.rows.find(r => r.status === 'approved')?.count || 0
    const rejected = stats.rows.find(r => r.status === 'rejected')?.count || 0

    ctx.reply(
      '📊 Статистика NewsFlow\n\n' +
      `⏳ На модерации: ${pending}\n` +
      `✅ Одобрено: ${approved}\n` +
      `❌ Отклонено: ${rejected}`
    )
  } catch (err) {
    console.error('Stats error:', err)
    ctx.reply('Ошибка получения статистики')
  }
})

// Pending command - show digest
bot.command('pending', async (ctx) => {
  try {
    // Get first active project (for now)
    const projectResult = await query('SELECT * FROM projects WHERE is_active = true LIMIT 1')
    const project = projectResult.rows[0]

    if (!project) {
      ctx.reply('Нет активных проектов')
      return
    }

    const newsResult = await query(`
      SELECT n.* FROM news n
      JOIN sources s ON n.source_id = s.id
      WHERE s.project_id = $1 AND n.status = 'pending'
      ORDER BY n.created_at DESC
      LIMIT 10
    `, [project.id])

    const newsList = newsResult.rows
    if (newsList.length === 0) {
      ctx.reply('✅ Нет новостей на модерации')
      return
    }

    let message = `📰 Найдено ${newsList.length} новостей | ${project.name}\n\n`
    const buttons: any[][] = []

    newsList.forEach((news: any, i: number) => {
      const shortTitle = news.title.length > 50
        ? news.title.substring(0, 50) + '...'
        : news.title
      message += `${i + 1}. ${shortTitle}\n`

      buttons.push([
        Markup.button.callback('✅', `approve:${news.id}`),
        Markup.button.callback('❌', `reject:${news.id}`),
        Markup.button.callback('👁', `view:${news.id}`)
      ])
    })

    buttons.push([
      Markup.button.callback('✅ Все', 'approve_all'),
      Markup.button.callback('❌ Все', 'reject_all')
    ])

    ctx.reply(message, Markup.inlineKeyboard(buttons))
  } catch (err) {
    console.error('Pending error:', err)
    ctx.reply('Ошибка получения новостей')
  }
})

// Callback handlers for moderation buttons
bot.action(/^approve:(.+)$/, async (ctx) => {
  const newsId = ctx.match[1]
  await moderateNews(newsId, 'approved', ctx.from?.username || 'unknown')
  await ctx.answerCbQuery('✅ Одобрено')
  await updateDigestMessage(ctx)
})

bot.action(/^reject:(.+)$/, async (ctx) => {
  const newsId = ctx.match[1]
  await moderateNews(newsId, 'rejected', ctx.from?.username || 'unknown')
  await ctx.answerCbQuery('❌ Отклонено')
  await updateDigestMessage(ctx)
})

bot.action(/^view:(.+)$/, async (ctx) => {
  const newsId = ctx.match[1]
  const result = await query('SELECT * FROM news WHERE id = $1', [newsId])
  const news = result.rows[0]

  if (news) {
    await ctx.answerCbQuery()
    await ctx.reply(
      `📰 ${news.title}\n\n` +
      `${news.content || news.summary || 'Нет описания'}\n\n` +
      `🔗 ${news.url || 'Нет ссылки'}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Одобрить', `approve:${newsId}`),
          Markup.button.callback('❌ Отклонить', `reject:${newsId}`)
        ]
      ])
    )
  }
})

bot.action('approve_all', async (ctx) => {
  await query(`
    UPDATE news SET
      status = 'approved',
      moderated_by = $1,
      moderated_at = now()
    WHERE status = 'pending'
  `, [ctx.from?.username || 'unknown'])

  await ctx.answerCbQuery('✅ Все одобрены')
  await updateDigestMessage(ctx)
})

bot.action('reject_all', async (ctx) => {
  await query(`
    UPDATE news SET
      status = 'rejected',
      moderated_by = $1,
      moderated_at = now()
    WHERE status = 'pending'
  `, [ctx.from?.username || 'unknown'])

  await ctx.answerCbQuery('❌ Все отклонены')
  await updateDigestMessage(ctx)
})

// Helper functions
async function moderateNews(newsId: string, status: string, moderator: string) {
  await query(`
    UPDATE news SET
      status = $1,
      moderated_by = $2,
      moderated_at = now()
    WHERE id = $3
  `, [status, moderator, newsId])

  // If approved, publish to channel
  if (status === 'approved') {
    await publishToChannel(newsId)
  }
}

async function publishToChannel(newsId: string) {
  const result = await query(`
    SELECT n.*, p.tg_publish_channel_id
    FROM news n
    JOIN sources s ON n.source_id = s.id
    JOIN projects p ON s.project_id = p.id
    WHERE n.id = $1
  `, [newsId])

  const news = result.rows[0]
  if (!news || !news.tg_publish_channel_id) return

  try {
    await bot.telegram.sendMessage(
      news.tg_publish_channel_id,
      `📰 ${news.title}\n\n` +
      `${news.summary || ''}\n\n` +
      `${news.url ? `🔗 Читать: ${news.url}` : ''}`
    )
  } catch (err) {
    console.error('Publish error:', err)
  }
}

async function updateDigestMessage(ctx: any) {
  // Update the digest message after moderation
  const pending = await query(`SELECT COUNT(*) FROM news WHERE status = 'pending'`)
  const count = parseInt(pending.rows[0].count)

  if (count === 0) {
    try {
      await ctx.editMessageText('✅ Все новости обработаны!')
    } catch (e) {
      // Message might be already edited
    }
  }
}

// Send digest to moderation chat
export async function sendDigest(projectId: string) {
  const projectResult = await query(
    'SELECT * FROM projects WHERE id = $1',
    [projectId]
  )
  const project = projectResult.rows[0]
  if (!project) return

  const newsResult = await query(`
    SELECT n.* FROM news n
    JOIN sources s ON n.source_id = s.id
    WHERE s.project_id = $1 AND n.status = 'pending'
    ORDER BY n.created_at DESC
    LIMIT 10
  `, [projectId])

  const newsList = newsResult.rows
  if (newsList.length === 0) return

  let message = `📰 Найдено ${newsList.length} новостей | ${project.name}\n\n`

  const buttons: any[][] = []

  newsList.forEach((news, i) => {
    const shortTitle = news.title.length > 50
      ? news.title.substring(0, 50) + '...'
      : news.title
    message += `${i + 1}. ${shortTitle}\n`

    buttons.push([
      Markup.button.callback('✅', `approve:${news.id}`),
      Markup.button.callback('❌', `reject:${news.id}`),
      Markup.button.callback('👁', `view:${news.id}`)
    ])
  })

  buttons.push([
    Markup.button.callback('✅ Все', 'approve_all'),
    Markup.button.callback('❌ Все', 'reject_all')
  ])

  await bot.telegram.sendMessage(
    project.tg_moderation_chat_id,
    message,
    Markup.inlineKeyboard(buttons)
  )
}

export async function startBot() {
  // Register bot commands for menu
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Начать работу' },
    { command: 'pending', description: 'Новости на модерации' },
    { command: 'stats', description: 'Статистика' },
  ])

  bot.launch()
  console.log('Telegram bot started')

  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
}
