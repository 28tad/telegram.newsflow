import { Telegraf, Markup } from 'telegraf'
import { config } from '../config'
import * as newsService from '../services/news'
import { publishToChannel, formatNewsForModeration } from '../services/publisher'

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
    const stats = await newsService.getStats()

    ctx.reply(
      '📊 Статистика NewsFlow\n\n' +
      `⏳ На модерации: ${stats.pending}\n` +
      `✅ Одобрено: ${stats.approved}\n` +
      `❌ Отклонено: ${stats.rejected}\n` +
      `📝 Новых: ${stats.raw}`
    )
  } catch (err) {
    console.error('Stats error:', err)
    ctx.reply('Ошибка получения статистики')
  }
})

// Pending command
bot.command('pending', async (ctx) => {
  try {
    const newsList = await newsService.getPending(10)

    if (newsList.length === 0) {
      ctx.reply('✅ Нет новостей на модерации')
      return
    }

    await ctx.reply(`📰 Найдено ${newsList.length} новостей`)

    for (const news of newsList) {
      const caption = formatNewsForModeration(news)
      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Одобрить', `approve:${news.id}`),
          Markup.button.callback('❌ Отклонить', `reject:${news.id}`)
        ]
      ])

      let sent
      if (news.imageUrl) {
        sent = await ctx.replyWithPhoto(news.imageUrl, {
          caption,
          parse_mode: 'Markdown',
          ...buttons
        })
      } else {
        sent = await ctx.reply(`━━━━━━━━━━━━━━━━━━━━━\n\n${caption}`, {
          parse_mode: 'Markdown',
          ...buttons
        })
      }

      await newsService.updateTelegramMessageId(news.id, BigInt(sent.message_id))
    }
  } catch (err) {
    console.error('Pending error:', err)
    ctx.reply('Ошибка получения новостей')
  }
})

// Approve handler
bot.action(/^approve:(.+)$/, async (ctx) => {
  const newsId = ctx.match[1]
  const news = await newsService.getById(newsId)

  if (!news) {
    await ctx.answerCbQuery('Новость не найдена')
    return
  }

  const moderator = ctx.from?.username || 'unknown'
  await newsService.moderate(newsId, 'approved', moderator)

  // Publish to channel
  const channelId = config.telegram.publishChannelId
  if (channelId) {
    const result = await publishToChannel(bot.telegram, channelId, news)
    if (!result.success) {
      await ctx.answerCbQuery('Ошибка публикации')
      return
    }
  }

  await ctx.answerCbQuery('✅ Одобрено и выложено')

  const title = news.aiTitle || news.title
  const approvedText = `✅ *${title}*\n\n📢 Выложено в канал`

  if (news.imageUrl) {
    await ctx.editMessageCaption(approvedText, { parse_mode: 'Markdown' })
  } else {
    await ctx.editMessageText(`━━━━━━━━━━━━━━━━━━━━━\n\n${approvedText}`, { parse_mode: 'Markdown' })
  }
})

// Reject handler
bot.action(/^reject:(.+)$/, async (ctx) => {
  const newsId = ctx.match[1]
  const news = await newsService.getById(newsId)

  if (!news) {
    await ctx.answerCbQuery('Новость не найдена')
    return
  }

  const moderator = ctx.from?.username || 'unknown'
  await newsService.moderate(newsId, 'rejected', moderator)

  await ctx.answerCbQuery('❌ Отклонено')

  const title = news.aiTitle || news.title
  const rejectedText = `❌ *${title}*\n\nОтклонено`

  if (news.imageUrl) {
    await ctx.editMessageCaption(rejectedText, { parse_mode: 'Markdown' })
  } else {
    await ctx.editMessageText(`━━━━━━━━━━━━━━━━━━━━━\n\n${rejectedText}`, { parse_mode: 'Markdown' })
  }
})

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
