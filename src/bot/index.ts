import { Telegraf, Markup } from 'telegraf'
import { config } from '../config'
import { query } from '../db/client'

export const bot = new Telegraf(config.telegram.botToken)

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
      SELECT status, COUNT(*) as count
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

// Pending command - send each news as separate message
bot.command('pending', async (ctx) => {
  try {
    const newsResult = await query(`
      SELECT * FROM news
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `)

    const newsList = newsResult.rows
    if (newsList.length === 0) {
      ctx.reply('✅ Нет новостей на модерации')
      return
    }

    await ctx.reply(`📰 Найдено ${newsList.length} новостей`)

    for (const news of newsList) {
      const caption =
        `📰 *${news.title}*\n\n` +
        `${news.summary || ''}\n\n` +
        `🔗 ${news.url || ''}`

      let sent
      if (news.image_url) {
        sent = await ctx.replyWithPhoto(news.image_url, {
          caption,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Одобрить', `approve:${news.id}`),
              Markup.button.callback('❌ Отклонить', `reject:${news.id}`)
            ]
          ])
        })
      } else {
        sent = await ctx.reply(`━━━━━━━━━━━━━━━━━━━━━\n\n${caption}`, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Одобрить', `approve:${news.id}`),
              Markup.button.callback('❌ Отклонить', `reject:${news.id}`)
            ]
          ])
        })
      }

      await query('UPDATE news SET tg_message_id = $1 WHERE id = $2', [sent.message_id, news.id])
    }
  } catch (err) {
    console.error('Pending error:', err)
    ctx.reply('Ошибка получения новостей')
  }
})

// Approve handler
bot.action(/^approve:(.+)$/, async (ctx) => {
  const newsId = ctx.match[1]
  const result = await query('SELECT * FROM news WHERE id = $1', [newsId])
  const news = result.rows[0]

  if (!news) {
    await ctx.answerCbQuery('Новость не найдена')
    return
  }

  await moderateNews(newsId, 'approved', ctx.from?.username || 'unknown')
  await ctx.answerCbQuery('✅ Одобрено и выложено')

  const approvedText =
    `✅ *${news.title}*\n\n` +
    `${news.summary || ''}\n\n` +
    `📢 Выложено в канал`

  if (news.image_url) {
    await ctx.editMessageCaption(approvedText, { parse_mode: 'Markdown' })
  } else {
    await ctx.editMessageText(`━━━━━━━━━━━━━━━━━━━━━\n\n${approvedText}`, { parse_mode: 'Markdown' })
  }
})

// Reject handler
bot.action(/^reject:(.+)$/, async (ctx) => {
  const newsId = ctx.match[1]
  const result = await query('SELECT * FROM news WHERE id = $1', [newsId])
  const news = result.rows[0]

  if (!news) {
    await ctx.answerCbQuery('Новость не найдена')
    return
  }

  await moderateNews(newsId, 'rejected', ctx.from?.username || 'unknown')
  await ctx.answerCbQuery('❌ Отклонено')

  const rejectedText = `❌ *${news.title}*\n\nОтклонено`

  if (news.image_url) {
    await ctx.editMessageCaption(rejectedText, { parse_mode: 'Markdown' })
  } else {
    await ctx.editMessageText(`━━━━━━━━━━━━━━━━━━━━━\n\n${rejectedText}`, { parse_mode: 'Markdown' })
  }
})

// Helper: moderate news
async function moderateNews(newsId: string, status: string, moderator: string) {
  await query(`
    UPDATE news SET
      status = $1,
      moderated_by = $2,
      moderated_at = now()
    WHERE id = $3
  `, [status, moderator, newsId])

  if (status === 'approved') {
    await publishToChannel(newsId)
  }
}

// Helper: publish to channel
async function publishToChannel(newsId: string) {
  const channelId = config.telegram.publishChannelId
  if (!channelId) {
    console.warn('TG_PUBLISH_CHANNEL_ID not set')
    return
  }

  const result = await query('SELECT * FROM news WHERE id = $1', [newsId])
  const news = result.rows[0]
  if (!news) return

  const caption =
    `📰 *${news.title}*\n\n` +
    `${news.summary || ''}\n\n` +
    `${news.url ? `🔗 [Читать полностью](${news.url})` : ''}`

  try {
    if (news.image_url) {
      await bot.telegram.sendPhoto(channelId, news.image_url, {
        caption,
        parse_mode: 'Markdown'
      })
    } else {
      await bot.telegram.sendMessage(channelId, caption, {
        parse_mode: 'Markdown'
      })
    }
  } catch (err) {
    console.error('Publish error:', err)
  }
}

// Start bot
export async function startBot() {
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
